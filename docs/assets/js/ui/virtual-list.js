import { Virtualizer, windowScroll } from "https://esm.sh/@tanstack/virtual-core@3";
import { emptyMessage } from "./html-utils.js";

const loadingMessage = () =>
  `<article class="card"><p class="meta">読み込み中...</p></article>`;

const observeWindowRect = (_, cb) => {
  const update = () => cb({ width: window.innerWidth, height: window.innerHeight });
  update();
  window.addEventListener("resize", update, { passive: true });
  return () => window.removeEventListener("resize", update);
};

const observeWindowOffset = (_, cb) => {
  const update = () => cb(window.scrollY);
  update();
  window.addEventListener("scroll", update, { passive: true });
  return () => window.removeEventListener("scroll", update);
};

export class VirtualList {
  #wrapper;
  #bannerEl;
  #el;
  #items = [];
  #renderItem = null;
  #estimateSize = () => 500;
  #virtualizer = null;
  #rowEls = new Map();
  #pendingMeasure = new Set(); // #paint 完了後に測定するキュー
  #cleanupRect = null;
  #cleanupOffset = null;
  #cursorIndex = -1;

  constructor() {
    this.#bannerEl = document.createElement("div");
    this.#bannerEl.className = "sort-banner";
    this.#bannerEl.hidden = true;

    this.#el = document.createElement("div");
    this.#el.className = "virtual-list";

    this.#wrapper = document.createElement("div");
    this.#wrapper.className = "virtual-list-wrapper";
    this.#wrapper.appendChild(this.#bannerEl);
    this.#wrapper.appendChild(this.#el);
  }

  get el() { return this.#wrapper; }

  setBanner(text) {
    if (text) {
      this.#bannerEl.textContent = text;
      this.#bannerEl.hidden = false;
    } else {
      this.#bannerEl.hidden = true;
    }
  }
  get count() { return this.#items.length; }
  get cursorIndex() { return this.#cursorIndex; }

  setCursor(index) {
    const clamped = Math.max(0, Math.min(index, this.#items.length - 1));
    this.#cursorIndex = clamped;
    this.#virtualizer?.scrollToIndex(clamped, { align: "start" });
    this.#updateCursorClass();
  }

  resetCursor() {
    this.#cursorIndex = -1;
    this.#updateCursorClass();
  }

  activateCursor() {
    const row = this.#rowEls.get(this.#cursorIndex);
    if (!row) return;
    const target = row.querySelector("button, a");
    target?.click();
  }

  getCursorEl() {
    return this.#rowEls.get(this.#cursorIndex) ?? null;
  }

  #updateCursorClass() {
    for (const [idx, row] of this.#rowEls) {
      row.classList.toggle("virtual-cursor", idx === this.#cursorIndex);
    }
  }

  #createVirtualizer(count, scrollMargin) {
    // 古いリスナーを解除してから新しい Virtualizer を作成
    this.#cleanupRect?.();
    this.#cleanupOffset?.();

    this.#virtualizer = new Virtualizer({
      count,
      getScrollElement: () => window,
      estimateSize: this.#estimateSize,
      overscan: 3,
      observeElementRect: (el, cb) => { this.#cleanupRect = observeWindowRect(el, cb); return this.#cleanupRect; },
      observeElementOffset: (el, cb) => { this.#cleanupOffset = observeWindowOffset(el, cb); return this.#cleanupOffset; },
      scrollToFn: windowScroll,
      scrollMargin,
      onChange: () => this.#paint(),
    });
    this.#virtualizer._willUpdate();
  }

  setItems(items, renderItem, estimateSize = () => 500) {
    this.#items = items;
    this.#renderItem = renderItem;
    this.#estimateSize = estimateSize;
    this.#rowEls.clear();
    this.#pendingMeasure.clear();
    this.#el.innerHTML = "";

    const scrollMargin = this.#el.getBoundingClientRect().top + window.scrollY;
    this.#createVirtualizer(items.length, scrollMargin);
  }

  extendItems(items) {
    this.#items = items;
    const scrollMargin = this.#virtualizer?.options.scrollMargin ?? (this.#el.getBoundingClientRect().top + window.scrollY);
    this.#createVirtualizer(items.length, scrollMargin);
  }

  refreshItems(items) {
    this.#items = items;
    this.#rowEls.clear();
    this.#pendingMeasure.clear();
    this.#el.innerHTML = "";
    const scrollMargin = this.#virtualizer?.options.scrollMargin ?? (this.#el.getBoundingClientRect().top + window.scrollY);
    this.#createVirtualizer(items.length, scrollMargin);
  }


  #loading = false;
  #painting = false;

  setLoading(loading) {
    this.#loading = loading;
  }

  #paint() {
    // 再入防止: 測定による onChange ループを断ち切る
    if (this.#painting) return;
    this.#painting = true;

    try {
      const vitems = this.#virtualizer.getVirtualItems();
      const total = this.#virtualizer.getTotalSize();
      const scrollMargin = this.#virtualizer.options.scrollMargin ?? 0;

      this.#el.style.height = `${total}px`;

      if (this.#items.length === 0) {
        this.#el.innerHTML = this.#loading ? loadingMessage() : "";
        return;
      }

      const visible = new Set(vitems.map((v) => v.index));

      for (const [idx, el] of this.#rowEls) {
        if (!visible.has(idx)) {
          el.remove();
          this.#rowEls.delete(idx);
        }
      }

      for (const vitem of vitems) {
        let row = this.#rowEls.get(vitem.index);
        if (!row) {
          row = document.createElement("div");
          row.dataset.index = vitem.index;
          row.style.cssText = "position:absolute;top:0;left:0;width:100%";
          try {
            row.innerHTML = this.#renderItem(this.#items[vitem.index]);
          } catch (err) {
            row.innerHTML = `<article class="card"><p class="meta">描画エラー: ${err.message}</p></article>`;
            console.error("VirtualList renderItem error at index", vitem.index, err);
          }
          row.classList.toggle("virtual-cursor", vitem.index === this.#cursorIndex);
          this.#el.appendChild(row);
          this.#rowEls.set(vitem.index, row);
          this.#pendingMeasure.add(row);
        }
        row.style.transform = `translateY(${vitem.start - scrollMargin}px)`;
      }
    } finally {
      this.#painting = false;
    }

    // #paint 完了後に測定 → 次フレームで位置を再計算
    if (this.#pendingMeasure.size > 0) {
      const toMeasure = [...this.#pendingMeasure];
      this.#pendingMeasure.clear();
      requestAnimationFrame(() => {
        for (const row of toMeasure) {
          if (row.isConnected) this.#virtualizer.measureElement(row);
        }
      });
    }
  }
}
