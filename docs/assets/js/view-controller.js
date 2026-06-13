import { escapeHtml, uniqueSorted } from "./ui/html-utils.js";
import { ADMIN_TABS, DATA_FILES, MENTION_TYPE_ORDER, PUBLIC_TABS } from "./config.js";
import { TAB_FILTERS, filterButtons } from "./filters.js";

const REQUIRED_TAB_DATA_KEYS = {
  tsushin: ["sourceDocuments", "sourceDocumentBodies"],
  sources: ["sourceDocuments"],
  mentions: ["sourceDocuments", "sourceMentions"],
};

/** Facade: DOM 更新とフィルタ UI を統括 */
export class ViewController {
  /** @param {import("./core/view-context.js").ViewContext} ctx */
  /** @param {import("./tabs/tab-registry.js").TabRendererRegistry} tabRegistry */
  constructor(ctx, tabRegistry) {
    this.ctx = ctx;
    this.tabRegistry = tabRegistry;
  }

  renderSummary() {
    const d = this.ctx.state.data;
    const { repo } = this.ctx;
    const loaded = this.ctx.state.loadedDataKeys;
    const sourceDocumentCount = loaded?.has("sourceDocuments")
      ? d.sourceDocuments.length
      : "...";
    const sourceReferenceCount = ["sourceEventReferences", "sourceBoutReferences", "sourceVideoReferences"]
      .every((key) => loaded?.has(key))
      ? (d.sourceEventReferences?.length ?? 0) +
          (d.sourceBoutReferences?.length ?? 0) +
          (d.sourceVideoReferences?.length ?? 0)
      : "...";
    // 試合・動画の件数は enrich で増減しないため rich を作らず生配列長を使う
    // (richBouts/richVideos は reverse + 並べ替えのみで件数不変)。
    // 選手は名鑑/公式由来の選手発見と重複統合で件数が変わるため rich が必要だが、
    // 確定値になるのは名鑑・公式キーが揃う Phase 2 以降。揃うまでは生 fighters 長を表示し、
    // ストリーミング中の richFighters 再構築を避ける。
    const fightersFinal = ["fighters", "numbersFighters", "numbersNameMatches", "officialPlayers"]
      .every((key) => loaded?.has(key));
    const fightersCount = fightersFinal ? repo.richFighters.length : d.fighters.length;
    const items = [
      ["団体", d.promotions.length],
      ["大会", d.events.length],
      ["試合", d.bouts.length],
      ["選手", fightersCount],
      ["王座", d.titles.length],
      ["動画", d.videos.length],
      ["出典", sourceDocumentCount],
      ["出典候補", sourceReferenceCount],
    ];

    document.querySelector("#summary").innerHTML = items
      .map(
        ([label, count]) => `
      <article class="summary-card">
        <strong>${escapeHtml(count)}</strong>
        <span>${escapeHtml(label)}</span>
      </article>
    `
      )
      .join("");
  }

  renderDataLoadErrors() {
    const container = document.querySelector("#data-load-errors");
    if (!container) return;

    const errors = this.ctx.state.dataLoadErrors ?? {};
    const entries = Object.entries(errors);
    container.hidden = entries.length === 0;
    if (entries.length === 0) {
      container.innerHTML = "";
      return;
    }

    const items = entries
      .map(([key, message]) => {
        const path = DATA_FILES[key] ?? key;
        const fileName = path.split("/").pop();
        return `<li>${escapeHtml(fileName)} (${escapeHtml(message)})</li>`;
      })
      .join("");

    container.innerHTML = `
      <article class="card data-load-error-card" role="alert">
        <h2>データ読み込み失敗</h2>
        <ul>${items}</ul>
      </article>
    `;
  }

  renderSelectOptions(options, selectedValue, defaultLabel, labelForOption = (value) => value) {
    return [
      `<option value="">${escapeHtml(defaultLabel)}</option>`,
      ...options.map(
        (value) => `
        <option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>
          ${escapeHtml(labelForOption(value))}
        </option>
      `
      ),
    ].join("");
  }

  sortedMentionTypes() {
    return uniqueSorted(this.ctx.repo.richSourceMentions.map((mention) => mention.mention_type)).sort(
      (a, b) => {
        const orderA = MENTION_TYPE_ORDER.indexOf(a);
        const orderB = MENTION_TYPE_ORDER.indexOf(b);
        if (orderA === -1 && orderB === -1) return String(a).localeCompare(String(b), "ja");
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        return orderA - orderB;
      }
    );
  }

