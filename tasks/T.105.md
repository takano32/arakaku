# T.105 CI と実行環境の細部

- 状態: 完了
- 期間: 2026-10-25

T.88 の洗い出しで登録。

ワークフローに timeout-minutes が無い（既定 6 時間）、pip のキャッシュと pytest の固定が無い、CI は Python 3.12・手元は 3.14 で pyproject に requires-python が無い。

- [x] T.105.1 timeout・キャッシュ・Python の範囲を設定する（faa9b20・4fe70a5、2026-10-25）。push 後の Test・Deploy Pages とも成功。Python は CI 3.12・手元 3.14 で両方通るので requires-python は付けていない（pyproject は pytest の設定だけで [project] を持たない）
