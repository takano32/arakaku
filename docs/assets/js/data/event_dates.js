/**
 * 大会の日付の規則 (純関数)。
 * 大会の日付は、結果 note の投稿日 (result_published_at)、無ければその大会の note の最初の投稿日
 * (note_published_at。対戦カードだけの大会)、無ければ公開日 (published_at)。
 * reorder_data.py の大会の並びと同じ規則 (T102)。
 */

/** 並び替え用の日付文字列。無ければ "" (名鑑のみの大会など)。 */
export function eventSortDate(event) {
  return String(event?.result_published_at || event?.note_published_at || event?.published_at || "");
}

/** 一覧に出す日付の表記 (「結果 2025-04-29」「カード 2025-04-20」、公開日のみ、または "")。 */
export function eventDateLabel(event) {
  if (event?.result_published_at) return `結果 ${event.result_published_at}`;
  if (event?.note_published_at) return `カード ${event.note_published_at}`;
  return event?.published_at || "";
}
