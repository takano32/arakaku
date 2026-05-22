function renderArticleSourceDetailPanel(bodyHtml) {
  if (!bodyHtml) {
    return "";
  }

  return `<div class="article-source-detail-panel">${bodyHtml}</div>`;
}

function renderArticleSourceDetail(bodyHtml) {
  if (!bodyHtml) {
    return "";
  }

  return `
    <details class="article-source-detail">
      <summary>
        <span class="article-source-detail-closed">▶ 詳細</span>
        <span class="article-source-detail-open">▼ 詳細</span>
      </summary>
      ${renderArticleSourceDetailPanel(bodyHtml)}
    </details>
  `;
}

function renderVideoEmbed(video) {
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

function renderVideoDocumentDetail(video) {
  const document = sourceDocumentForVideo(video);
  const embed = renderVideoEmbed(video);
  const detailHtml = document?.content_text
    ? renderArticleSourceDetail(`<pre>${escapeHtml(document.content_text)}</pre>`)
    : "";
  const embedHtml = embed
    ? `<div class="article-source-video-embed">${embed}</div>`
    : "";

  if (!detailHtml && !embedHtml) {
    return "";
  }

  return `${detailHtml}${embedHtml}`;
}

function renderVideoLinkWithDetail(video, label = video?.title || video?.video_id || "動画") {
  if (!video?.url) {
    return `<code>${escapeHtml(video?.video_id || label)}</code>`;
  }

  return `
    <span class="article-source-ref">
      <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(label)}
      </a>
      ${renderVideoDocumentDetail(video)}
    </span>
  `;
}

function renderVideoLinks(entityType, entityId) {
  const items = videosForEntity(entityType, entityId);

  if (items.length === 0) {
    return "";
  }

  return `
    <section class="video-links">
      <h3>動画</h3>
      ${renderRelatedItemGrid(items.map(({ link, video }) => renderRelatedItemCard(`
        ${renderVideoLinkWithDetail(video)}
        <span class="video-badge">${escapeHtml(relationTypeLabel(link.relation_type || video.video_type))}</span>
        ${link.notes ? `<p class="meta">${escapeHtml(link.notes)}</p>` : ""}
      `, "video-link-card")).join(""))}
    </section>
  `;
}

function mentionSearchText(mention) {
  const document = sourceDocumentById(mention.source_id);

  return [
    mention.mention_type,
    mention.entity_type,
    mention.entity_hint,
    mention.matched_text,
    mention.context,
    mention.source_id,
    mention.source_ref_id,
    mention.confidence,
    mention.notes,
    document?.title,
    document?.url,
  ].filter(Boolean).join(" ");
}

function mentionSortValue(mention) {
  return `${mention.source_id ?? ""}:${String(mention.line_number ?? "").padStart(6, "0")}`;
}

function sourceMentionSummary(mention) {
  const label = mentionTypeLabel(mention.mention_type);
  const text = mention.matched_text || mention.context || mention.mention_id;

  return renderRelatedItemCard(`
    <span class="video-badge">${escapeHtml(label)}</span>
    <span>${escapeHtml(text)}</span>
    ${renderSourceMentionLink(mention)}
  `, "source-mention-item-card");
}

function renderRelatedSourceMentions(mentions, title = "出典候補") {
  const uniqueMentions = [...new Map(
    mentions.map((mention) => [mention.mention_id, mention])
  ).values()]
    .sort((a, b) => mentionSortValue(a).localeCompare(mentionSortValue(b), "ja"))
    .slice(0, 5);

  if (uniqueMentions.length === 0) {
    return "";
  }

  return `
    <section class="related-source-mentions">
      <h3>${escapeHtml(title)}</h3>
      ${renderRelatedItemGrid(uniqueMentions.map(sourceMentionSummary).join(""))}
    </section>
  `;
}

function sourceMentionDocumentSummary(sourceId) {
  const document = sourceDocumentById(sourceId);

  if (!document) {
    return `<span class="meta">${escapeHtml(sourceId)}</span>`;
  }

  const title = document.title || document.source_ref_id || sourceId;

  return `
    <span class="meta">
      ${escapeHtml(sourceTypeLabel(document.source_type))}
      /
      ${renderSourceDocumentLink(document, title, document.url)}
    </span>
  `;
}

function renderSourceDocumentDetail(document) {
  if (document?.source_type !== "note_article" || !document.content_text) {
    return "";
  }

  return renderArticleSourceDetail(`<pre>${escapeHtml(document.content_text)}</pre>`);
}

function renderSourceDocumentLink(document, title, url) {
  const label = title || document?.title || document?.source_ref_id || document?.source_id || "出典";
  const href = url || document?.url;
  const detail = renderSourceDocumentDetail(document);
  const link = href
    ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
    : `<code>${escapeHtml(label)}</code>`;

  return `
    <span class="article-source-ref">
      ${link}
      ${detail}
    </span>
  `;
}

function sourceMentionGroupSummary(sourceId, mentions) {
  const counts = mentions.reduce((acc, mention) => {
    acc[mention.mention_type] = (acc[mention.mention_type] ?? 0) + 1;
    return acc;
  }, {});
  const firstMention = [...mentions].sort((a, b) =>
    mentionSortValue(a).localeCompare(mentionSortValue(b), "ja")
  )[0];
  const text = firstMention?.matched_text || firstMention?.context || firstMention?.mention_id || "";

  return renderRelatedItemCard(`
    ${sourceMentionDocumentSummary(sourceId)}
    <div class="video-badges">
      ${Object.entries(counts).map(([mentionType, count]) => `
        <span class="video-badge">${escapeHtml(mentionTypeLabel(mentionType))} ${escapeHtml(count)}</span>
      `).join("")}
    </div>
    <span>${escapeHtml(text)}</span>
  `, "source-mention-group-card");
}

function renderGroupedSourceMentions(mentions, title = "出典候補") {
  const groups = new Map();

  for (const mention of mentions) {
    if (!groups.has(mention.source_id)) {
      groups.set(mention.source_id, []);
    }
    groups.get(mention.source_id).push(mention);
  }

  const groupedMentions = [...groups.entries()]
    .sort(([, left], [, right]) => mentionSortValue(left[0]).localeCompare(mentionSortValue(right[0]), "ja"))
    .slice(0, 3);

  if (groupedMentions.length === 0) {
    return "";
  }

  return `
    <section class="related-source-mentions">
      <h3>${escapeHtml(title)}</h3>
      ${renderRelatedItemGrid(groupedMentions.map(([sourceId, sourceMentions]) =>
        sourceMentionGroupSummary(sourceId, sourceMentions)
      ).join(""))}
    </section>
  `;
}

function referenceSortValue(reference) {
  const confidenceOrder = { high: "0", medium: "1", low: "2" };

  return [
    confidenceOrder[reference.confidence] ?? "3",
    reference.source_title ?? "",
    reference.candidate_id ?? "",
  ].join(":");
}

function splitReferenceTokens(value) {
  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function referenceMentionBadges(reference) {
  return splitReferenceTokens(reference.mention_types)
    .map((token) => {
      const [mentionType, count] = token.split(":").map((item) => item.trim());
      const label = mentionTypeLabel(mentionType);
      return `<span class="video-badge">${escapeHtml(count ? `${label} ${count}` : label)}</span>`;
    })
    .join("");
}

function sourceReferenceSummary(reference) {
  const title = reference.source_title || reference.source_ref_id || reference.source_id;
  const matchedTexts = splitReferenceTokens(reference.matched_texts).slice(0, 3).join(" / ");
  const document = sourceDocumentById(reference.source_id);

  return renderRelatedItemCard(`
    <span class="meta">
      ${escapeHtml(sourceTypeLabel(reference.source_type))}
      /
      ${renderSourceDocumentLink(document, title, reference.source_url)}
    </span>
    <div class="video-badges">
      <span class="video-badge">候補 ${escapeHtml(reference.confidence || "unknown")}</span>
      ${referenceMentionBadges(reference)}
    </div>
    ${matchedTexts ? `<span>${escapeHtml(matchedTexts)}</span>` : ""}
    ${reference.line_numbers ? `<p class="meta">line ${escapeHtml(reference.line_numbers)}</p>` : ""}
  `, "source-reference-card");
}

function sourceReferenceSearchText(reference) {
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
  ].filter(Boolean).join(" ");
}

function renderSourceReferences(references, title = "出典候補") {
  const uniqueReferences = [...new Map(
    references.map((reference) => [reference.candidate_id, reference])
  ).values()]
    .sort((a, b) => referenceSortValue(a).localeCompare(referenceSortValue(b), "ja"))
    .slice(0, 5);

  if (uniqueReferences.length === 0) {
    return "";
  }

  return `
    <section class="related-source-mentions">
      <h3>${escapeHtml(title)}</h3>
      ${renderRelatedItemGrid(uniqueReferences.map(sourceReferenceSummary).join(""))}
    </section>
  `;
}

function sourceReferencesForBout(bout) {
  return (state.data.sourceBoutReferences ?? []).filter((reference) =>
    reference.bout_id === bout.bout_id
  );
}

function sourceReferencesForEvent(event) {
  return (state.data.sourceEventReferences ?? []).filter((reference) =>
    reference.event_id === event.event_id
  );
}

function sourceReferenceForVideo(video) {
  return (state.data.sourceVideoReferences ?? []).find((reference) =>
    reference.video_id === video.video_id
  );
}

function sourceReferenceCountsForDocument(sourceId) {
  const countBySource = (references) =>
    references.filter((reference) => reference.source_id === sourceId).length;

  return {
    events: countBySource(state.data.sourceEventReferences ?? []),
    bouts: countBySource(state.data.sourceBoutReferences ?? []),
    videos: countBySource(state.data.sourceVideoReferences ?? []),
  };
}

function renderSourceReferenceCounts(sourceId) {
  const counts = sourceReferenceCountsForDocument(sourceId);
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

function sourceMentionsForBout(bout) {
  const mentionTypes = new Set(["matchup", "result"]);
  const fighterNames = (bout.fighters ?? [])
    .map((fighter) => fighter.name)
    .filter(Boolean);
  const matchupText = bout.matchup || fighterNames.join(" vs ");
  const eventText = eventName(bout.event_id);

  return (state.data.sourceMentions ?? []).filter((mention) => {
    if (!mentionTypes.has(mention.mention_type)) {
      return false;
    }

    const text = mentionSearchText(mention);
    if (matchupText && text.includes(matchupText)) {
      return true;
    }

    if (eventText && text.includes(eventText)) {
      return true;
    }

    return fighterNames.length >= 2 && fighterNames.every((name) => text.includes(name));
  });
}

function sourceMentionsForEvent(event) {
  const mentionTypes = new Set(["event", "matchup", "result"]);
  const eventText = event.name || event.event_id;

  return (state.data.sourceMentions ?? []).filter((mention) => {
    if (!mentionTypes.has(mention.mention_type)) {
      return false;
    }

    return eventText && mentionSearchText(mention).includes(eventText);
  });
}

function sourceDocumentForVideo(video) {
  return (state.data.sourceDocuments ?? []).find((document) =>
    document.source_type === "youtube_description" &&
    (
      document.source_ref_id === video.video_id ||
      document.source_id === `youtube_description:${video.video_id}` ||
      document.url === video.url
    )
  );
}

function sourceMentionCountsForDocument(sourceId) {
  const counts = { note_url: 0, matchup: 0, result: 0 };

  for (const mention of state.data.sourceMentions ?? []) {
    if (mention.source_id !== sourceId || !(mention.mention_type in counts)) {
      continue;
    }
    counts[mention.mention_type] += 1;
  }

  return counts;
}

function renderVideoDescriptionPreview(video) {
  const reference = sourceReferenceForVideo(video);
  const document = sourceDocumentForVideo(video);

  if (!reference && !document) {
    return "";
  }

  const counts = document ? sourceMentionCountsForDocument(document.source_id) : {};
  const preview = reference?.content_preview || document?.content_preview || "プレビュー未入力";
  const mentionBadges = reference
    ? referenceMentionBadges(reference)
    : `
        <span class="video-badge">note URL ${escapeHtml(counts.note_url ?? 0)}</span>
        <span class="video-badge">対戦カード ${escapeHtml(counts.matchup ?? 0)}</span>
        <span class="video-badge">結果 ${escapeHtml(counts.result ?? 0)}</span>
      `;

  return `
    <section class="video-description-preview">
      <h3>YouTube概要欄</h3>
      <p>${escapeHtml(preview)}</p>
      <div class="video-badges">
        ${mentionBadges}
      </div>
    </section>
  `;
}
