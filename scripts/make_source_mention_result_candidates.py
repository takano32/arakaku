#!/usr/bin/env python3
from __future__ import annotations

# 役割: source_mentions.csv の "result" 種別の言及から試合結果の手掛かりを抽出した
#   review/source_mention_result_candidates.csv を書く入口。候補の作り方は
#   arakaku/review/mention_result_candidates.py。
# アーキ上の位置: `make source-mention-result-candidates` / `make check-generated` から起動。出力は
#   review/ 以下の「人間レビュー専用」候補で、bouts.csv 等の確定データではない (notes 列にもその旨を明記)。
# 不変条件: ここにはロジックを置かない。
# 関連 skill: .agents/skills/arakaku-source-pipeline (Review candidate pipeline)。

from collections import defaultdict

from arakaku.io import read_csv, write_csv
from arakaku.paths import DATA_SRC, REVIEW
from arakaku.review.mention_result_candidates import FIELDS, build_rows

SOURCE_MENTIONS_CSV = DATA_SRC / "source_mentions.csv"
OUT_CSV = REVIEW / "source_mention_result_candidates.csv"


def main() -> int:
    rows = build_rows(read_csv(SOURCE_MENTIONS_CSV))
    write_csv(OUT_CSV, FIELDS, rows)

    counts: dict[str, int] = defaultdict(int)
    for row in rows:
        counts[row["confidence"]] += 1

    print(f"[rows] {len(rows)}")
    print("[confidence] " + ", ".join(f"{key}={counts[key]}" for key in sorted(counts)))
    print("[next] Review the CSV before applying anything to data-src/bouts.csv.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
