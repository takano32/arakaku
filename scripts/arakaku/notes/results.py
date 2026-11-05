# 役割: 結果 note の本文 (行のリスト) から、試合の 2 人の名前の直前の ○/◯/〇 (勝ち)・● (負け) で
#   勝者を決め、名前と同じ行の（…）か直後の行から決着の文言を読み、ラウンド/タイム/決着方法に分解する。
# アーキ上の位置: arakaku/review/note_results.py (match_unknown_bouts_to_note_results.py) が使う。
#   勝敗記号の定義は arakaku/notes/patterns.py と共有。
# なぜ試合側から探すか: 以前の extract_note_structured_results.py (T84 で削除) は note 側から試合を
#   組み立てたので、合同大会の記事・片側だけの記号・「🟦ザモン」のようなコーナー記号付きの行を取りこぼし、
#   別の試合の記号を混ぜることもあった (T70)。こちらは試合の 2 人を先に決めて探す。
# 不変条件:
#   - 勝者は記号だけで決める (記号が無い・両者に勝ちの記号があるなどの組は勝者なし)。
#   - 両選手の名前が NEAR_LINES 行以内に無ければ同じ試合とみなさない。間に ☆ (試合の見出し) か
#     2 つ以上の 🆚 があれば別の試合 (T93)。
#   - 名前の前後に NAME_CHAR が続けば、より長い別の語の一部 (例:「ロン」と「アイス・トロン」) として数えない。
# 関連スキル: .agents/skills/arakaku-source-pipeline
from __future__ import annotations

import re
from typing import Iterable

from arakaku.text import nfkc
from arakaku.notes.patterns import WIN_MARKS

# 勝敗記号は arakaku/notes/patterns.py と共有 (〇 U+3007 も勝ち)。NFKC 後は ① が "1" になるので数字を読み飛ばす。
MARK_BEFORE_NAME = re.compile(r"([○◯〇●])[\s🟥🟦\d]*$")
# カード形式の結果 note は「名前 / 年齢 / 戦績 / 🆚 / 名前」と 4 行離れるので 5 行まで見る。
NEAR_LINES = 5
NAME_CHAR = re.compile(r"[ぁ-ヿA-Za-zー・]")
RESULT_HINT = re.compile(r"\dR|判定|KO|一本|チョーク|ストップ|タオル|反則")
SUB_WORDS = ("チョーク", "RNC", "アームバー", "アームロック", "肩固め", "ギロチン", "三角", "ネックロック", "一本", "腕十字",
             "腕ひしぎ", "十字固め", "ヒールホールド")


def occurrences(lines: list[str], name: str) -> list[tuple[int, str]]:
    """(line index, mark right before the name or '') for every occurrence of name."""
    found = []
    target = nfkc(name)
    for i, line in enumerate(lines):
        text = nfkc(line)
        start = text.find(target)
        while start >= 0:
            before, after = text[:start], text[start + len(target):]
            inside_word = (before and NAME_CHAR.match(before[-1]) and not re.search(r"(?i)vs$", before)) or (
                after and NAME_CHAR.match(after[0]) and not re.match(r"(?i)vs", after))
            if not inside_word:
                m = MARK_BEFORE_NAME.search(before)
                found.append((i, m.group(1) if m else ""))
            start = text.find(target, start + 1)
    return found


def pair_verdicts(lines: list[str], names_a: Iterable[str], names_b: Iterable[str]) -> list[tuple[bool, int, int]]:
    """(a が勝ち, first line, last line) を、記号が片方だけを勝者とする近接した出現の組ごとに走査順で返す。"""
    occ_a = [o for name in names_a for o in occurrences(lines, name)]
    occ_b = [o for name in names_b for o in occurrences(lines, name)]
    verdicts = []
    for line_a, mark_a in occ_a:
        for line_b, mark_b in occ_b:
            if abs(line_a - line_b) > NEAR_LINES:
                continue
            between = lines[min(line_a, line_b) + 1:max(line_a, line_b)]
            if any("☆" in ln for ln in between) or sum("🆚" in ln for ln in between) > 1:
                continue
            # 記号が無い ("") ときは勝ちとみなさない ("" in WIN_MARKS は真なので明示する。T112.4.13)。
            a_wins = (mark_a != "" and mark_a in WIN_MARKS) or mark_b == "●"
            b_wins = (mark_b != "" and mark_b in WIN_MARKS) or mark_a == "●"
            if a_wins == b_wins:
                continue
            verdicts.append((a_wins, min(line_a, line_b), max(line_a, line_b)))
    return verdicts


def result_text(lines: list[str], first: int, last: int) -> str:
    """The result text of the bout: a parenthesis on the same line, or the next result-looking line
    such as '(1R2分39秒 アームバー)', '3R終了 判定3-0' or '1R 2分10秒KO(…)'. NFKC で（）は () になる。"""
    if first == last:
        for inner in re.findall(r"\(([^)]*)\)", nfkc(lines[last])):
            if RESULT_HINT.search(inner):
                return inner.strip()
    for k in range(last + 1, min(last + 4, len(lines))):
        line = nfkc(lines[k]).strip()
        if "☆" in line or (line and line[0] in "○◯〇●🟥🟦"):
            break
        if line.startswith("(") and RESULT_HINT.search(line):
            return line.strip("() ").split(")")[0].strip()
        if re.match(r"\d\s*R", line):
            return line
    return ""


def parse_result(text: str) -> dict[str, str]:
    """Round, time and method fields from note text such as '1R1分50秒KO 左ボディブロー' or '3R終了 判定3-0'."""
    out = {"round": "", "time": "", "method_raw": "", "method_normalized": "", "technique": "", "decision_score": ""}
    if not text:
        return out
    m = re.match(r"\s*(\d)\s*R\s*(?:(終了)時?|(\d{1,2})\s*分\s*(\d{1,2})\s*秒)?\s*", text)
    rest = text
    if m:
        out["round"] = f"{m.group(1)}R"
        out["time"] = "終了" if m.group(2) else (f"{int(m.group(3))}分{int(m.group(4)):02d}秒" if m.group(3) else "")
        rest = text[m.end():]
    rest = rest.strip()
    if rest.startswith("(") and rest.endswith(")"):  # "(アームバー)" のように決着全体が括弧のとき
        rest = rest[1:-1].strip()
    out["method_raw"] = rest

    # 技名は「KO」「TKO」を除き、括弧は外す (例: "KO(飛びヒザ蹴り)" → "飛びヒザ蹴り")。
    def technique(text: str) -> str:
        return re.sub(r"\s+", " ", re.sub(r"[()]", " ", re.sub(r"T?KO", " ", text, count=1))).strip()

    if "判定" in rest:
        out["method_normalized"] = "DEC"
        score = re.search(r"(\d+-\d+)", rest)
        out["decision_score"] = score.group(1) if score else ""
    elif re.search(r"TKO|コーナーストップ|タオル|ドクターストップ|レフェリーストップ", rest):
        out["method_normalized"] = "TKO"
        out["technique"] = technique(rest)
    elif re.search(r"KO", rest):
        out["method_normalized"] = "KO"
        out["technique"] = technique(rest)
    elif any(w in rest for w in SUB_WORDS):
        out["method_normalized"] = "SUB"
        out["technique"] = technique(rest)
    return out
