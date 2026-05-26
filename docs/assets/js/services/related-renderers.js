import { boutResultText, escapeHtml } from "../ui/html-utils.js";

/** 関連試合カードの描画サービス */
export class RelatedRenderers {
  /** @param {import("../core/view-context.js").ViewContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }

  renderBoutResultMeta(bout) {
    const text = boutResultText(bout);
    return text ? `<p class="meta">${escapeHtml(text)}</p>` : "";
  }

  renderBoutCard(bout, { showEvent = false, showOrder = false } = {}) {
    const { components, navigation, sources } = this.ctx;
    const headerParts = [];

    if (showOrder) {
      headerParts.push(`<p class="meta bout-order">第${escapeHtml(bout.bout_order ?? "?")}試合</p>`);
    }

    if (showEvent) {
      headerParts.push(
        `<p class="meta">${navigation.eventLink(bout.event_id, this.ctx.repo.eventName(bout.event_id))}</p>`
      );
    }

    return components.relatedItem(
      `
      ${headerParts.join("")}
      <h4 class="related-bout-title">
        ${navigation.boutMatchup(bout)}
        ${bout.numbers_records?.length ? `<span class="video-badge">名鑑</span>` : ""}
      </h4>
      <p>${navigation.renderBoutResultSummary(bout)}</p>
      ${this.renderBoutResultMeta(bout)}
      ${sources.renderVideoLinks("bout", bout.bout_id)}
    `,
      "bout-card"
    );
  }

  renderRelatedBoutsSection(title, bouts, options = {}) {
    const { components } = this.ctx;

    if (bouts.length === 0) {
      return `<p class="meta">関連試合はまだ登録されていません。</p>`;
    }

    return `
      <section class="related-bouts">
        <h3>${escapeHtml(title)}</h3>
        ${components.relatedGrid(bouts.map((bout) => this.renderBoutCard(bout, options)).join(""))}
      </section>
    `;
  }

  renderRelatedBouts(fighterId) {
    return this.renderRelatedBoutsSection("関連試合", this.ctx.repo.relatedBoutsForFighter(fighterId), {
      showEvent: true,
    });
  }

  renderEventBouts(eventId) {
    return this.renderRelatedBoutsSection("関連試合", this.ctx.repo.boutsForEvent(eventId), {
      showOrder: true,
    });
  }
}
