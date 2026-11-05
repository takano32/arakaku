import { clampIndex, edgeCursor, nextCursor } from "./cursor.js";
import { OpenState } from "./open_state.js";
import { initialCount, keysUnchanged, moreLabel, nextEnd, refreshTarget, statusText } from "./paging.js";
import { rowShellHtml, safeRender, toggleLabel } from "./row_html.js";

/** 行の見出し部のクリックでも開閉しない操作要素 (リンク・ボタン・フォーム部品など)。 */
const INTERACTIVE_SELECTOR = "a, button, summary, input, select, textarea, label";

/**
 * RecordList — 段階的に描画する一覧 (レコード行の開閉・カーソル付き)。
 *
 * 一覧全体を一度に DOM にせず、最初は chunk 件だけ描き、末尾の番兵が画面に入るたびに
 * 次の chunk を足す (IntersectionObserver。無い環境では「さらに表示」ボタンだけ)。
 * 行の本体 (body) は開いたときに初めて描画するので、動画や出典候補の HTML を作るのは必要な行だけになる。
 *
 * descriptor:
 *   items        表示する配列
 *   keyOf(item)  行の安定キー (ID)。開閉状態・差分描画・カーソルの基準
 *   isHeader?(item)   true なら見出し行 (開閉・カーソル対象外)
 *   renderHead(item)  行の見出し部 (常に表示) の HTML
 *   renderBody(item)  行の本体 (開いたときだけ) の HTML
 *   defaultOpen?(item) 明示的に開閉していない行の初期状態
 *   rowClass?(item)   行に足すクラス
 *
 * refresh() はデータ更新用: 描画済み件数とカーソルを保ち、各行の HTML が変わったときだけ差し替える
 * (開いた <details> やフォーカスを保つ)。setItems() はタブ切替用で先頭から描き直す。
 *
 * DOM を持つのはこのクラスだけ。件数・状態行 (paging.js)、カーソルの移動先 (cursor.js)、開閉の記憶 (open_state.js)、
 * 行の HTML (row_html.js) の判断は同じディレクトリの純粋なモジュールにある。
 */
export class RecordList {
  #el;
  #rowsEl;
  #statusEl;
  #moreEl;
  #moreButton;
  #observer = null;
  #items = [];
  #desc = null;
  #chunk;
  #rendered = 0;
  #rows = []; // index → { key, el, head, body, open }
  #openState = new OpenState(); // 明示的に開閉した行の記憶
  #cursor = -1;
  #loading = false;
  #emptyMessage = "該当するレコードがありません。";

