import { DATA_FILES } from "../../config.js";
import { escapeHtml } from "../html.js";

/**
 * データ読み込み失敗の表示 (#alerts)。dataLoadErrors (キー → メッセージ) をファイル名付きで一覧にする。
 * 読み込めなかったデータは空として扱われている旨を添える。
 */

export function alertsHtml(errors) {
  const entries = Object.entries(errors ?? {});
  if (entries.length === 0) return "";
  const items = entries.map(([key, message]) => {
    const fileName = (DATA_FILES[key] ?? key).split("/").pop();
    return `<li><code>${escapeHtml(fileName)}</code> ${escapeHtml(message)}</li>`;
  }).join("");
  return `<div class="alert" role="alert"><p class="alert-title">データ読み込み失敗</p><ul>${items}</ul><p class="small">読み込めなかったデータは空として扱われています。再読み込みしても直らない場合は配信側の問題です。</p></div>`;
}

export class AlertsRenderer {
  #el;

  constructor(el = document.querySelector("#alerts")) {
    this.#el = el;
  }

  render(errors) {
    const el = this.#el;
    if (!el) return;
    const html = alertsHtml(errors);
    if (!html) {
      if (el.childElementCount) el.replaceChildren();
      return;
    }
    if (el.innerHTML !== html) el.innerHTML = html;
  }
}
