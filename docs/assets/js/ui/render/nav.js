import { ADMIN_TABS, PUBLIC_TABS } from "../../config.js";
import { escapeHtml } from "../html.js";
import { SECTIONS } from "../sections/index.js";

/**
 * サイドバーのナビ (#nav) と document.title。
 * 初回だけ innerHTML を組み、以後はタブが変わったときに aria-current と管理ビュー (details) の開閉だけを更新する。
 * HTML を作る関数は純粋で、NavRenderer が DOM に当てる。
 */

export function navItemHtml(id, label, activeTab) {
  const active = id === activeTab;
  return `<li><a class="nav-link" href="?tab=${escapeHtml(id)}" data-tab="${escapeHtml(id)}"${active ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a></li>`;
}

export function navHtml(activeTab, adminOpen) {
  return `
        <ul class="nav-list nav-public">${PUBLIC_TABS.map(([id, label]) => navItemHtml(id, label, activeTab)).join("")}</ul>
        <details class="nav-admin"${adminOpen ? " open" : ""}>
          <summary class="nav-admin-summary"><span>管理ビュー</span><span class="chev" aria-hidden="true"></span></summary>
          <ul class="nav-list nav-admin-list">${ADMIN_TABS.map(([id, label]) => navItemHtml(id, label, activeTab)).join("")}</ul>
        </details>
      `;
}

export function pageTitle(tab) {
  return `${SECTIONS[tab]?.label ?? "Unofficial ARAKAKU Database"} | Unofficial ARAKAKU Database`;
}

export class NavRenderer {
  #el;
  #prevKey = "";
  #syncing = false;

  constructor(el = document.querySelector("#nav")) {
    this.#el = el;
  }

  /** 管理ビューの開閉をコードから同期している最中か (その toggle イベントをビュー切替と誤認しないため) */
  get syncing() { return this.#syncing; }

  render(state) {
    const nav = this.#el;
    if (!nav) return;
    const key = `${state.tab}`;
    if (this.#prevKey === key && nav.childElementCount > 0) return;
    const admin = state.viewMode === "admin";
    if (nav.childElementCount === 0) {
      nav.innerHTML = navHtml(state.tab, admin);
    } else {
      for (const link of nav.querySelectorAll("a[data-tab]")) {
        if (link.dataset.tab === state.tab) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
      const details = nav.querySelector(".nav-admin");
      if (details && details.open !== admin) {
        this.#syncing = true;
        details.open = admin;
        // toggle イベントは非同期に発火するので、次のタスクまでガードを保つ
        setTimeout(() => { this.#syncing = false; }, 0);
      }
    }
    this.#prevKey = key;
    document.title = pageTitle(state.tab);
  }
}
