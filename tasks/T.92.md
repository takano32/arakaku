# T.92 make refresh-sources と check-generated の抜け

- 状態: 完了
- 期間: 2026-10-25

T.88 の洗い出しで登録。

- `refresh-sources` が review の候補 CSV（make_source_mention_result_candidates・make_source_reference_candidates）と generate_official_csvs.py を動かさない。次の CI の check-generated が落ち、viewer の出典候補も古いまま
- `check-generated` に、オフラインで動く generate_articles.py と match_unknown_bouts_to_note_results.py（docs/data を読むので build の後）が入っていない

- [x] T.92.1 候補 CSV の生成を generate-stage2 に、generate_official_csvs を refresh-sources に入れる（d5780c8、2026-10-25）
- [x] T.92.2 generate_articles と match_unknown_bouts_to_note_results を check-generated に入れる（d5780c8、2026-10-25）。check-generated はまず build する