  renderMentionFilters() {
    const { state, labels } = this.ctx;
    const filters = document.querySelector("#mention-filters");
    if (!filters) return;

    const isActive = state.tab === "mentions";
    filters.hidden = !isActive;
    if (!isActive) return;

    const mentionTypeSelect = document.querySelector("#mention-type-filter");
    if (!mentionTypeSelect || !state.data) return;

    mentionTypeSelect.innerHTML = this.renderSelectOptions(
      this.sortedMentionTypes(),
      state.mentionType,
      "すべての言及",
      (mentionType) => `${labels.mentionType(mentionType)} / ${mentionType}`
    );
  }

  renderTabFilters() {
    const { state } = this.ctx;
    const filters = document.querySelector("#tab-filters");
    if (!filters) return;

    const groups = TAB_FILTERS[state.tab];
    filters.hidden = !groups;
    if (!groups) return;

    filters.innerHTML = groups.map((group) => {
      const selected = state[group.stateKey];
      const buttons = filterButtons(group)
        .map(
          (option) => `
        <button type="button" class="filter-button ${selected === option.value ? "active" : ""}"
                data-filter-type="${escapeHtml(group.type)}" data-filter-val="${escapeHtml(option.value)}">
          ${escapeHtml(option.label)}
        </button>
      `
        )
        .join("");
      return `
      <div class="filter-row">
        <span class="filter-label">${escapeHtml(group.label)}：</span>
        <div class="filter-button-group">${buttons}</div>
      </div>
    `;
    }).join("");
  }

  renderTabs() {
    const tabs = document.querySelector(".tabs");
    if (!tabs) return;

    const visibleTabs = this.ctx.state.viewMode === "admin" ? ADMIN_TABS : PUBLIC_TABS;
    const activeTab = this.ctx.state.tab;
    tabs.setAttribute("aria-label", this.ctx.state.viewMode === "admin" ? "管理ビュー切替" : "表示切替");

    const existingButtons = tabs.querySelectorAll(".tab");
    const existingIds = [...existingButtons].map((b) => b.dataset.tab);
    const expectedIds = visibleTabs.map(([id]) => id);

    if (existingIds.join(",") === expectedIds.join(",")) {
      // タブ構成が同じならアクティブクラスだけ更新 — DOM 再構築でフォーカスを失わせない
      for (const button of existingButtons) {
        button.classList.toggle("active", button.dataset.tab === activeTab);
      }
      return;
    }

    // ビューモード切り替え時など構成が変わる場合は全再構築
    tabs.innerHTML = visibleTabs.map(
      ([tabId, label]) => `
      <button type="button" class="tab ${tabId === activeTab ? "active" : ""}" data-tab="${escapeHtml(tabId)}">
        ${escapeHtml(label)}
      </button>
    `
    ).join("");
  }

  renderViewModeSwitch() {
    const switcher = document.querySelector(".view-mode-switch");
    if (!switcher) return;

    const { viewMode } = this.ctx.state;
    // viewMode はストリーミング中変化しない。毎 patch の innerHTML 再構築を避ける。
    if (this._lastViewMode === viewMode && switcher.childElementCount > 0) return;
    this._lastViewMode = viewMode;
    const buttons = [
      ["public", "通常ビュー"],
      ["admin", "管理ビュー"],
    ];

    switcher.innerHTML = buttons.map(([mode, label]) => `
      <button type="button" class="view-mode-button ${viewMode === mode ? "active" : ""}" data-view-mode="${escapeHtml(mode)}" aria-pressed="${viewMode === mode ? "true" : "false"}">
        ${escapeHtml(label)}
      </button>
    `).join("");
  }

  renderContent() {
    const content = document.querySelector("#content");
    const requiredKeys = REQUIRED_TAB_DATA_KEYS[this.ctx.state.tab] ?? [];
    const loadingKeys = requiredKeys.filter((key) => this.ctx.state.loadingDataKeys?.has(key));
    if (loadingKeys.length > 0) {
      content.innerHTML = `
        <article class="card">
          <h2>読み込み中</h2>
          <p class="meta">管理ビューのデータを読み込んでいます。</p>
        </article>
      `;
      return;
    }

    const missingKeys = requiredKeys.filter((key) => !this.ctx.state.loadedDataKeys?.has(key));
    if (missingKeys.length > 0) {
      content.innerHTML = `
        <article class="card">
          <h2>読み込み待ち</h2>
          <p class="meta">管理ビューを表示するためのデータを準備しています。</p>
        </article>
      `;
      return;
    }

    this.tabRegistry.renderTo(content, this.ctx.state.tab);
  }

  render() {
    if (!this.ctx.hasData) return;

    this.renderSummary();
    this.renderDataLoadErrors();
    this.renderViewModeSwitch();
    this.renderTabs();
    this.renderMentionFilters();
    this.renderTabFilters();
    this.renderContent();
  }
}
