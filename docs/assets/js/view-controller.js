import { escapeHtml, uniqueSorted } from "./ui/html-utils.js";
import { TABS, MENTION_TYPE_ORDER } from "./config.js";

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
    const items = [
      ["団体", d.promotions.length],
      ["大会", d.events.length],
      ["試合", d.bouts.length],
      ["選手", d.fighters.length],
      ["王座", d.titles.length],
      ["動画", d.videos.length],
      ["出典", d.sourceDocuments?.length ?? 0],
      [
        "出典候補",
        (d.sourceEventReferences?.length ?? 0) +
          (d.sourceBoutReferences?.length ?? 0) +
          (d.sourceVideoReferences?.length ?? 0),
      ],
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

  renderTitleFilters() {
    const { state, repo, labels } = this.ctx;
    const filters = document.querySelector("#title-filters");
    if (!filters) return;

    filters.hidden = state.tab !== "titles";

    const promotionSelect = document.querySelector("#title-promotion-filter");
    const divisionSelect = document.querySelector("#title-division-filter");
    if (!promotionSelect || !divisionSelect || !state.data) return;

    const promotionIds = uniqueSorted(repo.titles.map((title) => title.promotion_id));
    const divisions = uniqueSorted(repo.titles.map((title) => title.division));

    promotionSelect.innerHTML = [
      `<option value="">すべての団体</option>`,
      ...promotionIds.map(
        (promotionId) => `
        <option value="${escapeHtml(promotionId)}" ${promotionId === state.titlePromotion ? "selected" : ""}>
          ${escapeHtml(repo.promotionName(promotionId))}
        </option>
      `
      ),
    ].join("");

    divisionSelect.innerHTML = [
      `<option value="">すべての階級</option>`,
      ...divisions.map(
        (division) => `
        <option value="${escapeHtml(division)}" ${division === state.titleDivision ? "selected" : ""}>
          ${escapeHtml(division)}
        </option>
      `
      ),
    ].join("");
  }

  renderMentionFilters() {
    const { state, labels } = this.ctx;
    const filters = document.querySelector("#mention-filters");
    if (!filters) return;

    filters.hidden = state.tab !== "mentions";

    const mentionTypeSelect = document.querySelector("#mention-type-filter");
    if (!mentionTypeSelect || !state.data) return;

    const mentionTypes = uniqueSorted(this.ctx.repo.sourceMentions.map((mention) => mention.mention_type)).sort(
      (a, b) => {
        const orderA = MENTION_TYPE_ORDER.indexOf(a);
        const orderB = MENTION_TYPE_ORDER.indexOf(b);
        if (orderA === -1 && orderB === -1) return String(a).localeCompare(String(b), "ja");
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        return orderA - orderB;
      }
    );

    mentionTypeSelect.innerHTML = [
      `<option value="">すべての言及</option>`,
      ...mentionTypes.map(
        (mentionType) => `
        <option value="${escapeHtml(mentionType)}" ${mentionType === state.mentionType ? "selected" : ""}>
          ${escapeHtml(`${labels.mentionType(mentionType)} / ${mentionType}`)}
        </option>
      `
      ),
    ].join("");
  }

  renderTabs() {
    const tabs = document.querySelector(".tabs");
    if (!tabs) return;

    tabs.innerHTML = TABS.map(
      ([tabId, label]) => `
      <button type="button" class="tab ${tabId === this.ctx.state.tab ? "active" : ""}" data-tab="${escapeHtml(tabId)}">
        ${escapeHtml(label)}
      </button>
    `
    ).join("");
  }

  renderContent() {
    document.querySelector("#content").innerHTML = this.tabRegistry.render(this.ctx.state.tab);
  }

  render() {
    if (!this.ctx.hasData) return;

    this.renderSummary();
    this.renderTabs();
    this.renderTitleFilters();
    this.renderMentionFilters();
    this.renderContent();
  }
}
