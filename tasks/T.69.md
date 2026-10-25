# T.69 検証の穴をふさぐ

- 状態: 完了
- 期間: 2026-10-25

T.62 の洗い出しで登録。

壊れた入力でも `make check` が通るケースがある（スクリプト調査で、作業用コピーに故障を入れて確認）。

- [x] T.69.1 CSV の列名変更・欠落ファイルを失敗にする（`read_csv` が `[]` を返す、`row.get` が None、test_05 は一部の列しか見ない）（019771a・c626370、2026-10-25）。全 CSV のヘッダを `scripts/arakaku/schema.py` に置いた。列名の変更（events.csv の event_date→date）と official_players.csv の削除で build が失敗することを確認。自分の前回出力を読む build_source_documents.py だけ missing_ok。作業用コピーで rebuild-stage2 と stage1 の source 系生成を最初から実行してエラーなし（差分は生成時刻のみ）
- [x] T.69.2 未知の列挙値を警告ではなく失敗にし、bout_type・event_type・side などにも集合を定義する（9fb268e・6287e0f、2026-10-25）。集合は今の実データの値域
- [x] T.69.3 `load_json` が JSONDecodeError を握りつぶすのをやめる。`validate_json.js` の ENOENT フォールバックも見直す（9e54efc・9d0c828、2026-10-25）。壊れた JSON・欠けた JSON で Python・Node の両方が失敗することを確認
- [x] T.69.4 JSON を一時ファイル経由で原子的に書き込む（並行実行で書きかけの JSON を読んで失敗した）（20f2a07、2026-10-25）。mkstemp の 0600 を umask に合わせて戻す
- [x] T.69.5 `generate_official_pages_csv.py` が入力欠落時に空の CSV を書く・`make rebuild` が前提確認前に CSV を消す（c616b79・c68ef80、2026-10-25）。about.astro を退避すると CSV を書かずに exit 1、pages を退避すると rebuild-stage2 は何も消さずに止まることを確認
- [x] T.69.6 表をまたぐ検査: 試合の団体と大会の団体、alias の canonical_id、`(alias_type, alias)` の重複、source_mentions の source_id、王座の喪失大会と次の獲得大会（ce39dce・8d375de、2026-10-25）。どの規則も今のデータでは違反 0。別名の重複は pytest（CSV 段階）で検査
- [x] T.69.7 検証エラーに CSV のファイル・行・主キーを出す（6f999fc・040576e、2026-10-25）。エラー文の末尾に `[data-src/bouts.csv:27, bout_id=…]`。JSON と CSV の並びが一致する 14 表で、同じ位置の ID が一致するときだけ行番号を付ける。README は 6864dca
