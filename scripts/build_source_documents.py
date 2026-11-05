#!/usr/bin/env python3
from __future__ import annotations

# 役割: ローカルキャッシュ (note HTML / YouTube Data API JSON) を読み、本文を抽出・正規化して
#   data-src/source_documents.csv と source_mentions.csv を再生成する取り込みスクリプトの入口。
# アーキ上の位置: 入力 = data-src/articles.csv・videos.csv と tmp/note-html/*・tmp/youtube-api/*.json、
#   出力 = data-src/source_*.csv。これらは後段で build_json.py が source_*.json として viewer へ流す。
#   articles.csv の生成 (generate_articles.py) はこのスクリプトより前に走らせる必要がある。
#   本文の抽出と行の組み立ては arakaku/notes/html.py・arakaku/sources/documents.py、
#   言及の分類は arakaku/sources/mentions.py。
# 不変条件: 出力は決定的にするため documents/mentions をソートしてから書き出す。
#   note と YouTube のどちらかが 0 件 (キャッシュが無い) なら書かずにエラーで止まる。
#   fetched_at は本文 (content_hash) が前回と同じ行では前回の値を引き継ぐ。
# 関連スキル: .agents/skills/arakaku-source-pipeline。

from arakaku.io import read_csv, write_csv
from arakaku.paths import DATA_SRC, NOTE_HTML_DIR
from arakaku.sources.documents import (
    DOCUMENT_FIELDS,
    document_sort_key,
    keep_unchanged_fetched_at,
    note_documents,
    now_iso,
    youtube_documents,
)
from arakaku.sources.mentions import MENTION_FIELDS, extract_mentions, mention_sort_key
from arakaku.youtube import iter_cached_videos

ARTICLES_CSV = DATA_SRC / "articles.csv"
VIDEOS_CSV = DATA_SRC / "videos.csv"
SOURCE_DOCUMENTS_CSV = DATA_SRC / "source_documents.csv"
SOURCE_MENTIONS_CSV = DATA_SRC / "source_mentions.csv"


def main() -> int:
    notes = note_documents(read_csv(ARTICLES_CSV), NOTE_HTML_DIR, now_iso())
    videos = youtube_documents(read_csv(VIDEOS_CSV), iter_cached_videos(), now_iso())
    # キャッシュが無い (新しい clone など) と 0 件になり、正本の本文 DB を空で上書きしてしまう (T.112.4.1)。
    empty = [name for name, docs in (("note", notes), ("YouTube", videos)) if not docs]
    if empty:
        raise SystemExit(
            f"[error] no cached {' / '.join(empty)} sources under tmp/; "
            f"refusing to overwrite {SOURCE_DOCUMENTS_CSV.name} and {SOURCE_MENTIONS_CSV.name} (run make cache-sources)"
        )
    documents = notes + videos
    keep_unchanged_fetched_at(documents, read_csv(SOURCE_DOCUMENTS_CSV, missing_ok=True))

    mentions = []
    for document in documents:
        mentions.extend(extract_mentions(document))

    documents.sort(key=document_sort_key)
    mentions.sort(key=mention_sort_key)

    write_csv(SOURCE_DOCUMENTS_CSV, DOCUMENT_FIELDS, documents)
    write_csv(SOURCE_MENTIONS_CSV, MENTION_FIELDS, mentions)

    print(f"[info] {len(documents)}")
    print(f"[info] {len(mentions)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
