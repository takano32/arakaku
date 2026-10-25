# T.84 使われていないコードとスクリプト

- 状態: 完了
- 期間: 2026-10-25

T.62 の洗い出しで登録。

- ビューア: `repository.js` の `eventSourceVideoIdsWithoutBoutCoverage`・`findRichPromotion`、`list.js` の `count`・`renderedCount`・`cursorIndex`・`resetCursor`
- Makefile から呼ばれないスクリプト: `crawl_note_articles.py`・`import_youtube_videos.py`（yt-dlp 時代）・`import_youtube_descriptions.py`・`extract_note_structured_results.py`・`make_structured_result_patch_candidates.py`・`apply_structured_result_patches.py`（T.70 で抽出系は使う可能性あり）
- `make refresh-sources` が generate_articles などを飛ばす。名前の正規化が 3 か所に重複

- [x] T.84.1 ビューアの未使用コードを消す（9dfa00c、2026-10-25）。どこからも参照されていないことを grep で確認。`#prevFilterKeyFor` は使われているので残した
- [x] T.84.2 スクリプトを消すか Makefile に組み込むかをユーザーに確認する（4d75bf0・aae3b07・a91c19c、2026-10-25）。2026-10-25 にユーザーが決定: 4 つを消す。import_youtube_videos.py・import_youtube_descriptions.py・extract_note_structured_results.py・make_structured_result_patch_candidates.py と、それらの review CSV 3 つを削除。discover_youtube_videos.py が使っていた 2 関数は移した。crawl_note_articles.py は T.86 で Makefile に組み込み済み。`make refresh-sources` は T.86.2 で generate-articles と stage2 を含むようにした。名前の正規化の重複（extract_numbers.py と enricher.js）は残っている
