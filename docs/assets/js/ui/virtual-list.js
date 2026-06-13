/**
 * 役割: window スクロールを基準にした仮想リスト。可視範囲の行だけを innerHTML で描画/破棄し、
 *   高さは @tanstack/virtual-core の measureElement で実測してレイアウトする。j/k 用の行カーソル
 *   (setCursor/activateCursor/getCursorEl) も保持する。
 * アーキ上の位置: tab-registry が各タブごとに 1 インスタンス生成し、setItems(items, renderItem) で
 *   描画関数 (tab-renderers の出力) を渡す。keyboard-nav → tab-registry → ここの順でカーソルが委譲される。
 * 不変条件: virtual-core は動的 import (下記参照) なので、描画は virtualCore 解決後に行う。
 *   #virtualizerGen は描画リクエストの世代カウンタで、非同期ロード解決後に gen が一致するときだけ
 *   構築する (古い setItems の上書きを防ぐ)。#paint は再入禁止 (#painting) で測定 onChange ループを断つ。
 *   renderItem は外部由来 HTML を返すので例外は握りつぶさずカード表示する。
 * 関連スキル: .agents/skills/arakaku-viewer-ui
 */
// @tanstack/virtual-core を静的 import すると起動モジュールグラフ全体
// (main.js のトップレベル → dataLoader.load() = Phase 0 開始まで) が esm.sh の
// cold ラウンドトリップでブロックされる。動的 import でグラフから外し、モジュール
// 評価時に先行起動して Phase 0 のデータ取得と並行させる。Virtualizer/windowScroll は
// 描画 (#createVirtualizer) 時のみ必要で VirtualList の構築には不要なため挙動保存。
let virtualCore = null;
let virtualCorePromise = null;
function loadVirtualCore() {
  return (virtualCorePromise ??= import("https://esm.sh/@tanstack/virtual-core@3")
    .then((m) => { virtualCore = m; })
    .catch((err) => {
      virtualCorePromise = null; // 一時的な失敗を次回 setItems でリトライ可能にする
      console.error("[virtual-list] failed to load @tanstack/virtual-core", err);
    }));
}
loadVirtualCore();

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
  #virtualizerGen = 0;

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
    const gen = ++this.#virtualizerGen;

    if (virtualCore) {
      this.#instantiateVirtualizer(count, scrollMargin);
      return;
    }
    // virtual-core 未ロード (初回描画が Phase 0 データより速いと稀に起こる):
    // ロード表示し、解決後にまだ最新の要求であれば構築する。
    this.#el.innerHTML = (this.#items.length === 0 && !this.#loading) ? "" : loadingMessage();
    loadVirtualCore().then(() => {
      // gen 不一致: 後続の setItems/refreshItems に置き換えられた。virtualCore null: ロード失敗。
      if (gen !== this.#virtualizerGen || !virtualCore) return;
      this.#instantiateVirtualizer(count, scrollMargin);
    });
  }

  #instantiateVirtualizer(count, scrollMargin) {
    const { Virtualizer, windowScroll } = virtualCore;
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

    // scrollMargin = リスト先頭のドキュメント絶対 Y。window スクロールを基準に仮想化するため、
    // リスト上のヘッダ等の分だけ仮想アイテムの start をずらすオフセットとして必須。
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
