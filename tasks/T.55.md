# T.55 出典言及の結果判定で英単語の一部を KO などと誤検出しない

- 状態: 完了
- 期間: 2026-10-24

T.45.2 で記録した誤検出。`build_source_documents.py` の `RESULT_RE` が `KO` を単語の区切りなしで探すため、note のプロフィール欄の `kobayashi856.github.io/arakaku-site/` が `result` の言及として拾われる（`source_mentions.csv` と `review/source_mention_result_candidates.csv` に 1 件ずつ）。

- [x] T.55.1 `KO` / `TKO` / `NC` / `DQ` は前後が英字でないときだけ一致させ、作り直して誤検出だけが消えることを確かめる（c7e4909・e3f5f77・797d50f, 2026-10-24）
  - 最初の修正では `RNC`（リアネイキッドチョーク）の結果 6 行も消えた。`RNC` はそれまで中の `NC` で偶然一致していたので、`RNC` を明示的に足した
  - 消えた誤検出は 3 件: `kobayashi856.github.io`、YouTube 概要欄の「KOC準決勝」、youtu.be の URL に含まれる `Dq`（`youtube_url` に分類し直された）。ほかの行は変わらない
  - `tests/test_70_note_body.py` に、結果の行と誤検出しやすい行の両方を確かめるテストを足した
