from __future__ import annotations
# 役割: 主要な data-src CSV（articles / events / bouts / videos / source_documents /
#       title_reigns）を時系列＋安定タイ・ブレイクで並べ替え、その場で上書き保存する。
#       決定的な行順を保証し、再生成時の git diff を小さく保つための整列パス。
#       並べ替えキーは arakaku/derive/ordering.py にあり、ここは読み書きだけをする。
# アーキ上の位置: generate-stage1 の最後で実行（Makefile の reorder-data ターゲット）。
#       事実データは一切変更せず行の並びだけを変える。bouts は events の日付に依存するため、
#       events を整列して作る event_date_map を使う＝events より後に並べる必要がある。
# 不変条件: 列順は read_csv 直後の既存ヘッダ（list(rows[0].keys())）を再利用し、列の
#       追加・削除・改名は行わない。空日付は "0000-00-00" 扱いで先頭（最古）に寄せる。
#       タイ・ブレイクに主キー/順序列を足して並びを決定的にしている（同点でも順序が揺れない）。
# 関連スキル: .agents/skills/arakaku-sorting-strategy
from arakaku.derive.ordering import bout_sort_key, event_sort_date, reign_sort_key, sort_key_date
from arakaku.event_dates import event_note_dates
from arakaku.io import read_csv, write_csv
from arakaku.paths import DATA_SRC

def reorder_csvs():
    # 1. Articles
    articles = read_csv(DATA_SRC / "articles.csv")
    if articles:
        articles.sort(key=lambda x: (sort_key_date(x, "published_at"), x["article_id"]))
        write_csv(DATA_SRC / "articles.csv", list(articles[0].keys()), articles)

    # 2. Events
    # 大会の日付は CSV に無いので、結果 note の投稿日 (events.json の result_published_at と同じ規則)、
    # 無ければその大会の note のいちばん早い投稿日 (対戦カードだけの大会)、それも無ければ published_at で並べる (T.77)。
    result_dates, note_dates = event_note_dates(articles, read_csv(DATA_SRC / "article_links.csv"))

    def event_date(e: dict[str, str]) -> str:
        return event_sort_date(e, result_dates, note_dates)

    events = read_csv(DATA_SRC / "events.csv")
    if events:
        events.sort(key=lambda x: (event_date(x), x["event_id"]))
        write_csv(DATA_SRC / "events.csv", list(events[0].keys()), events)

    # bouts はイベント日付で並べたいが bouts.csv 自体に日付列が無いので、
    # 整列済み events から event_id→日付の対応表を作って引く。
    event_date_map = {e["event_id"]: event_date(e) for e in events}

    # 3. Bouts
    bouts = read_csv(DATA_SRC / "bouts.csv")
    if bouts:
        # (イベント日付, event_id, bout_order) の三段ソートで同一イベント内の試合順も安定させる。
        bouts.sort(key=lambda b: bout_sort_key(b, event_date_map))
        write_csv(DATA_SRC / "bouts.csv", list(bouts[0].keys()), bouts)

    # 4. Videos
    videos = read_csv(DATA_SRC / "videos.csv")
    if videos:
        # 公開日は videos.csv に無い (T.75) ので archives/youtube.csv の upload_date で並べる (T.102)。
        uploaded = {r["display_id"]: r.get("upload_date", "") for r in read_csv(DATA_SRC / "archives/youtube.csv")}
        videos.sort(key=lambda x: (uploaded.get(x["platform_video_id"]) or "00000000", x["video_id"]))
        write_csv(DATA_SRC / "videos.csv", list(videos[0].keys()), videos)

    # 5. Source Documents
    docs = read_csv(DATA_SRC / "source_documents.csv")
    if docs:
        docs.sort(key=lambda x: sort_key_date(x, "published_at"))
        write_csv(DATA_SRC / "source_documents.csv", list(docs[0].keys()), docs)

    # 6. Title Reigns
    reigns = read_csv(DATA_SRC / "title_reigns.csv")
    if reigns:
        reigns.sort(key=reign_sort_key)
        write_csv(DATA_SRC / "title_reigns.csv", list(reigns[0].keys()), reigns)

if __name__ == "__main__":
    reorder_csvs()
