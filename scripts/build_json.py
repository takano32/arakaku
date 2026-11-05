from __future__ import annotations

# 役割: data-src/*.csv (正規化済みリレーショナル CSV) と review/ の候補 CSV を読み、viewer 用の
#   docs/data/*.json を一括生成する入口。Makefile の `build` ターゲット先頭で実行される。
# アーキ上の位置: CSV の読み込みは arakaku/build/relations.py (load_tables)、JSON の組み立ては
#   arakaku/build/canonical.py (json_builders)、書き出しは arakaku/io.py (build_json_files)。
#   official_*/numbers_* は別の入口 (build_official_json.py 等) が担当。
# 不変条件: ここにはロジックを置かない。出力 JSON のキー構造は viewer と validation/ の契約。
# 関連スキル: .agents/skills/arakaku-maintainer。
from arakaku.build.canonical import json_builders
from arakaku.build.relations import load_tables
from arakaku.io import build_json_files
from arakaku.paths import DOCS_DATA


def main() -> None:
    build_json_files(DOCS_DATA, json_builders(load_tables()), "[done] JSON build completed")


if __name__ == "__main__":
    main()
