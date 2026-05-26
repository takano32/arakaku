from __future__ import annotations
from arakaku_utils import DATA_SRC, read_csv, write_csv
import sys

def sort_key_date(row: dict[str, str], field: str) -> str:
    # Use '9999-12-31' for empty dates to put them at the end of ascending sort
    # Wait, the user wants "古いものが先頭で新しいものが交尾" (Oldest -> Newest).
    # If a date is unknown, it's safer to put it at the beginning (treated as "oldest") 
    # OR at the end if it's considered "to be determined".
    # Usually, unknown dates are pushed to the end in chronological logs.
    # Let's use a very late date for empty ones so they appear at the end of the CSV.
    val = row.get(field, "")
    if not val:
        return "0000-00-00" # Put empty dates at the beginning (oldest)
    return val

def reorder_csvs():
    # 1. Articles
    articles = read_csv(DATA_SRC / "articles.csv")
    if articles:
        articles.sort(key=lambda x: sort_key_date(x, "published_at"))
        write_csv(DATA_SRC / "articles.csv", list(articles[0].keys()), articles)

    # 2. Events
    events = read_csv(DATA_SRC / "events.csv")
    if events:
        events.sort(key=lambda x: (sort_key_date(x, "published_at") or sort_key_date(x, "event_date"), x["event_id"]))
        write_csv(DATA_SRC / "events.csv", list(events[0].keys()), events)
    
    event_date_map = {e["event_id"]: (sort_key_date(e, "published_at") or sort_key_date(e, "event_date")) for e in events}

    # 3. Bouts
    bouts = read_csv(DATA_SRC / "bouts.csv")
    if bouts:
        def bout_sort_key(b):
            event_date = event_date_map.get(b["event_id"], "0000-00-00")
            order = b.get("bout_order", "0")
            try:
                order_int = int(order)
            except ValueError:
                order_int = 0
            return (event_date, b["event_id"], order_int)
        
        bouts.sort(key=bout_sort_key)
        write_csv(DATA_SRC / "bouts.csv", list(bouts[0].keys()), bouts)

    # 4. Videos
    videos = read_csv(DATA_SRC / "videos.csv")
    if videos:
        videos.sort(key=lambda x: sort_key_date(x, "published_at"))
        write_csv(DATA_SRC / "videos.csv", list(videos[0].keys()), videos)

    # 5. Source Documents
    docs = read_csv(DATA_SRC / "source_documents.csv")
    if docs:
        docs.sort(key=lambda x: sort_key_date(x, "published_at"))
        write_csv(DATA_SRC / "source_documents.csv", list(docs[0].keys()), docs)

    # 6. Title Reigns
    reigns = read_csv(DATA_SRC / "title_reigns.csv")
    if reigns:
        def reign_sort_key(r):
            tid = r["title_id"]
            order = r.get("reign_order", "0")
            try:
                order_int = int(order)
            except ValueError:
                order_int = 0
            return (tid, order_int)
        
        reigns.sort(key=reign_sort_key)
        write_csv(DATA_SRC / "title_reigns.csv", list(reigns[0].keys()), reigns)

if __name__ == "__main__":
    reorder_csvs()
