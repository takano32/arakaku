# T.38 validate_json.js の load() 網羅チェックを実効化

- 状態: 完了
- 期間: 2026-10-24

`scripts/validate_json.js` は Node 上で `DataLoader.load()` を実行し、`CORE_DATA_KEYS` の全キーが `loadedDataKeys` に入ることを assert している。しかしストリーミング（`#streamKey`）のキーは、Node の `fetch()` がローカルのファイルパスを解釈できないため常にエラー経路（代替データで読み込み済み扱い）に落ちる。そのためこの assert は Phase 0 の 2 キー（`officialPages` / `officialNews`）以外を実質検証しておらず、ストリーミング経路が壊れていても通ってしまう（2026-06-13 の敵対的レビューで発見）。

案:

- `#streamKey` にも `fetchText` の注入を通すか、Node 実行時にローカルパスを `file://` URL に変換する
- または `load()` の検証を、キーの網羅ではなく `loadAll()` ベースの実データ検証に寄せる

完了条件: ストリーミング経路を意図的に壊すと `validate_json.js` が失敗する。

2026-10-24 に再現: Node で `load()` を実行すると、ストリーミングで読む 24 キーすべてが `dataLoadErrors` に入り、中身は空配列だった。

- [x] T.38.1 `DataLoader` に `fetchResponse`（既定は `fetch`）を注入できるようにし、`#streamKey` がそれを使う（e48d750, 2026-10-24）
- [x] T.38.2 `validate_json.js` でローカルファイルを `Response` として返す関数を渡し、`load()` 後に `dataLoadErrors` が空であることと、全キーの中身がファイルと一致することを確かめる（e48d750, 2026-10-24）
  - SAX パーサ（`@streamparser/json`）は CDN から読むブラウザ専用なので、Node では JSON.parse に切り替わる経路を通る。SAX 部分はブラウザでの確認（T.37）に任せる
- [x] T.38.3 ストリーミング経路を壊すと失敗することを確かめる
  - 失敗した（検出できた）: 注入前の `fetch(path)` に戻す / 読んだ JSON を捨てる / `response.ok` の判定を逆にする / PRIMARY の 1 キーを読み落とす
  - 通ってしまった（検出できない）: SAX 経路の確定値（`accumulated`）を捨てる。Node では SAX パーサが無く通らない経路のため
  - 2026-10-24 にユーザーが決定: SAX 経路はブラウザでの確認（T.37）に任せ、代わりのパーサや npm 依存は足さない
