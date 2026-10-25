# T.107 ドキュメントとスキルを今の手順に合わせる

- 状態: 完了
- 期間: 2026-10-25

T.88 の洗い出しで登録。

2 回目のドキュメント調査で見つかったもの。
- CI の説明が古い（maintainer スキル: test.yml・pages.yml とも make check + check-generated）
- CSV を直したあとの手順に generate-stage2・check-generated が無い（data-curator・review-workflow スキル、OPERATIONS_CHECKLIST、CODEX、GEMINI、data-src/GEMINI、PR テンプレート、AGENTS.md の push 条件）
- 取り込みの手順が refresh-sources の新しい流れ（discover・generate-articles・stage2）になっていない（README・HANDOFF・OPERATIONS_CHECKLIST・GEMINI・CODEX・各スキル）
- source-pipeline・review-workflow スキルに discover・match_unknown・apply の流れが無い、data-curator スキルに video_event_links が無い
- viewer-ui スキルが replaceState のみ・画像の base64 埋め込み・読み込み n/31 のまま、sorting スキルが event_date・videos の published_at のまま
- setup-node@v5 が 4 文書の action 一覧に無い、mention_type に match_result が無い、SCHEMA_NOTES の video_event_links の外部キー、README の events.published_at と archives/note.csv の published_at の説明、check-stage1/2-inputs、data-src/GEMINI の誤り 2 か所、docs-handoff スキルの同期対象、scripts/GEMINI の主なスクリプト、HANDOFF・CODEX・OPERATIONS_CHECKLIST の小さな古さ、PR テンプレートの団体・王座

- [x] T.107.1 CI・CSV 編集後の手順・取り込みの手順を全文書で揃える（c803627・6fa18fd・a84ca20、2026-10-25）
- [x] T.107.2 スキル（source-pipeline・review-workflow・data-curator・viewer-ui・sorting・maintainer・actions-ops・docs-handoff）を更新（de9b623、2026-10-25）
- [x] T.107.3 README・SCHEMA_NOTES・GEMINI 系・HANDOFF・CODEX・OPERATIONS_CHECKLIST・PR テンプレートの小さな修正（6fa18fd・a84ca20、2026-10-25）。編集はサブエージェントに任せ、差分を確かめてからコミット。HANDOFF の旧スクリプト名は日付つきの履歴なので残した
