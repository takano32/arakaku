#!/usr/bin/env python3
from __future__ import annotations

# 役割: レビュー CSV のうち apply 列が真の行だけを bouts.csv / bout_participants.csv へ
#   書き戻す適用ステップ。当てる規則は arakaku/review/patches.py にあり、ここは読み書きと表示だけをする。
# アーキ上の位置: パイプラインの後半。入力 CSV は match_unknown_bouts_to_note_results.py が
#   生成する review/unknown_bout_note_results.csv (既定) か review/known_bout_note_methods.csv。
#   apply=true の行のみが対象。winner/loser は出場者の名前と完全一致する必要があり、合わない行は
#   [warn] を出して反映しない。
# 不変条件 / 注意: 元データ (bouts.csv / bout_participants.csv) を破壊的に上書き
#   するため、レビュー済みの apply 行のみ処理すること。読むときはヘッダを照合しない
#   arakaku.io.read_raw_csv、書くときは arakaku.io.atomic_open (一時ファイルから差し替え) に標準 csv で
#   書く。書き戻し時に extrasaction="ignore" と
#   既存 fieldnames を保つことで列構成を変えない (この契約を維持すること)。
# 関連 skill: .agents/skills/arakaku-review-workflow。

import csv
import sys
from pathlib import Path

from arakaku.io import atomic_open, read_raw_csv
from arakaku.paths import ROOT
from arakaku.review.patches import apply_patches

BOUTS_CSV = ROOT / "data-src" / "bouts.csv"
PARTICIPANTS_CSV = ROOT / "data-src" / "bout_participants.csv"
PATCH_CSV = ROOT / "review" / "unknown_bout_note_results.csv"


def main() -> int:
    bouts, bout_fieldnames = read_raw_csv(BOUTS_CSV)
    participants, participant_fieldnames = read_raw_csv(PARTICIPANTS_CSV)

    # 既定は review/unknown_bout_note_results.csv。同じ列を持つ別の CSV
    # (例: review/known_bout_note_methods.csv) を引数で渡せる。
    patch_csv = Path(sys.argv[1]) if len(sys.argv) > 1 else PATCH_CSV
    patch_rows, _ = read_raw_csv(patch_csv)

    result = apply_patches(bouts, participants, patch_rows)
    for bout_id in result.unknown_bout_ids:
        print(f"[warn] unknown bout_id: {bout_id}")
    for bout_id in result.unmatched_bout_ids:
        print(f"[warn] winner/loser do not match the participants' names: {bout_id}")
    bouts, participants = result.bouts, result.participants
    applied, skipped = result.applied, len(result.unknown_bout_ids) + len(result.unmatched_bout_ids)

    # 正本の CSV を書き換えるので、一時ファイルに書いてから差し替える (途中で落ちても切り詰めない。T.112.4.3)。
    with atomic_open(BOUTS_CSV, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=bout_fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(bouts)

    with atomic_open(PARTICIPANTS_CSV, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=participant_fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(participants)

    print(f"[applied] {applied}  skipped={skipped}")
    print(f"[info] {BOUTS_CSV}")
    print(f"[info] {PARTICIPANTS_CSV}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
