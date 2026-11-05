/**
 * 行カーソルの移動先の計算 (RecordList から切り出した純関数。DOM を持たないので Node でテストできる)。
 * isCursorable(index) が false の行 (見出し行) はカーソルが飛ばす。
 */

/**
 * j/k の移動先。カーソルが無い (-1) ときは、下へなら先頭、上へなら末尾から探す。
 * 動ける行が無い (空の一覧・端に着いた) ときは null を返す (カーソルを動かさない)。
 */
export function nextCursor(cursor, delta, total, isCursorable) {
  if (total === 0) return null;
  let next = cursor === -1 ? (delta > 0 ? 0 : total - 1) : cursor + delta;
  while (next >= 0 && next < total && !isCursorable(next)) next += delta > 0 ? 1 : -1;
  if (next < 0 || next >= total) return null;
  return next;
}

/**
 * g/G の移動先 (edge は "first" か "last")。カーソルを置ける行が無いと範囲外の添字を返すことがあり、
 * 呼び出し側 (setCursor) が clampIndex で丸める。
 */
export function edgeCursor(edge, total, isCursorable) {
  let index = edge === "first" ? 0 : total - 1;
  while (index >= 0 && index < total && !isCursorable(index)) index += edge === "first" ? 1 : -1;
  return index;
}

/** 添字を 0〜total-1 に丸める。 */
export function clampIndex(i, total) {
  return Math.max(0, Math.min(i, total - 1));
}
