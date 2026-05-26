import { escapeHtml, uniqueSorted } from "./ui/html-utils.js";
import { ADMIN_TABS, MENTION_TYPE_ORDER, PUBLIC_TABS } from "./config.js";

const REQUIRED_TAB_DATA_KEYS = {
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
    const sourceDocumentCount = this.ctx.state.loadedDataKeys?.has("sourceDocuments")
      ? d.sourceDocuments.length
      : "...";
    const sourceReferenceCount = ["sourceEventReferences", "sourceBoutReferences", "sourceVideoReferences"]
      .every((key) => this.ctx.state.loadedDataKeys?.has(key))
      ? (d.sourceEventReferences?.length ?? 0) +
          (d.sourceBoutReferences?.length ?? 0) +
          (d.sourceVideoReferences?.length ?? 0)
      : "...";
    const items = [
      ["団体", d.promotions.length],
      ["大会", d.events.length],
      ["試合", repo.richBouts.length],
      ["選手", repo.richFighters.length],
      ["王座", d.titles.length],
      ["動画", repo.richVideos.length],
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
    return uniqueSorted(this.ctx.repo.sourceMentions.map((mention) => mention.mention_type)).sort(
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

  renderTitleFilters() {
    const { state, repo } = this.ctx;
    const filters = document.querySelector("#title-filters");
    if (!filters) return;

    filters.hidden = state.tab !== "titles";

    const promotionSelect = document.querySelector("#title-promotion-filter");
    const divisionSelect = document.querySelector("#title-division-filter");
    if (!promotionSelect || !divisionSelect || !state.data) return;

    const promotionIds = uniqueSorted(repo.titles.map((title) => title.promotion_id));
    const divisions = uniqueSorted(repo.titles.map((title) => title.division));

    promotionSelect.innerHTML = this.renderSelectOptions(
      promotionIds,
      state.titlePromotion,
      "すべての団体",
      (promotionId) => repo.promotionName(promotionId)
    );

    divisionSelect.innerHTML = this.renderSelectOptions(divisions, state.titleDivision, "すべての階級");
  }

  renderMentionFilters() {
    const { state, labels } = this.ctx;
    const filters = document.querySelector("#mention-filters");
    if (!filters) return;

    filters.hidden = state.tab !== "mentions";

    const mentionTypeSelect = document.querySelector("#mention-type-filter");
    if (!mentionTypeSelect || !state.data) return;

    mentionTypeSelect.innerHTML = this.renderSelectOptions(
      this.sortedMentionTypes(),
      state.mentionType,
      "すべての言及",
      (mentionType) => `${labels.mentionType(mentionType)} / ${mentionType}`
    );
  }

  renderTabs() {
    const tabs = document.querySelector(".tabs");
    if (!tabs) return;

    const visibleTabs = this.ctx.state.viewMode === "admin" ? ADMIN_TABS : PUBLIC_TABS;
    tabs.setAttribute("aria-label", this.ctx.state.viewMode === "admin" ? "管理ビュー切替" : "表示切替");
    tabs.innerHTML = visibleTabs.map(
      ([tabId, label]) => `
      <button type="button" class="tab ${tabId === this.ctx.state.tab ? "active" : ""}" data-tab="${escapeHtml(tabId)}">
        ${escapeHtml(label)}
      </button>
    `
    ).join("");
  }

  renderViewModeSwitch() {
    const switcher = document.querySelector(".view-mode-switch");
    if (!switcher) return;

    const { viewMode } = this.ctx.state;
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
    const requiredKeys = REQUIRED_TAB_DATA_KEYS[this.ctx.state.tab] ?? [];
    const loadingKeys = requiredKeys.filter((key) => this.ctx.state.loadingDataKeys?.has(key));
    if (loadingKeys.length > 0) {
      document.querySelector("#content").innerHTML = `
        <article class="card">
          <h2>読み込み中</h2>
          <p class="meta">管理ビューのデータを読み込んでいます。</p>
        </article>
      `;
      return;
    }

    const missingKeys = requiredKeys.filter((key) => !this.ctx.state.loadedDataKeys?.has(key));
    if (missingKeys.length > 0) {
      document.querySelector("#content").innerHTML = `
        <article class="card">
          <h2>読み込み待ち</h2>
          <p class="meta">管理ビューを表示するためのデータを準備しています。</p>
        </article>
      `;
      return;
    }

    document.querySelector("#content").innerHTML = this.tabRegistry.render(this.ctx.state.tab);
  }

  render() {
    if (!this.ctx.hasData) return;

    this.renderSummary();
    this.renderViewModeSwitch();
    this.renderTabs();
    this.renderTitleFilters();
    this.renderMentionFilters();
    this.renderContent();
  }
}
