#!/usr/bin/env python3
from __future__ import annotations

# 役割: ビルド済み docs/data/*.json の構造・主キー一意性・参照整合性を検証する Python 側
#   バリデータの入口。`make validate` の最初のステップ。
# アーキ上の位置: 検証本体は arakaku/validation/ (runner.run が全部読んで依存順に検証し、エラーを
#   表示して終了コードを返す)。許容値の集合は arakaku/validation/vocab.py。viewer 側の整合は
#   validate_json.js が別途検証する。
# 不変条件 / 注意: 致命的不整合は error (return 1)。列挙値の範囲外も error (vocab.py に無い値。
#   T.69 で warning から変更)。生成 JSON は make build が必ず全部書くので、欠けていれば error、
#   壊れていれば例外 (arakaku.io.load_json)。ここにはロジックを置かない。
# 関連 skill: .agents/skills/arakaku-maintainer (make validate)。

from arakaku.paths import DATA_SRC, DOCS_DATA
from arakaku.validation import run


def main() -> int:
    return run(DOCS_DATA, DATA_SRC)


if __name__ == '__main__':
    raise SystemExit(main())
