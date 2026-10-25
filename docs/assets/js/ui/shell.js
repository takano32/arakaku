import {
  ADMIN_TABS,
  DATA_FILES,
  DEFAULT_ADMIN_TAB,
  DEFAULT_TAB,
  MENTION_TYPE_ORDER,
  PUBLIC_TABS,
  REQUIRED_TAB_DATA_KEYS,
} from "../config.js";
import { FILTER_STATE_KEYS, TAB_FILTERS, filterButtons } from "../data/filters.js";
import { labels } from "../data/labels.js";
import { escapeHtml, uniqueSorted } from "./html.js";
import { RecordList } from "./list.js";
import { SECTIONS } from "./sections/index.js";

/**
 * Shell — 画面全体 (ナビ・件数・検索・絞り込み・一覧・エラー表示) の描画と UI イベントの配線。
 *
 * - state.subscribe → render() が唯一の再描画経路。render() は冪等で、変化した部分だけ DOM を触る
 *   (ナビは aria-current の更新だけ、絞り込みは指紋が変わったときだけ、一覧はタブ・repo.revision・
 *   指紋のいずれかが変わったときだけ build する)。
 * - 一覧はタブごとに 1 つの RecordList を保持し、タブを切り替えても開閉状態と描画済み件数を保つ。
 * - 選手/大会/試合リンク (ui/parts.js の data-* 属性) と YouTube ファサードのクリックは
 *   #list-host への委譲で受ける。
 */
export class Shell {
  #state;
  #loader;
  #parts;
  #query;
  #lists = new Map();
  #currentTab = null;
  #prevRevision = new Map();
  #prevFingerprint = new Map();
  #prevGate = new Map();
  #prevFocusKey = "";
  #prevSortReady = new Map();
  #prevFilterKey = "";
  #prevNavKey = "";
  #prevPublicTab = DEFAULT_TAB;
  #prevAdminTab = DEFAULT_ADMIN_TAB;
  #syncingNav = false;
  #searchTimer = null;
  #lastCount = -1;

  constructor({ state, loader, parts, query }) {
    this.#state = state;
    this.#loader = loader;
    this.#parts = parts;
    this.#query = query;
  }

  get state() { return this.#state; }
  get repo() { return this.#state.repository; }

  // ── 配線 ───────────────────────────────────────────────────────────

  bind() {
    const searchInput = document.querySelector("#search");
    const clearButton = document.querySelector("#search-clear");

    const scheduleSearch = (value) => {
      if (clearButton) clearButton.hidden = !value;
      clearTimeout(this.#searchTimer);
      this.#searchTimer = setTimeout(() => {
        this.#state.clearFocus();
        this.#state.patch({ query: value });
      }, 150);
    };
    // 日本語入力の変換中は検索せず、確定 (compositionend) で検索する。
    searchInput?.addEventListener("input", (event) => {
      if (event.isComposing) return;
      scheduleSearch(event.target.value);
    });
    searchInput?.addEventListener("compositionend", (event) => scheduleSearch(event.target.value));
    searchInput?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.clearSearch();
    });
    clearButton?.addEventListener("click", () => this.clearSearch());

    for (const selector of ["#nav", "#stats"]) {
      document.querySelector(selector)?.addEventListener("click", (event) => {
        const link = event.target.closest("a[data-tab]");
        if (!link) return;
        event.preventDefault();
        this.switchTab(link.dataset.tab);
      });
    }

