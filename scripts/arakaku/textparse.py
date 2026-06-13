# 役割: 複数スクリプト間で挙動を完全一致させたいテキスト解析の正規表現/関数を共有する。
#   (下の docstring がモジュールの方針を述べているので必ず合わせて読むこと)
# アーキ上の位置: build_source_documents.py が NOTE_URL_RE / YOUTUBE_URL_RE / VS_RE を、
#   review 候補生成スクリプト群が TIME_RE / infer_time / find_method 等を import する。
# 不変条件: ここに置くのは「全利用箇所で同一であるべき」パターンだけ。
#   団体ごとに語彙が異なる EVENT_RE / RESULT_RE / METHOD_PATTERNS 等は各スクリプト側に残す
#   (共有化すると別文脈の変更が意図せず波及するため)。
"""複数スクリプトで挙動が完全に一致するテキスト解析パターン/関数の置き場。

語彙が意図的に異なるパターン (METHOD_PATTERNS, ROUND_RE, EVENT_RE,
RESULT_RE など) は各スクリプト側に残すこと。
"""
import re

NOTE_URL_RE = re.compile(r"https?://note\.com/[^\s)）]+")
YOUTUBE_URL_RE = re.compile(r"https?://(?:www\.)?(?:youtube\.com|youtu\.be)/[^\s)）]+")
# 半角/全角の vs と日本語「対」の両方を対戦表記として拾う。
VS_RE = re.compile(r"(?i)\bvs\.?\b|ＶＳ|ｖｓ|対")

# 2 系統の時刻表記を捕捉: グループ1,2 = "N分N秒" / グループ3,4 = "M:SS"。
# infer_time がこのグループ番号割り当てに依存しているので順序を変えないこと。
TIME_RE = re.compile(r"([0-9０-９]+)\s*分\s*([0-9０-９]+)\s*秒|([0-9０-９]+):([0-9０-９]{2})")


def normalize_digits(value: str) -> str:
    return value.translate(str.maketrans("０１２３４５６７８９", "0123456789"))


# patterns は (method, pattern) の優先順リスト。先頭から最初にマッチしたものを採用するので、
# 呼び出し側は曖昧さの解消順を patterns の並びで表現する。
def find_method(text: str, patterns: list[tuple[str, re.Pattern[str]]]) -> tuple[str, str]:
    for method, pattern in patterns:
        match = pattern.search(text)
        if match:
            return method, match.group(0)
    return "", ""


def infer_time(text: str) -> str:
    match = TIME_RE.search(text)
    if not match:
        return ""
    if match.group(1) and match.group(2):
        return f"{normalize_digits(match.group(1))}分{normalize_digits(match.group(2))}秒"
    if match.group(3) and match.group(4):
        return f"{normalize_digits(match.group(3))}分{normalize_digits(match.group(4))}秒"
    return ""
