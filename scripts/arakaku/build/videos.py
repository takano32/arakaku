# 役割: videos.csv と video_links.csv の行を docs/data の videos.json・video_links.json の形にする。
# アーキ上の位置: build/canonical.py の json_builders が呼ぶ。チャンネル名・公開日・サムネイルは
#   archives/youtube.csv (build/relations.py の Relations.youtube_archive) から写す。I/O はしない。
# 不変条件: link_status はリンク表から導く (videos.csv の手入力列は持たない)。
# 関連スキル: .agents/skills/arakaku-maintainer。
from __future__ import annotations

from typing import Any

from arakaku.build.relations import Relations
from arakaku.csvmap import field_or_default, field_or_empty, map_rows
from arakaku.schema import CsvRow
from arakaku.text import none_if_empty


def _youtube_archive(row: CsvRow, rel: Relations) -> CsvRow:
    """YouTube の動画の archives/youtube.csv の行。YouTube でない動画と未アーカイブの動画は空。

    アーカイブは platform_video_id で引くので、ほかの platform の同じ ID に当たらないようにする
    (以前はサムネイルだけが platform を確かめていた。T.112.6.22)。
    """
    if (row.get("platform") or "youtube") != "youtube":
        return {}
    return rel.youtube_archive.get(row["platform_video_id"], {})


def _thumbnail_sizes(row: CsvRow, rel: Relations) -> str:
    # videos.json は viewer の最初の描画で使うため、後から読み込まれる youtube_archives.json を
    # 待たずに済むようサムネイルの種類だけここで写す。未アーカイブの動画は空文字。
    return _youtube_archive(row, rel).get("thumbnail_sizes", "")


def build_videos(videos: list[CsvRow], rel: Relations) -> list[dict[str, Any]]:
    def archive_value(row: CsvRow, column: str) -> str | None:
        return none_if_empty(_youtube_archive(row, rel).get(column))

    return map_rows(
        videos,
        {
            "video_id": "video_id",
            "platform": field_or_default("platform", "youtube"),
            "platform_video_id": "platform_video_id",
            "url": "url",
            "title": "title",
            "original_title": "original_title",
            # チャンネル名と公開日はアーカイブ (archives/youtube.csv) の表示用メタデータから写す
            # (T.75: videos.csv の列は全件 NA / 空のプレースホルダだった)。viewer の enricher も同じ値で上書きする。
            "channel_name": lambda row: archive_value(row, "uploader"),
            "published_at": lambda row: archive_value(row, "upload_date"),
            "official_status": field_or_default("official_status", "unknown"),
            "video_type": field_or_default("video_type", "reference"),
            # 動画の紐づけ状態はリンク表から導く (T.75: 以前は videos.csv の手入力列で、355 本が古い unlinked のままだった)。
            "link_status": lambda row: "linked" if row["video_id"] in rel.linked_video_ids else "unlinked",
            "duplicate_group_id": "duplicate_group_id",
            "duplicate_note": "duplicate_note",
            "notes": field_or_empty("notes"),
            "source_article_ids": lambda row: rel.article_ids_for("video", row["video_id"]),
            "thumbnail_sizes": lambda row: _thumbnail_sizes(row, rel),
        },
    )


def build_video_links(video_links: list[CsvRow]) -> list[dict[str, Any]]:
    return map_rows(
        video_links,
        {
            "video_id": "video_id",
            "entity_type": "entity_type",
            "entity_id": "entity_id",
            "relation_type": field_or_default("relation_type", "reference"),
            "start_time": "start_time",
            "end_time": "end_time",
            "notes": field_or_empty("notes"),
        },
    )