  constructor({ chunk = 30 } = {}) {
    this.#chunk = chunk;
    this.#el = document.createElement("div");
    this.#el.className = "list";

    this.#rowsEl = document.createElement("div");
    this.#rowsEl.className = "list-rows";

    this.#statusEl = document.createElement("p");
    this.#statusEl.className = "list-status";
    this.#statusEl.hidden = true;

    this.#moreEl = document.createElement("div");
    this.#moreEl.className = "list-more";
    this.#moreEl.hidden = true;
    this.#moreButton = document.createElement("button");
    this.#moreButton.type = "button";
    this.#moreButton.className = "list-more-button";
    this.#moreButton.addEventListener("click", () => this.renderMore());
    this.#moreEl.appendChild(this.#moreButton);

    this.#el.append(this.#statusEl, this.#rowsEl, this.#moreEl);

    this.#rowsEl.addEventListener("click", (event) => this.#onRowsClick(event));

    if (typeof IntersectionObserver !== "undefined") {
      this.#observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) this.renderMore();
      }, { rootMargin: "600px 0px" });
      this.#observer.observe(this.#moreEl);
    }
  }

  get el() { return this.#el; }

  setStatus({ loading = this.#loading, emptyMessage = this.#emptyMessage } = {}) {
    this.#loading = loading;
    this.#emptyMessage = emptyMessage;
    this.#paintStatus();
  }

  /** タブ切替・初回: 先頭から描き直す (開閉の記憶は保つ) */
  setItems(desc) {
    this.#desc = desc;
    this.#items = desc.items;
    this.#rendered = initialCount(this.#items.length, this.#chunk);
    this.#cursor = -1;
    this.#rowsEl.replaceChildren();
    this.#rows = [];
    for (let i = 0; i < this.#rendered; i++) this.#rowsEl.appendChild(this.#buildRow(i));
    this.#paintStatus();
  }

  /** データ・絞り込みの更新: 描画済み件数とカーソルを保ち、変わった行だけ差し替える */
  refresh(desc) {
    if (!this.#desc) {
      this.setItems(desc);
      return;
    }
    this.#desc = desc;
    this.#items = desc.items;
    const target = refreshTarget(this.#rendered, this.#chunk, this.#items.length);
    const sameKeys = keysUnchanged(this.#rows, this.#items, desc.keyOf, target);
    if (!sameKeys) {
      this.#rowsEl.replaceChildren();
      this.#rows = [];
      for (let i = 0; i < target; i++) this.#rowsEl.appendChild(this.#buildRow(i));
      this.#rendered = target;
      if (this.#cursor >= this.#rendered) this.#cursor = -1;
      this.#paintStatus();
      return;
    }
    for (let i = 0; i < target; i++) this.#updateRow(i);
    this.#rendered = target;
    this.#paintStatus();
  }

  renderMore(n = this.#chunk) {
    const end = nextEnd(this.#rendered, n, this.#items.length);
    if (end <= this.#rendered) return;
    const frag = document.createDocumentFragment();
    for (let i = this.#rendered; i < end; i++) frag.appendChild(this.#buildRow(i));
    this.#rowsEl.appendChild(frag);
    this.#rendered = end;
    this.#paintStatus();
  }

  renderAll() {
    this.renderMore(this.#items.length);
  }

  // ── 開閉 ───────────────────────────────────────────────────────────

  isOpen(index) {
    const item = this.#items[index];
    return this.#openState.isOpen(this.#desc.keyOf(item), () => this.#defaultOpen(item));
  }

  toggle(index, force) {
    const item = this.#items[index];
    if (!item || this.#desc.isHeader?.(item)) return false;
    const next = this.#openState.toggle(this.#desc.keyOf(item), () => this.#defaultOpen(item), force);
    const row = this.#rows[index];
    if (row) this.#applyOpen(row, index, next);
    return next;
  }

  #defaultOpen(item) {
    return Boolean(this.#desc.defaultOpen?.(item));
  }

  /** 指定キーの行を開く (フォーカス表示などで使う) */
  openByKey(key) {
    this.#openState.set(key, true);
    const index = this.#rows.findIndex((r) => r.key === key);
    if (index >= 0) this.#applyOpen(this.#rows[index], index, true);
  }

  // ── カーソル (キーボード操作) ───────────────────────────────────────

  #isCursorable(index) {
    const item = this.#items[index];
    return item != null && !this.#desc?.isHeader?.(item);
  }

  moveCursor(delta) {
    const next = nextCursor(this.#cursor, delta, this.#items.length, (i) => this.#isCursorable(i));
    if (next === null) return;
    this.setCursor(next);
  }

  setCursorToEdge(edge) {
    if (this.#items.length === 0) return;
    if (edge === "last") this.renderAll();
    this.setCursor(edgeCursor(edge, this.#items.length, (i) => this.#isCursorable(i)));
  }

  setCursor(index) {
    const clamped = clampIndex(index, this.#items.length);
    while (this.#rendered <= clamped) this.renderMore();
    this.#cursor = clamped;
    this.#rows.forEach((row, i) => row.el.classList.toggle("rec-cursor", i === clamped));
    // 行そのものにフォーカスを移し、支援技術にもカーソル位置を伝える (行はボタンではないので Enter / Space は奪わない)。
    const el = this.#rows[clamped]?.el;
    if (el) {
      el.tabIndex = -1;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "nearest" });
    }
  }

  getCursorEl() {
    return this.#rows[this.#cursor]?.el ?? null;
  }

  toggleCursor() {
    if (this.#cursor < 0) return;
    this.toggle(this.#cursor);
  }

  // ── 内部 ───────────────────────────────────────────────────────────

  #paintStatus() {
    const status = statusText({ count: this.#items.length, loading: this.#loading, emptyMessage: this.#emptyMessage });
    if (!status.hidden) {
      this.#statusEl.textContent = status.text;
      this.#statusEl.classList.toggle("is-loading", status.isLoading);
    }
    this.#statusEl.hidden = status.hidden;
    const remaining = this.#items.length - this.#rendered;
    this.#moreEl.hidden = remaining <= 0;
    if (remaining > 0) this.#moreButton.textContent = moreLabel(remaining);
  }

  #buildRow(index) {
    const item = this.#items[index];
    const key = this.#desc.keyOf(item);
    const el = document.createElement("article");
    if (this.#desc.isHeader?.(item)) {
      el.className = "list-heading";
      el.innerHTML = safeRender(this.#desc.renderHead, item, "renderHead");
      const row = { key, el, head: el.innerHTML, body: "", open: false, header: true };
      this.#rows[index] = row;
      return el;
    }
    el.className = `rec ${this.#desc.rowClass?.(item) ?? ""}`.trim();
    el.dataset.key = key;
    el.dataset.index = String(index);
    el.innerHTML = rowShellHtml();
    const row = { key, el, head: "", body: "", open: false, header: false };
    this.#rows[index] = row;
    row.head = safeRender(this.#desc.renderHead, item, "renderHead");
    el.querySelector(".rec-main").innerHTML = row.head;
    if (index === this.#cursor) el.classList.add("rec-cursor");
    this.#applyOpen(row, index, this.isOpen(index));
    return el;
  }

  #updateRow(index) {
    const row = this.#rows[index];
    const item = this.#items[index];
    if (row.header) {
      const head = safeRender(this.#desc.renderHead, item, "renderHead");
      if (head !== row.head) { row.el.innerHTML = head; row.head = head; }
      return;
    }
    row.el.dataset.index = String(index);
    const head = safeRender(this.#desc.renderHead, item, "renderHead");
    if (head !== row.head) {
      row.el.querySelector(".rec-main").innerHTML = head;
      row.head = head;
    }
    const open = this.isOpen(index);
    if (open) {
      const body = safeRender(this.#desc.renderBody, item, "renderBody");
      if (!row.open || body !== row.body) {
        row.el.querySelector(".rec-body").innerHTML = body;
        row.body = body;
      }
    }
    if (open !== row.open) this.#applyOpen(row, index, open);
  }

  #applyOpen(row, index, open) {
    const bodyEl = row.el.querySelector(".rec-body");
    const toggle = row.el.querySelector(".rec-toggle");
    if (open && (!row.open || !row.body)) {
      row.body = safeRender(this.#desc.renderBody, this.#items[index], "renderBody");
      bodyEl.innerHTML = row.body;
    }
    row.open = open;
    bodyEl.hidden = !open;
    row.el.classList.toggle("rec-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    // どの行の開閉かが分かるよう、ラベルに行の見出しを含める (T.102)。
    const title = row.el.querySelector(".rec-title")?.textContent.trim();
    toggle.setAttribute("aria-label", toggleLabel(open, title));
  }

  // 行の見出し部 (rec-head) のクリックで開閉する。リンク・ボタン等の操作要素や本体部のクリック、
  // テキスト選択中のクリックは開閉しない。
  #onRowsClick(event) {
    const rec = event.target.closest(".rec");
    if (!rec || !this.#rowsEl.contains(rec)) return;
    const head = event.target.closest(".rec-head");
    if (!head || head.parentElement !== rec) return;
    const onToggle = Boolean(event.target.closest(".rec-toggle"));
    if (!onToggle && event.target.closest(INTERACTIVE_SELECTOR)) return;
    if (!onToggle && window.getSelection?.()?.toString()) return;
    const index = Number(rec.dataset.index);
    if (!Number.isInteger(index)) return;
    this.toggle(index);
    // クリックした行をキーボード操作の起点にする (枠はキーボードで動かしたときだけ付ける)
    this.#cursor = index;
    for (const row of this.#rows) row.el.classList.remove("rec-cursor");
  }
}