    document.querySelector("#nav")?.addEventListener("toggle", (event) => {
      // 管理ビューの開閉 = ビュー切替。離れる前の各ビューの最後のタブへ戻す。
      if (this.#syncingNav || !event.target.classList.contains("nav-admin")) return;
      const open = event.target.open;
      if (open && this.#state.viewMode === "public") this.switchTab(this.#prevAdminTab);
      else if (!open && this.#state.viewMode === "admin") this.switchTab(this.#prevPublicTab);
    }, true);

    document.querySelector("#filters")?.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-filter-type]");
      if (!btn) return;
      const group = TAB_FILTERS[this.#state.tab]?.find((g) => g.type === btn.dataset.filterType);
      if (!group) return;
      const val = btn.dataset.filterVal;
      this.#state.patch({ [group.stateKey]: this.#state[group.stateKey] === val ? "" : val });
    });

    document.querySelector("#filters")?.addEventListener("change", (event) => {
      if (event.target.id === "mention-type") this.#state.patch({ mentionType: event.target.value });
    });

    document.querySelector("#toolbar")?.addEventListener("click", (event) => {
      if (event.target.closest("#focus-clear")) {
        this.#state.clearFocus();
        this.#state.patch({});
      }
    });

    document.querySelector("#list-host")?.addEventListener("click", (event) => {
      const fighter = event.target.closest(".link-fighter");
      if (fighter) { this.jumpToFighter(fighter.dataset.fighterId); return; }
      const ev = event.target.closest(".link-event");
      if (ev) { this.jumpToEvent(ev.dataset.eventId); return; }
      const bout = event.target.closest(".link-bout");
      if (bout) { this.jumpToBout(bout.dataset.boutId); return; }
      const yt = event.target.closest(".yt");
      if (yt) this.#activateVideo(yt);
    });

    document.querySelector("#theme-toggle")?.addEventListener("click", () => this.#toggleTheme());

    this.#state.subscribe(() => this.render());
  }

  // ── 遷移 ───────────────────────────────────────────────────────────

  switchTab(tabId) {
    if (!SECTIONS[tabId]) tabId = DEFAULT_TAB;
    this.#state.clearFocus();
    this.#state.patch({ tab: tabId });
    this.#loader.loadForTab(tabId);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  #jump(patch) {
    this.#state.clearFocus();
    this.#state.patch({ ...patch, query: "" });
    const searchInput = document.querySelector("#search");
    if (searchInput) searchInput.value = "";
    const clearButton = document.querySelector("#search-clear");
    if (clearButton) clearButton.hidden = true;
    this.#loader.loadForTab(this.#state.tab);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  jumpToFighter(fighterId) { this.#jump({ tab: "fighters", focusFighterId: fighterId || "" }); }
  jumpToEvent(eventId) { this.#jump({ tab: "events", focusEventId: eventId || "" }); }
  jumpToBout(boutId) { this.#jump({ tab: "bouts", focusBoutId: boutId || "" }); }

  clearSearch() {
    const searchInput = document.querySelector("#search");
    const clearButton = document.querySelector("#search-clear");
    if (searchInput) searchInput.value = "";
    if (clearButton) clearButton.hidden = true;
    clearTimeout(this.#searchTimer);
    this.#state.clearFocus();
    this.#state.patch({ query: "" });
  }

  currentList() {
    return this.#lists.get(this.#state.tab) ?? null;
  }

  toast(message) {
    const el = document.querySelector("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-shown");
    clearTimeout(this.#toastTimer);
    this.#toastTimer = setTimeout(() => el.classList.remove("is-shown"), 2000);
  }
  #toastTimer = null;

  // YouTube ファサード → iframe に差し替え (クリックされた動画だけ読み込む)
  #activateVideo(el) {
    const id = el.dataset.ytId;
    if (!id || el.querySelector("iframe")) return;
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    iframe.title = el.querySelector(".yt-play")?.getAttribute("aria-label") ?? "YouTube";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    el.replaceChildren(iframe);
    el.classList.add("is-active");
  }

  #toggleTheme() {
    const root = document.documentElement;
    const current = root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("arakaku-theme", next); } catch { /* 保存できなくても動作に支障なし */ }
  }

  // ── 描画 ───────────────────────────────────────────────────────────

  render() {
    const state = this.#state;
    if (!state.data || !state.repository) return;
    if (state.viewMode === "admin") this.#prevAdminTab = state.tab;
    else this.#prevPublicTab = state.tab;

    this.#renderNav();
    this.#renderStats();
    this.#renderAlerts();
    this.#renderFilters();
    this.#renderList();
    this.#renderToolbar();
  }

  #navItem(id, label) {
    const active = id === this.#state.tab;
    return `<li><a class="nav-link" href="?tab=${escapeHtml(id)}" data-tab="${escapeHtml(id)}"${active ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a></li>`;
  }

  #renderNav() {
    const nav = document.querySelector("#nav");
    if (!nav) return;
    const key = `${this.#state.tab}`;
    if (this.#prevNavKey === key && nav.childElementCount > 0) return;
    const admin = this.#state.viewMode === "admin";
    if (nav.childElementCount === 0) {
      nav.innerHTML = `
        <ul class="nav-list nav-public">${PUBLIC_TABS.map(([id, label]) => this.#navItem(id, label)).join("")}</ul>
        <details class="nav-admin"${admin ? " open" : ""}>
          <summary class="nav-admin-summary"><span>管理ビュー</span><span class="chev" aria-hidden="true"></span></summary>
          <ul class="nav-list nav-admin-list">${ADMIN_TABS.map(([id, label]) => this.#navItem(id, label)).join("")}</ul>
        </details>
      `;
    } else {
      for (const link of nav.querySelectorAll("a[data-tab]")) {
        if (link.dataset.tab === this.#state.tab) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
      const details = nav.querySelector(".nav-admin");
      if (details && details.open !== admin) {
        this.#syncingNav = true;
        details.open = admin;
        // toggle イベントは非同期に発火するので、次のタスクまでガードを保つ
        setTimeout(() => { this.#syncingNav = false; }, 0);
      }
    }
    this.#prevNavKey = key;
    document.title = `${this.#sectionLabel()} | Unofficial ARAKAKU Database`;
  }

  #sectionLabel() {
    return SECTIONS[this.#state.tab]?.label ?? "Unofficial ARAKAKU Database";
  }

  // 件数の計算規則:
  // - 試合・動画は enrich で増減しないので生配列長 (名鑑のみの試合は個人成績ロード後に加算)。
  // - 選手は名鑑/公式由来の発掘と重複統合で件数が変わるため、関係キーが揃ってから richFighters を数える。
  // - 未ロードのものは "…"。
  #counts() {
    const d = this.#state.data;
    const repo = this.repo;
    const loaded = this.#state.loadedDataKeys;
    const fightersFinal = ["fighters", "numbersFighters", "numbersNameMatches", "officialPlayers"].every((k) => loaded.has(k));
    const numbersOnlyLoaded = loaded.has("numbersFightRecords");
    const refsLoaded = ["sourceEventReferences", "sourceBoutReferences", "sourceVideoReferences"].every((k) => loaded.has(k));
    // [ラベル, 件数, 押したときに開くタブ]。出典候補だけの一覧は無く、出典本文の各行に候補件数が出るので出典本文へ。
    return [
      ["団体", d.promotions.length, "promotions"],
      ["大会", d.events.length + (numbersOnlyLoaded ? repo.numbersOnlyEvents.length : 0), "events"],
      ["試合", d.bouts.length + (numbersOnlyLoaded ? repo.numbersOnlyBouts.length : 0), "bouts"],
      ["選手", fightersFinal ? repo.richFighters.length : d.fighters.length, "fighters"],
      ["王座", d.titles.length, "titles"],
      ["動画", d.videos.length, "videos"],
      ["出典", loaded.has("sourceDocuments") ? d.sourceDocuments.length : "…", "sources"],
      ["出典候補", refsLoaded ? (d.sourceEventReferences?.length ?? 0) + (d.sourceBoutReferences?.length ?? 0) + (d.sourceVideoReferences?.length ?? 0) : "…", "sources"],
    ];
  }

  #renderStats() {
    const el = document.querySelector("#stats");
    if (!el) return;
    const html = this.#counts().map(([label, count, tab]) => {
      const name = SECTIONS[tab]?.label ?? label;
      return `<a class="stat-cell" href="?tab=${escapeHtml(tab)}" data-tab="${escapeHtml(tab)}" title="${escapeHtml(name)}を表示"><span class="stat-num">${escapeHtml(count)}</span><span class="stat-label">${escapeHtml(label)}</span></a>`;
    }).join("");
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  #renderAlerts() {
    const el = document.querySelector("#alerts");
    if (!el) return;
    const entries = Object.entries(this.#state.dataLoadErrors ?? {});
    if (entries.length === 0) {
      if (el.childElementCount) el.replaceChildren();
      return;
    }
    const items = entries.map(([key, message]) => {
      const fileName = (DATA_FILES[key] ?? key).split("/").pop();
      return `<li><code>${escapeHtml(fileName)}</code> ${escapeHtml(message)}</li>`;
    }).join("");
    const html = `<div class="alert" role="alert"><p class="alert-title">データ読み込み失敗</p><ul>${items}</ul><p class="small">読み込めなかったデータは空として扱われています。再読み込みしても直らない場合は配信側の問題です。</p></div>`;
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  #sortedMentionTypes() {
    return uniqueSorted(this.repo.richSourceMentions.map((m) => m.mention_type)).sort((a, b) => {
      const orderA = MENTION_TYPE_ORDER.indexOf(a);
      const orderB = MENTION_TYPE_ORDER.indexOf(b);
      if (orderA === -1 && orderB === -1) return String(a).localeCompare(String(b), "ja");
      if (orderA === -1) return 1;
      if (orderB === -1) return -1;
      return orderA - orderB;
    });
  }

  #renderFilters() {
    const el = document.querySelector("#filters");
    if (!el) return;
    const state = this.#state;
    const groups = TAB_FILTERS[state.tab] ?? [];
    const isMentions = state.tab === "mentions";
    const mentionTypes = isMentions ? this.#sortedMentionTypes() : [];
    const key = [state.tab, state.mentionType, mentionTypes.join(","), ...groups.map((g) => state[g.stateKey])].join("\0");
    if (key === this.#prevFilterKey) return;
    this.#prevFilterKey = key;

    const rows = groups.map((group) => {
      const selected = state[group.stateKey];
      const buttons = filterButtons(group).map((option) => `
        <button type="button" class="chip${selected === option.value ? " is-active" : ""}" aria-pressed="${selected === option.value ? "true" : "false"}"
                data-filter-type="${escapeHtml(group.type)}" data-filter-val="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>`).join("");
      return `<div class="filter-row"><span class="filter-label">${escapeHtml(group.label)}</span><div class="chips">${buttons}</div></div>`;
    });
    if (isMentions) {
      const options = [`<option value="">すべての言及</option>`, ...mentionTypes.map((t) => `<option value="${escapeHtml(t)}"${t === state.mentionType ? " selected" : ""}>${escapeHtml(labels.mentionType(t))} / ${escapeHtml(t)}</option>`)].join("");
      rows.push(`<div class="filter-row"><label class="filter-label" for="mention-type">種別</label><select id="mention-type" class="select">${options}</select></div>`);
    }
    el.hidden = rows.length === 0;
    el.innerHTML = rows.join("");
  }

  #focusChip() {
    const state = this.#state;
    const repo = this.repo;
    let label = "";
    if (state.focusFighterId) label = `選手: ${repo.fighterName(state.focusFighterId)}`;
    else if (state.focusEventId) label = `大会: ${repo.eventName(state.focusEventId)}`;
    else if (state.focusBoutId) label = `試合: ${repo.findRichBout(state.focusBoutId)?.matchup ?? state.focusBoutId}`;
    if (!label) return "";
    return `<span class="focus-chip">${escapeHtml(label)}<button type="button" id="focus-clear" class="focus-clear" aria-label="絞り込みを解除">✕</button></span>`;
  }

  #renderToolbar() {
    const el = document.querySelector("#toolbar");
    if (!el) return;
    const section = SECTIONS[this.#state.tab];
    const loading = this.#state.loadingDataKeys.size;
    const total = Object.keys(DATA_FILES).length;
    const loadedCount = this.#state.loadedDataKeys.size;
    const count = this.#lastCount;
    const html = `
      <h1 class="section-title">${escapeHtml(section?.label ?? "")}<span class="section-count">${count >= 0 ? `${escapeHtml(count)} 件` : ""}</span></h1>
      ${this.#focusChip()}
      ${loading ? `<span class="loading-indicator" aria-live="polite">読み込み中 ${loadedCount}/${total}</span>` : ""}
    `;
    if (el.innerHTML !== html) el.innerHTML = html;
    const searchInput = document.querySelector("#search");
    if (searchInput && section?.placeholder && searchInput.placeholder !== section.placeholder) {
      searchInput.placeholder = section.placeholder;
    }
  }

  #fingerprint() {
    const s = this.#state;
    return [s.query, s.focusFighterId, s.focusEventId, s.focusBoutId, s.mentionType, ...FILTER_STATE_KEYS.map((k) => s[k])].join("\0");
  }

  #renderList() {
    const host = document.querySelector("#list-host");
    if (!host) return;
    const state = this.#state;
    const tabId = SECTIONS[state.tab] ? state.tab : DEFAULT_TAB;
    const section = SECTIONS[tabId];

    if (!this.#lists.has(tabId)) this.#lists.set(tabId, new RecordList());
    const list = this.#lists.get(tabId);
    const tabChanged = tabId !== this.#currentTab;
    if (tabChanged || list.el.parentNode !== host) {
      host.replaceChildren(list.el);
      this.#currentTab = tabId;
    }

    // 描画ゲート: 必須データが未着ならプレースホルダだけ出す
    const required = REQUIRED_TAB_DATA_KEYS[tabId] ?? [];
    const missing = required.filter((k) => !state.loadedDataKeys.has(k));
    const gateKey = missing.join(",");
    // 選手タブは名鑑順ソートに必要なキーが揃うまで待ち、揃ったら 1 回だけ描画する
    const sortReady = tabId !== "fighters" || ["numbersFighters", "numbersNameMatches"].every((k) => state.loadedDataKeys.has(k));
    if (missing.length > 0 || !sortReady) {
      const loading = missing.some((k) => state.loadingDataKeys.has(k)) || !sortReady;
      list.setItems({ items: [], keyOf: () => "", renderHead: () => "", renderBody: () => "" });
      list.setStatus({ loading: true, emptyMessage: loading ? "読み込み中…" : "読み込み待ち…" });
      this.#prevGate.set(tabId, gateKey);
      this.#prevSortReady.set(tabId, sortReady);
      this.#prevRevision.set(tabId, null);
      this.#lastCount = -1;
      return;
    }

    const revision = this.repo.revision;
    const fingerprint = this.#fingerprint();
    const focusKey = [state.focusFighterId, state.focusEventId, state.focusBoutId].join("\0");
    const focusChanged = focusKey !== this.#prevFocusKey;
    const gateChanged = gateKey !== this.#prevGate.get(tabId) || sortReady !== this.#prevSortReady.get(tabId);
    const changed = tabChanged || gateChanged || revision !== this.#prevRevision.get(tabId) || fingerprint !== this.#prevFilterKeyFor(tabId);
    list.setStatus({ loading: state.loadingDataKeys.size > 0, emptyMessage: section.empty });
    if (!changed) return;

    let desc;
    try {
      desc = section.build({ state, repo: this.repo, query: this.#query, parts: this.#parts });
    } catch (err) {
      console.error(`Shell: section "${tabId}" failed to build`, err);
      host.innerHTML = `<div class="alert" role="alert"><p class="alert-title">描画エラー (${escapeHtml(tabId)})</p><p>${escapeHtml(err.message)}</p></div>`;
      this.#currentTab = null;
      return;
    }

    if (tabChanged || gateChanged || this.#prevRevision.get(tabId) == null) {
      list.setItems(desc);
    } else {
      list.refresh(desc);
    }
    // フォーカス (特定レコードへのジャンプ) は 1 件を開いた状態で先頭に出す。
    // データ到着前はまだ見つからないので、見つかった描画で初めて「処理済み」にする。
    if (state.hasFocus) {
      if (focusChanged && desc.items.length === 1) {
        list.openByKey(desc.keyOf(desc.items[0]));
        window.scrollTo({ top: 0, behavior: "instant" });
        this.#prevFocusKey = focusKey;
      }
    } else {
      this.#prevFocusKey = focusKey;
    }
    this.#lastCount = desc.items.filter((item) => !desc.isHeader?.(item)).length;
    this.#prevRevision.set(tabId, revision);
    this.#prevFingerprint.set(tabId, fingerprint);
    this.#prevGate.set(tabId, gateKey);
    this.#prevSortReady.set(tabId, sortReady);
  }

  #prevFilterKeyFor(tabId) {
    return this.#prevFingerprint.get(tabId);
  }
}
