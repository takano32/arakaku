# 役割: 正規 JSON ビルドの入力を読む。data-src の正規 CSV と review/ の候補 CSV を読み、
#   build/relations.py の Tables にして返す (load_tables)。
# アーキ上の位置: build/ の中で I/O (arakaku.io.read_csv・arakaku.paths) をするのはここだけ。
#   scripts/build_json.py が load_tables() を呼び、build/canonical.py の json_builders に渡す。
#   build/relations.py (Tables・Relations) と各ビルダは純粋なまま (T112.6.19、tests/test_00_layering)。
# 不変条件: data-src の CSV は read_csv がヘッダを schema.CSV_HEADERS と照合する。review/ の候補 CSV
#   3 本は無ければエラー (T112.4.5)。読み込んだ行は加工しない。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from pathlib import Path

from arakaku.build.relations import Tables
from arakaku.io import read_csv
from arakaku.paths import DATA_SRC, REVIEW
from arakaku.schema import CsvRow


def load_tables(data_src: Path = DATA_SRC, review: Path = REVIEW) -> Tables:
    def rows(name: str) -> list[CsvRow]:
        return read_csv(data_src / name)

    return Tables(
        articles=rows("articles.csv"),
        article_links=rows("article_links.csv"),
        promotions=rows("promotions.csv"),
        events=rows("events.csv"),
        bouts=rows("bouts.csv"),
        bout_participants=rows("bout_participants.csv"),
        fighters=rows("fighters.csv"),
        titles=rows("titles.csv"),
        title_reigns=rows("title_reigns.csv"),
        fighter_snapshots=rows("fighter_snapshots.csv"),
        videos=rows("videos.csv"),
        video_links=rows("video_links.csv"),
        video_bout_links=rows("video_bout_links.csv"),
        aliases=rows("aliases.csv"),
        source_documents=rows("source_documents.csv"),
        source_mentions=rows("source_mentions.csv"),
        youtube_archives=rows("archives/youtube.csv"),
        note_archives=rows("archives/note.csv"),
        # review の候補 CSV は make generate-stage2 が作ってコミットしている。無いのに空として進めると
        # source_*_references.json が空のまま検証も通るので、無ければエラー (T112.4.5)。
        source_event_references=read_csv(review / "source_event_reference_candidates.csv", required=True),
        source_bout_references=read_csv(review / "source_bout_reference_candidates.csv", required=True),
        source_video_references=read_csv(review / "source_video_reference_candidates.csv", required=True),
    )
