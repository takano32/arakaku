from __future__ import annotations
from typing import TypedDict, Optional, List, Dict, Union, Callable

class BoutFighter(TypedDict):
    fighter_id: str
    name: str
    corner: Optional[str]
    result: str

class BoutResult(TypedDict):
    round: Optional[int]
    time: Optional[str]
    method_raw: Optional[str]
    method_normalized: Optional[str]
    technique: Optional[str]
    decision_score: Optional[str]

class BoutTitle(TypedDict):
    is_title_bout: bool
    title_id: Optional[str]
    title_result: Optional[str]
    note: str

class Bout(TypedDict):
    bout_id: str
    event_id: str
    promotion_id: str
    bout_order: Optional[int]
    matchup: str
    division: Optional[str]
    weight_class_id: Optional[str]
    bout_type: Optional[str]
    fighters: List[BoutFighter]
    winner_id: Optional[str]
    winner: Optional[str]
    loser_id: Optional[str]
    loser: Optional[str]
    result_status: str
    result: BoutResult
    title: BoutTitle
    source_article_id: Optional[str]
    notes: str
    inferred_from_video_id: Optional[str]
    inferred_from_video_title: Optional[str]
    inferred_confidence: Optional[str]
