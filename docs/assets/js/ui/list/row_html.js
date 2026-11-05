import { escapeHtml } from "../html.js";

/**
 * 一覧の行の HTML の部品 (RecordList から切り出した純関数。DOM を持たないので Node でテストできる)。
 */

/** レコード行の枠 (見出し部 .rec-main と本体部 .rec-body は空のまま。中身は RecordList が入れる)。 */
export function rowShellHtml() {
  return `
      <div class="rec-head">
        <div class="rec-main"></div>
        <button type="button" class="rec-toggle" aria-expanded="false" aria-label="詳細を開く"><span class="chev" aria-hidden="true"></span></button>
      </div>
      <div class="rec-body" hidden></div>
    `;
}

/** 開閉ボタンの aria-label。どの行の開閉かが分かるよう、行の見出し (title) があれば含める (T102)。 */
export function toggleLabel(open, title) {
  return `${open ? "詳細を閉じる" : "詳細を開く"}${title ? `: ${title}` : ""}`;
}

/** 行の描画に失敗したときに代わりに出す HTML。 */
export function renderErrorHtml(message) {
  return `<p class="render-error">描画エラー: ${escapeHtml(message)}</p>`;
}

/** fn(item) の HTML を返す。例外はコンソールに出し、エラーの HTML に置き換える (一覧の描画は続ける)。 */
export function safeRender(fn, item, what) {
  try {
    return fn(item);
  } catch (err) {
    console.error(`RecordList: ${what} failed`, err, item);
    return renderErrorHtml(err.message);
  }
}
