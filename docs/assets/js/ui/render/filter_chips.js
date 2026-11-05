import { MENTION_TYPE_ORDER } from "../../config.js";
import { TAB_FILTERS, filterButtons } from "../../data/filters.js";
import { labels } from "../../data/labels.js";
import { escapeHtml, uniqueSorted } from "../html.js";

/**
 * 絞り込み (#filters): タブごとのチップ行 (data/filters.js の TAB_FILTERS) と、出典言及タブの種別セレクト。
 * HTML を作る関数は純粋で、FiltersRenderer が指紋 (タブ・選択値・言及種別の集合) が変わったときだけ DOM に当てる。
 * クリック・change の処理は ui/shell.js (data-filter-type / data-filter-val、#mention-type)。
 */

/** 言及種別の並び: MENTION_TYPE_ORDER の順、それ以外はその後ろに日本語順。重複と空値は除く。 */
export function sortMentionTypes(types) {
  return uniqueSorted(types).sort((a, b) => {
    const orderA = MENTION_TYPE_ORDER.indexOf(a);
    const orderB = MENTION_TYPE_ORDER.indexOf(b);
    if (orderA === -1 && orderB === -1) return String(a).localeCompare(String(b), "ja");
    if (orderA === -1) return 1;
    if (orderB === -1) return -1;
    return orderA - orderB;
  });
}

export function filterRowHtml(group, selected) {
  const buttons = filterButtons(group).map((option) => `
        <button type="button" class="chip${selected === option.value ? " is-active" : ""}" aria-pressed="${selected === option.value ? "true" : "false"}"
                data-filter-type="${escapeHtml(group.type)}" data-filter-val="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>`).join("");
  return `<div class="filter-row"><span class="filter-label">${escapeHtml(group.label)}</span><div class="chips">${buttons}</div></div>`;
}

export function mentionTypeRowHtml(mentionTypes, selected) {
  const options = [`<option value="">すべての言及</option>`, ...mentionTypes.map((t) => `<option value="${escapeHtml(t)}"${t === selected ? " selected" : ""}>${escapeHtml(labels.mentionType(t))} / ${escapeHtml(t)}</option>`)].join("");
  return `<div class="filter-row"><label class="filter-label" for="mention-type">種別</label><select id="mention-type" class="select">${options}</select></div>`;
}

/**
 * タブの絞り込み行 (HTML 文字列の配列)。mentionTypes が配列なら (出典言及タブ) 種別セレクトの行を末尾に足す。
 */
export function filterRows(state, groups, mentionTypes = null) {
  const rows = groups.map((group) => filterRowHtml(group, state[group.stateKey]));
  if (mentionTypes) rows.push(mentionTypeRowHtml(mentionTypes, state.mentionType));
  return rows;
}

export class FiltersRenderer {
  #el;
  #prevKey = "";
  // 言及の種別の一覧 (2,500 件余りを写して並べる) はデータが変わったときだけ作り直す。以前は 1 文字打つたびに
  // 作っていた (T.112.4.22)。
  #mentionTypes = { revision: null, types: [] };

  constructor(el = document.querySelector("#filters")) {
    this.#el = el;
  }

  render(state, repo) {
    const el = this.#el;
    if (!el) return;
    const groups = TAB_FILTERS[state.tab] ?? [];
    const isMentions = state.tab === "mentions";
    const mentionTypes = isMentions ? this.#mentionTypesFor(repo) : [];
    const key = [state.tab, state.mentionType, mentionTypes.join(","), ...groups.map((g) => state[g.stateKey])].join("\0");
    if (key === this.#prevKey) return;
    this.#prevKey = key;
    const rows = filterRows(state, groups, isMentions ? mentionTypes : null);
    el.hidden = rows.length === 0;
    el.innerHTML = rows.join("");
  }

  #mentionTypesFor(repo) {
    if (this.#mentionTypes.revision !== repo.revision) {
      this.#mentionTypes = { revision: repo.revision, types: sortMentionTypes(repo.richSourceMentions.map((m) => m.mention_type)) };
    }
    return this.#mentionTypes.types;
  }
}
