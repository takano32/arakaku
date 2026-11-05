import { escapeHtml } from "../html.js";

/**
 * 一覧の上の見出し (#toolbar): セクション名 + 件数、飛び先 (選手・大会・試合) のチップ、読み込み中の表示。
 * HTML を作る関数は純粋で、ToolbarRenderer が DOM に当てる。チップの ✕ (#focus-clear) のクリックは ui/shell.js。
 */

export function focusChipLabel(state, repo) {
  if (state.focusFighterId) return `選手: ${repo.fighterName(state.focusFighterId)}`;
  if (state.focusEventId) return `大会: ${repo.eventName(state.focusEventId)}`;
  if (state.focusBoutId) return `試合: ${repo.findRichBout(state.focusBoutId)?.matchup ?? state.focusBoutId}`;
  return "";
}

export function focusChipHtml(label) {
  if (!label) return "";
  return `<span class="focus-chip">${escapeHtml(label)}<button type="button" id="focus-clear" class="focus-clear" aria-label="絞り込みを解除">✕</button></span>`;
}

/** 見出し部の HTML。count が負なら件数は出さない (一覧がまだ描けていない)。chipHtml は組み立て済み HTML。 */
export function toolbarMainHtml(sectionLabel, count, chipHtml) {
  return `
      <h1 class="section-title" tabindex="-1">${escapeHtml(sectionLabel ?? "")}<span class="section-count">${count >= 0 ? `${escapeHtml(count)} 件` : ""}</span></h1>
      ${chipHtml}
    `;
}

export class ToolbarRenderer {
  #el;

  constructor(el = document.querySelector("#toolbar")) {
    this.#el = el;
  }

  /**
   * @param {{ state: object, repo: object, section: object|undefined, count: number }} view
   *   count は一覧の件数 (見出し行を除く)。まだ描けていなければ -1。
   */
  render({ state, repo, section, count }) {
    const el = this.#el;
    if (!el) return;
    const loading = state.loadingDataKeys.size;
    const loadedCount = state.loadedDataKeys.size;
    // 分母は取得済み + 取得中 (DATA_FILES 全体ではない: タブ専用データや viewer が読まないファイルがある)。
    const total = loadedCount + loading;
    // 見出しと絞り込みチップは中身が変わったときだけ描き直し、読み込み件数は別の要素の文字だけ更新する
    // (件数が変わるたびに全体を描き直すと、チップの ✕ にあるキーボードフォーカスが消えていた。T.102)。
    const main = toolbarMainHtml(section?.label, count, focusChipHtml(focusChipLabel(state, repo)));
    let mainEl = el.querySelector(".toolbar-main");
    let indicator = el.querySelector(".loading-indicator");
    if (!mainEl) {
      el.innerHTML = `<div class="toolbar-main"></div><span class="loading-indicator" hidden></span>`;
      mainEl = el.querySelector(".toolbar-main");
      indicator = el.querySelector(".loading-indicator");
    }
    if (mainEl.innerHTML !== main) mainEl.innerHTML = main;
    indicator.hidden = !loading;
    indicator.textContent = loading ? `読み込み中 ${loadedCount}/${total}` : "";
  }
}
