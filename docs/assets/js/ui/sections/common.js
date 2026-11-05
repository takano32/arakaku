import { escapeHtml } from "../html.js";

/**
 * セクション共通の小さなヘルパ。
 */

/** ID などを <code> で出す。空なら何も出さない (定義リストの行ごと省かれる)。 */
export const code = (v) => (v ? `<code>${escapeHtml(v)}</code>` : "");

// focus (特定 ID へのジャンプ) 中はその 1 件だけを返し、未設定時のみ通常の絞り込み一覧を返す。
export function focusedOrFiltered(focusedId, findRecord, records, predicate) {
  return focusedId ? [findRecord(focusedId)].filter(Boolean) : records.filter(predicate);
}
