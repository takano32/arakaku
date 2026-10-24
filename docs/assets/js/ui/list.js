import { escapeHtml } from "./html.js";

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
  #openState = new Map(); // key → boolean (明示的に開閉した行)
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
  get count() { return this.#items.length; }
  get renderedCount() { return this.#rendered; }
  get cursorIndex() { return this.#cursor; }

  setStatus({ loading = this.#loading, emptyMessage = this.#emptyMessage } = {}) {
    this.#loading = loading;
    this.#emptyMessage = emptyMessage;
    this.#paintStatus();
  }

  /** タブ切替・初回: 先頭から描き直す (開閉の記憶は保つ) */
  setItems(desc) {
    this.#desc = desc;
    this.#items = desc.items;
    this.#rendered = Math.min(this.#chunk, this.#items.length);
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
    const target = Math.min(Math.max(this.#rendered, this.#chunk), this.#items.length);
    const sameKeys = this.#rows.length === target && this.#rows.every((row, i) => row.key === desc.keyOf(this.#items[i]));
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
    const end = Math.min(this.#items.length, this.#rendered + n);
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
    const key = this.#desc.keyOf(item);
    if (this.#openState.has(key)) return this.#openState.get(key);
    return Boolean(this.#desc.defaultOpen?.(item));
  }

  toggle(index, force) {
    const item = this.#items[index];
    if (!item || this.#desc.isHeader?.(item)) return false;
    const key = this.#desc.keyOf(item);
    const next = force ?? !this.isOpen(index);
    this.#openState.set(key, next);
    const row = this.#rows[index];
    if (row) this.#applyOpen(row, index, next);
    return next;
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
    if (this.#items.length === 0) return;
    let next = this.#cursor === -1 ? (delta > 0 ? 0 : this.#items.length - 1) : this.#cursor + delta;
    while (next >= 0 && next < this.#items.length && !this.#isCursorable(next)) next += delta > 0 ? 1 : -1;
    if (next < 0 || next >= this.#items.length) return;
    this.setCursor(next);
  }

  setCursorToEdge(edge) {
    if (this.#items.length === 0) return;
    if (edge === "last") this.renderAll();
    let index = edge === "first" ? 0 : this.#items.length - 1;
    while (index >= 0 && index < this.#items.length && !this.#isCursorable(index)) index += edge === "first" ? 1 : -1;
    this.setCursor(index);
  }

  setCursor(index) {
    const clamped = Math.max(0, Math.min(index, this.#items.length - 1));
    while (this.#rendered <= clamped) this.renderMore();
    this.#cursor = clamped;
    this.#rows.forEach((row, i) => row.el.classList.toggle("rec-cursor", i === clamped));
    this.#rows[clamped]?.el.scrollIntoView({ block: "nearest" });
  }

  resetCursor() {
    this.#cursor = -1;
    for (const row of this.#rows) row.el.classList.remove("rec-cursor");
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
    if (this.#items.length === 0) {
      this.#statusEl.textContent = this.#loading ? "読み込み中…" : this.#emptyMessage;
      this.#statusEl.classList.toggle("is-loading", this.#loading);
      this.#statusEl.hidden = false;
    } else {
      this.#statusEl.hidden = true;
    }
    const remaining = this.#items.length - this.#rendered;
    this.#moreEl.hidden = remaining <= 0;
    if (remaining > 0) this.#moreButton.textContent = `さらに表示（残り ${remaining} 件）`;
  }

  #safe(fn, item, what) {
    try {
      return fn(item);
    } catch (err) {
      console.error(`RecordList: ${what} failed`, err, item);
      return `<p class="render-error">描画エラー: ${escapeHtml(err.message)}</p>`;
    }
  }

  #buildRow(index) {
    const item = this.#items[index];
    const key = this.#desc.keyOf(item);
    const el = document.createElement("article");
    if (this.#desc.isHeader?.(item)) {
      el.className = "list-heading";
      el.innerHTML = this.#safe(this.#desc.renderHead, item, "renderHead");
      const row = { key, el, head: el.innerHTML, body: "", open: false, header: true };
      this.#rows[index] = row;
      return el;
    }
    el.className = `rec ${this.#desc.rowClass?.(item) ?? ""}`.trim();
    el.dataset.key = key;
    el.dataset.index = String(index);
    el.innerHTML = `
      <div class="rec-head">
        <div class="rec-main"></div>
        <button type="button" class="rec-toggle" aria-expanded="false" aria-label="詳細を開く"><span class="chev" aria-hidden="true"></span></button>
      </div>
      <div class="rec-body" hidden></div>
    `;
    const row = { key, el, head: "", body: "", open: false, header: false };
    this.#rows[index] = row;
    row.head = this.#safe(this.#desc.renderHead, item, "renderHead");
    el.querySelector(".rec-main").innerHTML = row.head;
    if (index === this.#cursor) el.classList.add("rec-cursor");
    this.#applyOpen(row, index, this.isOpen(index));
    return el;
  }

  #updateRow(index) {
    const row = this.#rows[index];
    const item = this.#items[index];
    if (row.header) {
      const head = this.#safe(this.#desc.renderHead, item, "renderHead");
      if (head !== row.head) { row.el.innerHTML = head; row.head = head; }
      return;
    }
    row.el.dataset.index = String(index);
    const head = this.#safe(this.#desc.renderHead, item, "renderHead");
    if (head !== row.head) {
      row.el.querySelector(".rec-main").innerHTML = head;
      row.head = head;
    }
    const open = this.isOpen(index);
    if (open) {
      const body = this.#safe(this.#desc.renderBody, item, "renderBody");
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
      row.body = this.#safe(this.#desc.renderBody, this.#items[index], "renderBody");
      bodyEl.innerHTML = row.body;
    }
    row.open = open;
    bodyEl.hidden = !open;
    row.el.classList.toggle("rec-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "詳細を閉じる" : "詳細を開く");
  }

  // 行の見出し部 (rec-head) のクリックで開閉する。リンク・ボタン等の操作要素や本体部のクリック、
  // テキスト選択中のクリックは開閉しない。
  #onRowsClick(event) {
    const rec = event.target.closest(".rec");
    if (!rec || !this.#rowsEl.contains(rec)) return;
    const head = event.target.closest(".rec-head");
    if (!head || head.parentElement !== rec) return;
    const onToggle = Boolean(event.target.closest(".rec-toggle"));
    if (!onToggle && event.target.closest("a, button, summary, input, select, textarea, label")) return;
    if (!onToggle && window.getSelection?.()?.toString()) return;
    const index = Number(rec.dataset.index);
    if (!Number.isInteger(index)) return;
    this.toggle(index);
    this.#cursor = index;
    this.#rows.forEach((row, i) => row.el.classList.toggle("rec-cursor", i === index));
  }
}
