# 役割: 出典系 JSON (source_documents / source_document_bodies / source_mentions と、review/ 由来の
#   source_*_references) の主キー・必須フィールド・参照先の検証。
# アーキ上の位置: runner.py が呼ぶ。source_*_references の形は make_source_reference_candidates.py
#   の出力 (arakaku/review/) に対応する。
# 関連スキル: .agents/skills/arakaku-source-pipeline。
from __future__ import annotations

from typing import Any

from .common import collect_ids, is_http_url
from .report import Report


def validate_source_documents(report: Report, data: list[Any]) -> None:
    seen = set()
    for index, row in enumerate(data):
        source_id = row.get("source_id")
        if not source_id:
            report.error(f"source_documents.json[{index}]: missing source_id")
            continue
        if source_id in seen:
            report.error(f"source_documents.json[{index}]: duplicate source_id: {source_id}")
        seen.add(source_id)
        if not row.get("source_type"):
            report.error(f"source_documents.json[{index}]: missing source_type")
        if not row.get("source_ref_id"):
            report.error(f"source_documents.json[{index}]: missing source_ref_id")
        if not row.get("content_hash"):
            report.error(f"source_documents.json[{index}]: missing content_hash")
        url = row.get("url")
        if url and not is_http_url(url):
            report.error(f"source_documents.json[{index}]: invalid url: {url}")


def validate_source_document_bodies(report: Report, data: list[Any]) -> None:
    seen: set[str] = set()
    for index, row in enumerate(data):
        source_id = row.get("source_id")
        if not source_id:
            report.error(f"source_document_bodies.json[{index}]: missing source_id")
            continue
        if source_id in seen:
            report.error(f"source_document_bodies.json[{index}]: duplicate source_id: {source_id}")
        seen.add(source_id)


def validate_source_mentions(report: Report, data: list[Any]) -> None:
    seen = set()
    for index, row in enumerate(data):
        mention_id = row.get("mention_id")
        if not mention_id:
            report.error(f"source_mentions.json[{index}]: missing mention_id")
            continue
        if mention_id in seen:
            report.error(f"source_mentions.json[{index}]: duplicate mention_id: {mention_id}")
        seen.add(mention_id)
        if not row.get("source_id"):
            report.error(f"source_mentions.json[{index}]: missing source_id")
        if not row.get("mention_type"):
            report.error(f"source_mentions.json[{index}]: missing mention_type")


def validate_source_references(report: Report, data: list[Any], filename: str, id_field: str, known_ids: set[str]) -> set[str]:
    ids = collect_ids(report, data, filename, "candidate_id")
    for index, row in enumerate(data):
        if not isinstance(row, dict):
            continue
        entity_id = row.get(id_field)
        if not entity_id:
            report.error(f"{filename}[{index}]: missing {id_field}")
        elif entity_id not in known_ids:
            report.error(f"{filename}[{index}]: unknown {id_field}: {entity_id}")
        for field in ["source_id", "source_type", "source_ref_id", "confidence"]:
            if not row.get(field):
                report.error(f"{filename}[{index}]: missing {field}")
    return ids
