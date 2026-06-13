#!/usr/bin/env python3
"""Generate promotions.csv from static config (promotion rules are fixed knowledge)."""
from __future__ import annotations

# 役割: 団体（プロモーション）マスタ promotions.csv を静的定義から生成する。団体ルールは
#       創作世界観の固定知識なので、外部ソースではなく下記 PROMOTIONS リテラルが唯一の真実。
# アーキ上の位置: generate-stage2 の先頭で実行される（Makefile 参照）。出力 promotions.csv は
#       events / titles / aliases / build_json の promotion_id 外部キーの参照先になる。
# 不変条件: promotion_id は他テーブルから FK 参照されるので変更・削除はそれらと同期必須。
#       FIELDS と各 dict のキーは write_csv の DictWriter で厳密一致させること。
# 関連スキル: .agents/skills/arakaku-data-curator
from arakaku.utils import DATA_SRC, write_csv

OUTPUT = DATA_SRC / "promotions.csv"
FIELDS = [
    "promotion_id", "name", "name_en", "category", "country_scope", "summary",
    "rule_venue", "rule_rounds", "rule_judging", "rule_glove",
    "rule_elbows", "rule_soccer_kicks", "rule_stomps",
    "rule_four_point_head_kicks", "rule_four_point_head_knees",
]

PROMOTIONS = [
    {
        "promotion_id": "target",
        "name": "ターゲット",
        "name_en": "TARGET",
        "category": "major",
        "country_scope": "japan",
        "summary": "スーパーうんどう活動休止後、その関係者が新しく立ち上げた日本のメジャー団体。",
        "rule_venue": "リング",
        "rule_rounds": "1R5分3R",
        "rule_judging": "トータルマスト",
        "rule_glove": "青OFG",
        "rule_elbows": "なし",
        "rule_soccer_kicks": "あり",
        "rule_stomps": "あり",
        "rule_four_point_head_kicks": "あり",
        "rule_four_point_head_knees": "",
    },
    {
        "promotion_id": "emperor",
        "name": "エンペラー",
        "name_en": "EMPEROR",
        "category": "major",
        "country_scope": "foreign",
        "summary": "外国の総合格闘技団体。メジャー3団体の一つ。",
        "rule_venue": "リング",
        "rule_rounds": "1R5分3R",
        "rule_judging": "ラウンドマスト",
        "rule_glove": "青OFG",
        "rule_elbows": "あり",
        "rule_soccer_kicks": "なし",
        "rule_stomps": "なし",
        "rule_four_point_head_kicks": "なし",
        "rule_four_point_head_knees": "",
    },
    {
        "promotion_id": "mh",
        "name": "マウンテン・ヒーローズ",
        "name_en": "M・H",
        "category": "major",
        "country_scope": "foreign",
        "summary": "総合格闘技団体マウンテンとヒーローズが合併してできた外国の団体。メジャー3団体の一つ。",
        "rule_venue": "リング",
        "rule_rounds": "1R5分3R",
        "rule_judging": "ラウンドマスト",
        "rule_glove": "赤OFG",
        "rule_elbows": "あり",
        "rule_soccer_kicks": "なし",
        "rule_stomps": "なし",
        "rule_four_point_head_kicks": "なし",
        "rule_four_point_head_knees": "あり",
    },
    {
        "promotion_id": "max_bout",
        "name": "MAXバウト",
        "name_en": "MAX BOUT",
        "category": "special_event_series",
        "country_scope": "japan",
        "summary": "メジャー3団体の強者たちだけが戦える大会シリーズ。基本トーナメント中心。",
        "rule_venue": "リング",
        "rule_rounds": "1R5分3R",
        "rule_judging": "ラウンドマスト",
        "rule_glove": "白OFG",
        "rule_elbows": "あり",
        "rule_soccer_kicks": "なし",
        "rule_stomps": "なし",
        "rule_four_point_head_kicks": "なし",
        "rule_four_point_head_knees": "あり",
    },
    {
        "promotion_id": "elite_spirits",
        "name": "エリートスピリッツ",
        "name_en": "ELITE SPIRITS",
        "category": "minor",
        "country_scope": "unknown",
        "summary": "公式YouTube動画タイトルから抽出した大会系列。詳細未入力。",
        "rule_venue": "", "rule_rounds": "", "rule_judging": "", "rule_glove": "",
        "rule_elbows": "", "rule_soccer_kicks": "", "rule_stomps": "",
        "rule_four_point_head_kicks": "", "rule_four_point_head_knees": "",
    },
    {
        "promotion_id": "arakaku_live",
        "name": "アラカクライブ",
        "name_en": "ARAKAKU LIVE",
        "category": "event_series",
        "country_scope": "unknown",
        "summary": "公式YouTube動画タイトルから抽出したライブ/特別イベント系列。詳細未入力。",
        "rule_venue": "", "rule_rounds": "", "rule_judging": "", "rule_glove": "",
        "rule_elbows": "", "rule_soccer_kicks": "", "rule_stomps": "",
        "rule_four_point_head_kicks": "", "rule_four_point_head_knees": "",
    },
    {
        "promotion_id": "video_catalog",
        "name": "動画カタログ未分類",
        "name_en": "VIDEO CATALOG",
        "category": "unclassified",
        "country_scope": "unknown",
        "summary": "大会系列を確定できない公式YouTube動画タイトル由来の仮分類。",
        "rule_venue": "", "rule_rounds": "", "rule_judging": "", "rule_glove": "",
        "rule_elbows": "", "rule_soccer_kicks": "", "rule_stomps": "",
        "rule_four_point_head_kicks": "", "rule_four_point_head_knees": "",
    },
]


def main() -> None:
    write_csv(OUTPUT, FIELDS, PROMOTIONS)
    print(f"[done] {len(PROMOTIONS)} promotion rows written")


if __name__ == "__main__":
    main()
