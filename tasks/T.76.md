# T.76 王座戦の title_id・title_result が全件空

- 状態: 完了
- 期間: 2026-10-25

T.62 の洗い出しで登録。

王座戦 13 試合すべてで `title_id`・`title_result` が空。T.14.1 で入れた値は 8ec5ed1 で「再現できない」として消された。古い値には誤りもあった（emperor-112・mh-30 は防衛なのに change）。`title_reigns.csv` の mh-middleweight-2（ゼット）は won_at=mh-38 だが該当試合は unknown。

- [x] T.76.1 title_id（団体と階級から決まる）と title_result を入れ直すかをユーザーに確認する（8ec5ed1 の方針を変えることになる）（a8d8777・5f24019、2026-10-25）。2026-10-25 にユーザーが決定: 王座 ID だけ入れる。王座戦 15 試合（T.72・T.86 で増えた分を含む）に「団体-階級」の title_id を入れ、validate_json.py で王座戦の title_id の有無・存在・団体と階級の一致を検査。title_result は title_reigns から導けるので持たない
