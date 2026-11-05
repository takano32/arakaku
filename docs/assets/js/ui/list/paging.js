/**
 * 段階描画の件数と状態行の判断 (RecordList から切り出した純関数。DOM を持たないので Node でテストできる)。
 */

/** 最初に描く件数 (setItems)。 */
export function initialCount(total, chunk) {
  return Math.min(chunk, total);
}

/** refresh() で描いておく件数。描画済み件数 (最低 chunk) を保ち、一覧の件数を超えない。 */
export function refreshTarget(rendered, chunk, total) {
  return Math.min(Math.max(rendered, chunk), total);
}

/** 描画済みの行のキー列が、新しい items の先頭 target 件のキー列と同じか (同じなら行ごとの差分更新で済む)。 */
export function keysUnchanged(rows, items, keyOf, target) {
  return rows.length === target && rows.every((row, i) => row.key === keyOf(items[i]));
}

/** renderMore(n) で描き終える位置 (この値が rendered 以下なら足す行は無い)。 */
export function nextEnd(rendered, n, total) {
  return Math.min(total, rendered + n);
}

/**
 * 状態行 (0 件のときだけ出す) の中身。hidden のときは text・isLoading を使わない (前の表示のまま隠す)。
 * @returns {{ hidden: boolean, text?: string, isLoading?: boolean }}
 */
export function statusText({ count, loading, emptyMessage }) {
  if (count !== 0) return { hidden: true };
  return { hidden: false, text: loading ? "読み込み中…" : emptyMessage, isLoading: loading };
}

/** 「さらに表示」ボタンの文言 (remaining が 1 以上のときだけ使う)。 */
export function moreLabel(remaining) {
  return `さらに表示（残り ${remaining} 件）`;
}
