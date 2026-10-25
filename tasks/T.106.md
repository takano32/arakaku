# T.106 外部リンクの URL スキームを確かめていない

- 状態: 完了
- 期間: 2026-10-25

T.88 の洗い出しで登録。

viewer の `externalLink()` は URL をエスケープするがスキームを見ない。validate_json.py は videos とアーカイブの URL は見るが articles・source_documents は見ない。今のデータに問題は無い（多層防御）。

- [x] T.106.1 externalLink を http(s) に限り、検証に URL スキームを足す（ac7df67・2906311、2026-10-25）。今のデータに違反なし
