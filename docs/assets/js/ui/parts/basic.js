import { escapeHtml } from "../html.js";

/**
 * 各セクションが共有する基本の HTML 部品 (バッジ・定義リスト・折りたたみ・セクション・グリッド)。
 * 状態も DOM も repo も持たず、文字列だけを返す純関数。
 *
 * - 外部由来の文字列は必ず escapeHtml を通す。「組み立て済み HTML」を受け取る引数 (innerHtml 等) は
 *   二重エスケープを避けるため通さない (呼び出し側が安全な HTML を渡す契約)。
 */

export function badge(label, kind = "") {
  if (label === null || label === undefined || label === "") return "";
  return `<span class="badge${kind ? ` badge-${escapeHtml(kind)}` : ""}">${escapeHtml(label)}</span>`;
}

export function badges(items) {
  const html = items.filter(Boolean).join("");
  return html ? `<div class="badges">${html}</div>` : "";
}

/** 定義リスト。値が空の行は省く。value は組み立て済み HTML。 */
export function dl(rows, className = "") {
  const present = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (present.length === 0) return "";
  const cls = className ? ` ${escapeHtml(className)}` : "";
  return `<dl class="dl${cls}">${present.map(([l, v]) => `<div class="dl-row"><dt>${escapeHtml(l)}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
}

/** 「詳細」折りたたみ (定義リスト入り)。内容が無ければ出さない。 */
export function details(rows, label = "詳細", { open = false } = {}) {
  const content = dl(rows);
  if (!content) return "";
  return `<details class="fold fold-details"${open ? " open" : ""}><summary>${escapeHtml(label)}</summary>${content}</details>`;
}

/** 任意 HTML の折りたたみ */
export function fold(label, innerHtml, { open = false, className = "", count = "" } = {}) {
  if (!innerHtml) return "";
  const cls = className ? ` ${escapeHtml(className)}` : "";
  const meta = count ? ` <span class="fold-count">${escapeHtml(count)}</span>` : "";
  return `<details class="fold${cls}"${open ? " open" : ""}><summary>${escapeHtml(label)}${meta}</summary><div class="fold-body">${innerHtml}</div></details>`;
}

/** 見出し付きセクション。内容が無ければ出さない。 */
export function section(title, innerHtml, className = "") {
  if (!innerHtml) return "";
  const cls = className ? ` ${escapeHtml(className)}` : "";
  return `<section class="sec${cls}"><h3 class="sec-title">${escapeHtml(title)}</h3>${innerHtml}</section>`;
}

/** 入れ子アイテムのグリッド */
export function grid(itemsHtml) {
  return itemsHtml ? `<div class="grid">${itemsHtml}</div>` : "";
}

export function item(innerHtml, className = "") {
  return `<div class="item${className ? ` ${escapeHtml(className)}` : ""}">${innerHtml}</div>`;
}

/** 本文テキストの折りたたみ (改行保持) */
export function textFold(label, text, options = {}) {
  if (!text) return "";
  return fold(label, `<pre class="pre">${escapeHtml(text)}</pre>`, options);
}
