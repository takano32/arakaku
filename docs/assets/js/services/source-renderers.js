import { escapeHtml, externalLink } from "../ui/html-utils.js";

/** 出典・動画・言及候補の描画サービス */
export class SourceRenderers {
  /** @param {import("../core/view-context.js").ViewContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }

  renderArticleSourceDetailPanel(bodyHtml) {
    if (!bodyHtml) return "";
    return `<div class="article-source-detail-panel">${bodyHtml}</div>`;
  }

  renderArticleSourceDetail(bodyHtml) {
    if (!bodyHtml) return "";

    return `
      <details class="article-source-detail">
        <summary>
          <span class="article-source-detail-closed">▶ 詳細</span>
          <span class="article-source-detail-open">▼ 詳細</span>
        </summary>
        ${this.renderArticleSourceDetailPanel(bodyHtml)}
      </details>
    `;
  }

  renderVideoEmbed(video) {
    if (video.platform === "youtube" && video.platform_video_id) {
      return `
        <div class="video-embed">
          <iframe
            width="320"
            height="240"
            src="https://www.youtube.com/embed/${escapeHtml(video.platform_video_id)}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy"
          ></iframe>
        </div>
      `;
    }
    return "";
  }

  renderVideoSourceBlock(video, label = video?.title || video?.video_id || "動画") {
    if (!video?.url) {
      return `<code>${escapeHtml(video?.video_id || label)}</code>`;
    }

    const document = this.ctx.repo.sourceDocumentForVideo(video);
    const embed = this.renderVideoEmbed(video);
    const detailHtml = document?.content_text
      ? this.renderArticleSourceDetail(`<pre>${escapeHtml(document.content_text)}</pre>`)
      : "";
    const embedHtml = embed ? `<div class="video-source-embed">${embed}</div>` : "";

    return `
      <div class="video-source-block">
        <p class="video-source-title">${externalLink(video.url, label)}</p>
        ${detailHtml}
        ${embedHtml}
      </div>
    `;
  }

  renderVideoLinks(entityType, entityId) {
    const items = this.ctx.repo.videosForEntity(entityType, entityId);
    const { components, labels } = this.ctx;

    if (items.length === 0) {
      return "";
    }

    return components.section(
      "動画",
      components.relatedGrid(
        items
          .map(
            ({ link, video }) => `
          <div class="video-link-item">
            ${this.renderVideoSourceBlock(video)}
            <div class="video-link-meta">
              <span class="video-badge">${escapeHtml(labels.relationType(link.relation_type || video.video_type))}</span>
              ${link.notes ? `<p class="meta">${escapeHtml(link.notes)}</p>` : ""}
            </div>
          </div>
        `
          )
          .join("")
      ),
      "video-links"
    );
  }

  mentionSortValue(mention) {
    return `${mention.source_id ?? ""}:${String(mention.line_number ?? "").padStart(6, "0")}`;
  }

  renderSourceMentionLink(mention) {
    const document = this.ctx.repo.sourceDocumentById(mention.source_id);
    const { labels } = this.ctx;

    if (!document) {
      return `<span class="meta">${escapeHtml(mention.source_id)}</span>`;
    }

    const title = document.title || document.source_ref_id || mention.source_id;

    return `
      <span class="meta">
        ${escapeHtml(labels.sourceType(document.source_type))}
        /
        ${externalLink(document.url, title)}
        /
        line ${escapeHtml(mention.line_number)}
      </span>
    `;
  }

  sourceMentionSummary(mention) {
    const { components, labels } = this.ctx;
    const label = labels.mentionType(mention.mention_type);
    const text = mention.matched_text || mention.context || mention.mention_id;

    return components.relatedItem(
      `
      <span class="video-badge">${escapeHtml(label)}</span>
      <span>${escapeHtml(text)}</span>
      ${this.renderSourceMentionLink(mention)}
    `,
      "source-mention-item-card"
    );
  }

  referenceSortValue(reference) {
    const confidenceOrder = { high: "0", medium: "1", low: "2" };
    return [
      confidenceOrder[reference.confidence] ?? "3",
      reference.source_title ?? "",
      reference.candidate_id ?? "",
    ].join(":");
  }

  splitReferenceTokens(value) {
    return String(value ?? "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  referenceMentionBadges(reference) {
    const { labels } = this.ctx;
    return this.splitReferenceTokens(reference.mention_types)
      .map((token) => {
        const [mentionType, count] = token.split(":").map((item) => item.trim());
        const label = labels.mentionType(mentionType);
        return `<span class="video-badge">${escapeHtml(count ? `${label} ${count}` : label)}</span>`;
      })
      .join("");
  }

  renderSourceDocumentDetail(document) {
    if (document?.source_type !== "note_article" || !document.content_text) {
      return "";
    }
    return this.renderArticleSourceDetail(`<pre>${escapeHtml(document.content_text)}</pre>`);
  }

  renderSourceDocumentLink(document, title, url) {
    const label = title || document?.title || document?.source_ref_id || document?.source_id || "出典";
    const href = url || document?.url;
    const detail = this.renderSourceDocumentDetail(document);
    const link = externalLink(href, label);

    return `
      <span class="article-source-ref">
        ${link}
        ${detail}
      </span>
    `;
  }

  sourceReferenceSummary(reference) {
    const { components, labels } = this.ctx;
    const title = reference.source_title || reference.source_ref_id || reference.source_id;
    const matchedTexts = this.splitReferenceTokens(reference.matched_texts).slice(0, 3).join(" / ");
    const document = this.ctx.repo.sourceDocumentById(reference.source_id);

    return components.relatedItem(
      `
      <span class="meta">
        ${escapeHtml(labels.sourceType(reference.source_type))}
        /
        ${this.renderSourceDocumentLink(document, title, reference.source_url)}
      </span>
      <div class="video-badges">
        <span class="video-badge">候補 ${escapeHtml(reference.confidence || "unknown")}</span>
        ${this.referenceMentionBadges(reference)}
      </div>
      ${matchedTexts ? `<span>${escapeHtml(matchedTexts)}</span>` : ""}
      ${reference.line_numbers ? `<p class="meta">line ${escapeHtml(reference.line_numbers)}</p>` : ""}
    `,
      "source-reference-card"
    );
  }

  sourceReferenceSearchText(reference) {
    return [
      reference.candidate_id,
      reference.source_id,
      reference.source_type,
      reference.source_ref_id,
      reference.source_title,
      reference.source_url,
      reference.line_numbers,
      reference.mention_types,
      reference.matched_texts,
      reference.content_preview,
      reference.confidence,
      reference.notes,
    ]
      .filter(Boolean)
      .join(" ");
  }

  sourceReferencesForBout(bout) {
    return this.ctx.repo.sourceReferencesForBout(bout);
  }

  renderSourceReferences(references, title = "出典候補") {
    const { components } = this.ctx;
    const uniqueReferences = [...new Map(references.map((reference) => [reference.candidate_id, reference])).values()]
      .sort((a, b) => this.referenceSortValue(a).localeCompare(this.referenceSortValue(b), "ja"))
      .slice(0, 5);

    if (uniqueReferences.length === 0) {
      return "";
    }

    return components.section(
      title,
      components.relatedGrid(uniqueReferences.map((reference) => this.sourceReferenceSummary(reference)).join("")),
      "related-source-mentions"
    );
  }

  sourceReferenceCountsForDocument(sourceId) {
    return this.ctx.repo.countSourceReferences(sourceId);
  }

  renderSourceReferenceCounts(sourceId) {
    const counts = this.sourceReferenceCountsForDocument(sourceId);
    const total = counts.events + counts.bouts + counts.videos;

    if (total === 0) {
      return "";
    }

    return `
      <div class="video-badges">
        <span class="video-badge">大会候補 ${escapeHtml(counts.events)}</span>
        <span class="video-badge">試合候補 ${escapeHtml(counts.bouts)}</span>
        <span class="video-badge">動画候補 ${escapeHtml(counts.videos)}</span>
      </div>
    `;
  }

  renderArticleRefs(articleIds) {
    const ids = (Array.isArray(articleIds) ? articleIds : [articleIds]).filter(Boolean);
    if (ids.length === 0) {
      return "未入力";
    }

    return ids
      .map((articleId) => {
        const article = this.ctx.repo.findArticle(articleId);
        const document = this.ctx.repo.sourceDocumentForArticle(articleId);
        const label = article?.title || articleId;
        const detail = document?.content_text
          ? this.renderArticleSourceDetail(`<pre>${escapeHtml(document.content_text)}</pre>`)
          : "";

        if (!article?.url) {
          return `
            <span class="article-source-ref">
              <code>${escapeHtml(articleId)}</code>
              ${detail}
            </span>
          `;
        }

        return `
          <span class="article-source-ref">
            ${externalLink(article.url, label)}
            ${detail}
          </span>
        `;
      })
      .join(", ");
  }

  renderVideoRefs(videoIds, options = {}) {
    const ids = (videoIds ?? []).filter(Boolean);
    if (ids.length === 0) {
      return "未入力";
    }

    if (options.inline) {
      return ids
        .map((videoId) => {
          const video = this.ctx.repo.videoById(videoId);
          if (!video?.url) {
            return `<code>${escapeHtml(videoId)}</code>`;
          }
          return externalLink(video.url, video.title || videoId);
        })
        .join(", ");
    }

    return ids
      .map((videoId) => {
        const video = this.ctx.repo.videoById(videoId);
        if (!video) {
          return `<code>${escapeHtml(videoId)}</code>`;
        }
        return this.renderVideoSourceBlock(video, video.title || videoId);
      })
      .join("");
  }

  renderVideoDescriptionPreview(video) {
    const { reference, document } = this.ctx.repo.sourceContextForVideo(video);

    if (!reference && !document) {
      return "";
    }

    const counts = document ? this.sourceMentionCountsForDocument(document.source_id) : {};
    const preview = reference?.content_preview || document?.content_preview || "プレビュー未入力";
    const mentionBadges = reference
      ? this.referenceMentionBadges(reference)
      : `
        <span class="video-badge">note URL ${escapeHtml(counts.note_url ?? 0)}</span>
        <span class="video-badge">対戦カード ${escapeHtml(counts.matchup ?? 0)}</span>
        <span class="video-badge">結果 ${escapeHtml(counts.result ?? 0)}</span>
      `;

    return this.ctx.components.section(
      "YouTube概要欄",
      `
        <p>${escapeHtml(preview)}</p>
        <div class="video-badges">
          ${mentionBadges}
        </div>
      `,
      "video-description-preview"
    );
  }

  sourceMentionCountsForDocument(sourceId) {
    return this.ctx.repo.countSourceMentions(sourceId, ["note_url", "matchup", "result"]);
  }

  renderSourceBody(document) {
    const body = document.content_text ?? "";

    if (!body) {
      return `<p class="meta">本文は空です。</p>`;
    }

    return `
      <details class="source-body">
        <summary>本文を表示</summary>
        <pre>${escapeHtml(body)}</pre>
      </details>
    `;
  }
}
