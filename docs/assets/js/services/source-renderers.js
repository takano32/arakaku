import { escapeHtml, externalLink } from "../ui/html-utils.js";

/** 出典・動画・言及候補の描画サービス */
export class SourceRenderers {
  /** @param {import("../core/view-context.js").ViewContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }

  renderArticleSourceDetailPanel(bodyHtml) {
    return bodyHtml ? `<div class="article-source-detail-panel">${bodyHtml}</div>` : "";
  }

  renderArticleSourceDetail(bodyHtml) {
    if (!bodyHtml) return "";
    return `<details class="article-source-detail"><summary><span class="article-source-detail-closed">▶ 詳細</span><span class="article-source-detail-open">▼ 詳細</span></summary>${this.renderArticleSourceDetailPanel(bodyHtml)}</details>`;
  }

  renderVideoEmbed(v) {
    if (v.platform !== "youtube" || !v.platform_video_id) return "";
    return `<div class="video-embed"><iframe width="320" height="240" src="https://www.youtube.com/embed/${escapeHtml(v.platform_video_id)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }

  renderVideoSourceBlock(v, label = v?.title || v?.video_id || "動画") {
    if (!v?.url) return `<code>${escapeHtml(v?.video_id || label)}</code>`;
    const d = this.ctx.repo.sourceDocumentForVideo(v);
    const detail = d?.content_text ? this.renderArticleSourceDetail(`<pre>${escapeHtml(d.content_text)}</pre>`) : "";
    const embed = this.renderVideoEmbed(v);
    return `<div class="video-source-block"><p class="video-source-title">${externalLink(v.url, label)}</p>${detail}${embed ? `<div class="video-source-embed">${embed}</div>` : ""}</div>`;
  }

  renderVideoLinks(type, id, excludeVideoIds = new Set()) {
    const { components, labels, repo } = this.ctx;
    const excluded = excludeVideoIds instanceof Set ? excludeVideoIds : new Set(excludeVideoIds);
    const items = repo.videosForEntity(type, id);
    const visibleItems = items.filter(({ video }) => !excluded.has(video.video_id));
    if (visibleItems.length === 0) return "";
    const cards = visibleItems.map(({ link, video }) => `
      <div class="video-link-item">
        ${this.renderVideoSourceBlock(video)}
        <div class="video-link-meta">
          <span class="video-badge">${escapeHtml(labels.relationType(link.relation_type || video.video_type))}</span>
          ${link.notes ? `<p class="meta">${escapeHtml(link.notes)}</p>` : ""}
        </div>
      </div>
    `).join("");
    return components.section("動画", components.relatedGrid(cards), "video-links");
  }

  mentionSortValue(m) { return `${m.source_id ?? ""}:${String(m.line_number ?? "").padStart(6, "0")}`; }

  renderSourceMentionLink(m) {
    const { labels, repo } = this.ctx;
    const d = repo.sourceDocumentById(m.source_id);
    if (!d) return `<span class="meta">${escapeHtml(m.source_id)}</span>`;
    return `<span class="meta">${escapeHtml(labels.sourceType(d.source_type))} / ${externalLink(d.url, d.title || d.source_ref_id || m.source_id)} / line ${escapeHtml(m.line_number)}</span>`;
  }

  sourceMentionSummary(m) {
    const { components, labels } = this.ctx;
    return components.relatedItem(`<span class="video-badge">${escapeHtml(labels.mentionType(m.mention_type))}</span> <span>${escapeHtml(m.matched_text || m.context || m.mention_id)}</span> ${this.renderSourceMentionLink(m)}`, "source-mention-item-card");
  }

  referenceSortValue(r) {
    const order = { high: "0", medium: "1", low: "2" };
    return `${order[r.confidence] ?? "3"}:${r.source_title ?? ""}:${r.candidate_id ?? ""}`;
  }

  splitTokens(v) { return String(v ?? "").split("|").map(t => t.trim()).filter(Boolean); }

  referenceMentionBadges(r) {
    const { labels } = this.ctx;
    return this.splitTokens(r.mention_types).map(t => {
      const [type, count] = t.split(":").map(x => x.trim());
      const label = labels.mentionType(type);
      return `<span class="video-badge">${escapeHtml(count ? `${label} ${count}` : label)}</span>`;
    }).join("");
  }

  renderSourceDocumentDetail(d) {
    return (d?.source_type === "note_article" && d.content_text) ? this.renderArticleSourceDetail(`<pre>${escapeHtml(d.content_text)}</pre>`) : "";
  }

  renderSourceDocumentLink(d, title, url) {
    const label = title || d?.title || d?.source_ref_id || d?.source_id || "出典";
    return `<span class="article-source-ref">${externalLink(url || d?.url, label)}${this.renderSourceDocumentDetail(d)}</span>`;
  }

  sourceReferenceSummary(r) {
    const { components, labels, repo } = this.ctx;
    const d = repo.sourceDocumentById(r.source_id);
    const matched = this.splitTokens(r.matched_texts).slice(0, 3).join(" / ");
    return components.relatedItem(`
      <span class="meta">${escapeHtml(labels.sourceType(r.source_type))} / ${this.renderSourceDocumentLink(d, r.source_title, r.source_url)}</span>
      <div class="video-badges"><span class="video-badge">候補 ${escapeHtml(r.confidence || "unknown")}</span>${this.referenceMentionBadges(r)}</div>
      ${matched ? `<span>${escapeHtml(matched)}</span>` : ""}
      ${r.line_numbers ? `<p class="meta">line ${escapeHtml(r.line_numbers)}</p>` : ""}
    `, "source-reference-card");
  }

  sourceReferenceSearchText(r) {
    return [r.candidate_id, r.source_id, r.source_type, r.source_ref_id, r.source_title, r.source_url, r.line_numbers, r.mention_types, r.matched_texts, r.content_preview, r.confidence, r.notes].filter(Boolean).join(" ");
  }

  sourceReferencesForBout(b) { return this.ctx.repo.sourceReferencesForBout(b); }

  renderSourceReferences(refs, title = "出典候補") {
    const { components } = this.ctx;
    const list = this.uniqueSourceReferences(refs)
      .sort((a, b) => this.referenceSortValue(a).localeCompare(this.referenceSortValue(b), "ja"))
      .slice(0, 5);
    if (list.length === 0) return "";
    return components.section(title, components.relatedGrid(list.map(r => this.sourceReferenceSummary(r)).join("")), "related-source-mentions");
  }

  uniqueSourceReferences(refs) {
    return [...new Map(refs.map((reference) => [reference.candidate_id, reference])).values()];
  }

  renderSourceReferenceCounts(sid) {
    const c = this.ctx.repo.countSourceReferences(sid);
    if (c.events + c.bouts + c.videos === 0) return "";
    return `<div class="video-badges"><span class="video-badge">大会候補 ${c.events}</span><span class="video-badge">試合候補 ${c.bouts}</span><span class="video-badge">動画候補 ${c.videos}</span></div>`;
  }

  renderArticleRefs(aids) {
    const ids = (Array.isArray(aids) ? aids : [aids]).filter(Boolean);
    if (ids.length === 0) return "未入力";
    return ids.map((id) => this.renderArticleRef(id)).join(", ");
  }

  renderArticleRef(id) {
    const article = this.ctx.repo.findArticle(id);
    const document = this.ctx.repo.sourceDocumentForArticle(id);
    const detail = document?.content_text ? this.renderArticleSourceDetail(`<pre>${escapeHtml(document.content_text)}</pre>`) : "";
    const link = article?.url ? externalLink(article.url, article.title || id) : `<code>${escapeHtml(id)}</code>`;
    return `<span class="article-source-ref">${link}${detail}</span>`;
  }

  renderVideoRefs(vids, opts = {}) {
    const ids = (vids ?? []).filter(Boolean);
    if (ids.length === 0) return "未入力";
    return ids.map(id => {
      const v = this.ctx.repo.videoById(id);
      if (opts.inline) return v?.url ? externalLink(v.url, v.title || id) : `<code>${escapeHtml(id)}</code>`;
      return v ? this.renderVideoSourceBlock(v, v.title || id) : `<code>${escapeHtml(id)}</code>`;
    }).join(opts.inline ? ", " : "");
  }

  renderVideoDescriptionPreview(v) {
    const { components, repo } = this.ctx;
    const { reference: r, document: d } = repo.sourceContextForVideo(v);
    if (!r && !d) return "";
    const c = d ? repo.countSourceMentions(d.source_id, ["note_url", "matchup", "result"]) : {};
    const preview = r?.content_preview || d?.content_preview || "プレビュー未入力";
    const badges = r ? this.referenceMentionBadges(r) : this.sourceMentionCountBadges(c);
    return components.section("YouTube概要欄", `<p>${escapeHtml(preview)}</p><div class="video-badges">${badges}</div>`, "video-description-preview");
  }

  sourceMentionCountBadges(counts) {
    return [
      `note URL ${counts.note_url ?? 0}`,
      `対戦カード ${counts.matchup ?? 0}`,
      `結果 ${counts.result ?? 0}`,
    ].map((label) => `<span class="video-badge">${escapeHtml(label)}</span>`).join("");
  }

  renderSourceBody(d) {
    return d.content_text ? `<details class="source-body"><summary>本文を表示</summary><pre>${escapeHtml(d.content_text)}</pre></details>` : `<p class="meta">本文は空です。</p>`;
  }
}
