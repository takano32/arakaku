from __future__ import annotations
from typing import Any

VALID_METHODS = {'KO', 'TKO', 'SUB', 'DEC', 'DQ', 'NC'}
VALID_VIDEO_TYPES = {
    'full_fight', 'highlight', 'short', 'stream_archive', 'preview', 'interview', 'commentary', 'reference'
}
VALID_VIDEO_LINK_STATUSES = {'linked', 'partially_linked', 'unlinked', 'needs_review'}
VALID_VIDEO_RELATION_TYPES = {
    'full_fight', 'highlight', 'short', 'stream_archive', 'preview', 'interview', 'commentary', 'reference'
}
VALID_VIDEO_ENTITY_TYPES = {'event', 'bout', 'fighter', 'promotion', 'title'}
VALID_ARTICLE_ENTITY_TYPES = {
    'event', 'bout', 'fighter', 'fighter_snapshot', 'promotion', 'title', 'title_reign', 'video'
}
VALID_ARTICLE_RELATION_TYPES = {'source', 'reference'}

class ValidationContext:
    def __init__(self):
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def add_error(self, m: str) -> None:
        self.errors.append(m)

    def add_warning(self, m: str) -> None:
        self.warnings.append(m)

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0

class BaseValidator:
    def __init__(self, ctx: ValidationContext):
        self.ctx = ctx

    def collect_ids(self, items: list[Any], filename: str, id_field: str) -> set[str]:
        ids = set()
        seen = set()
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                self.ctx.add_error(f"{filename}[{i}]: expected object")
                continue
            v = item.get(id_field)
            if not isinstance(v, str) or not v.strip():
                self.ctx.add_error(f"{filename}[{i}]: missing required id field: {id_field}")
                continue
            if v in seen:
                self.ctx.add_error(f"{filename}[{i}]: duplicate {id_field}: {v}")
            seen.add(v)
            ids.add(v)
        return ids

    def require_field(self, obj: dict[str, Any], filename: str, index: int, field: str) -> Any:
        v = obj.get(field)
        if v is None or v == '':
            self.ctx.add_error(f"{filename}[{index}]: missing required field: {field}")
        return v
