# T.103 取得スクリプトが失敗しても成功を返す

- 状態: 完了
- 期間: 2026-10-25

T.88 の洗い出しで登録。

`crawl_note_articles.py` は API の取得失敗・不正な JSON で終端扱いにして 0 を返す。`cache_note_html.py` は常に 0。新しい記事の取得に失敗すると generate_articles が articles.csv から黙って落とす。逆に `cache_youtube_api.py` は削除された動画が 1 本でもあると 1 を返し refresh-sources が止まり続ける。

- [x] T.103.1 失敗を終了コードで返し、YouTube は削除済みを許す選択肢を足す（43def54・2790d6e・e076297、2026-10-25）。404・410 は今までどおり止めずに数える
