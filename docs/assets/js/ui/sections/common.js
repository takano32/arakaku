/**
 * セクション共通の小さなヘルパ。
 */

// focus (特定 ID へのジャンプ) 中はその 1 件だけを返し、未設定時のみ通常の絞り込み一覧を返す。
export function focusedOrFiltered(focusedId, findRecord, records, predicate) {
  return focusedId ? [findRecord(focusedId)].filter(Boolean) : records.filter(predicate);
}
