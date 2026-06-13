import { boutResultText, escapeHtml } from "../ui/html-utils.js";

// 役割: bout を「関連試合カード」として描画する。fighter プロフィールでは対戦相手の試合一覧、
//   event ページでは大会内の試合一覧を、対戦カード・結果・紐づく動画つきで出す。
// アーキ上の位置: main.js で new され ctx.related として tab-renderers から呼ばれる。データは
//   ctx.repo (relatedBoutsForFighter / boutsForEvent) から取得し、整形は ctx.navigation
//   (対戦カード/結果サマリ)、ctx.sources (動画リンク)、ctx.components (grid/card) に委譲する。
// 不変条件: showEvent (相手側=どの大会か表示) と showOrder (大会内=第N試合表示) は呼び出し文脈で
//   排他的に使う。numbers_records の有無で「名鑑」バッジを出すのは Apple Numbers 由来データの目印。
// 関連スキル: .agents/skills/arakaku-viewer-ui
/** 関連試合カードの描画サービス */
export class RelatedRenderers {
  /** @param {import("../core/view-context.js").ViewContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }

  renderBoutResultMeta(bout) {
    const text = boutResultText(bout);
    return text ? `<p>${escapeHtml(text)}</p>` : "";
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
