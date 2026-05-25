import os
import csv
from pathlib import Path
from numbers_parser import Document
from arakaku_utils import DATA_SRC, safe_slug, read_csv

def main():
    numbers_path = Path("data-raw/アラカク選手名鑑.numbers")
    output_path = DATA_SRC / "fighters_from_numbers.csv"
    
    if not numbers_path.exists():
        print(f"[error] {numbers_path} not found.")
        return

    # 既存のfighters.csvから名前->IDのマッピングを作成
    existing_fighters = read_csv(DATA_SRC / "fighters.csv")
    name_to_id = {f["display_name"]: f["fighter_id"] for f in existing_fighters if f.get("display_name") and f.get("fighter_id")}

    doc = Document(str(numbers_path))
    sheet = doc.sheets[0]
    table = sheet.tables[0]
    
    rows = list(table.rows())
    if len(rows) < 2:
        print("[error] No data found in the Numbers file.")
        return

    # 1行目がヘッダ（'白グローブ出場回数', '優勝', ... '名前', '階級', ...）
    header = [str(cell.value) if cell.value is not None else "" for cell in rows[1]]
    
    try:
        name_idx = header.index("名前")
        division_idx = header.index("階級")
        copy_idx = header.index("キャッチコピー")
        promotion_idx = header.index("主戦団体")
        age_idx = header.index("年齢")
        height_idx = header.index("身長")
        gym_idx = header.index("所属")
        remarks_idx = header.index("備考")
    except ValueError as e:
        print(f"[error] Missing required column in Numbers: {e}")
        return

    # 団体名の変換マップ
    promotion_map = {
        "ターゲット": "target",
        "エンペラー": "emperor",
        "ジャパンファイト": "japan_fight",
        "コミックファイト": "comic_fight",
        "mh": "mh",
    }

    out_rows = []
    # 2行目以降がデータ
    for r_idx, row in enumerate(rows[2:]):
        values = [str(cell.value) if cell.value is not None else "" for cell in row]
        if len(values) <= name_idx:
            continue
            
        name = values[name_idx].strip()
        if not name:
            continue
            
        # 既存のIDがあればそれを使う。なければ生成。
        if name in name_to_id:
            fighter_id = name_to_id[name]
        else:
            fighter_id = safe_slug(name).lower()
            if not fighter_id:
                # 日本語のみの場合は名前をそのまま使う（スペース置換）
                fighter_id = name.replace(" ", "_").replace("　", "_")
        
        promotion_raw = values[promotion_idx].strip()
        promotion_id = promotion_map.get(promotion_raw, promotion_raw.lower())

        summary = values[copy_idx].strip()
        remarks = values[remarks_idx].strip()
        if remarks:
            if summary:
                summary = f"{summary}\n\n{remarks}"
            else:
                summary = remarks

        out_rows.append({
            "fighter_id": fighter_id,
            "display_name": name,
            "main_division": values[division_idx].strip(),
            "main_promotion_id": promotion_id,
            "height": values[height_idx].strip(),
            "age": values[age_idx].strip().split(".")[0], # 30.0 -> 30
            "gym": values[gym_idx].strip(),
            "summary": summary,
            "inferred_confidence": "numbers", # ソース元を明示
        })

    fieldnames = [
        "fighter_id", "display_name", "main_division", "main_promotion_id",
        "height", "age", "gym", "summary", "inferred_confidence"
    ]
    
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(out_rows)
        
    print(f"[info] Generated {output_path} with {len(out_rows)} rows.")

if __name__ == "__main__":
    main()
