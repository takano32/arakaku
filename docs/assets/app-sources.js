function renderVideoLinks(entityType, entityId) {
  const items = videosForEntity(entityType, entityId);

  if (items.length === 0) {
    return "";
  }

  return `
    <section class="video-links">
      <h3>動画</h3>
      <ul>
        ${items.map(({ link, video }) => `
          <li>
            <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(video.title)}
            </a>
            <span class="video-badge">${escapeHtml(relationTypeLabel(link.relation_type || video.video_type))}</span>
            ${link.notes ? `<p class="meta">${escapeHtml(link.notes)}</p>` : ""}
          </li>
        `).join("")}
      </ul>
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

  return `
    <li>
      <span class="video-badge">${escapeHtml(label)}</span>
      <span>${escapeHtml(text)}</span>
      ${renderSourceMentionLink(mention)}
    </li>
  `;
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
      <ul>
        ${uniqueMentions.map(sourceMentionSummary).join("")}
      </ul>
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
      <a href="${escapeHtml(document.url)}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(title)}
      </a>
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

  return `
    <li>
      ${sourceMentionDocumentSummary(sourceId)}
      <div class="video-badges">
        ${Object.entries(counts).map(([mentionType, count]) => `
          <span class="video-badge">${escapeHtml(mentionTypeLabel(mentionType))} ${escapeHtml(count)}</span>
        `).join("")}
      </div>
      <span>${escapeHtml(text)}</span>
    </li>
  `;
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
      <ul>
        ${groupedMentions.map(([sourceId, sourceMentions]) =>
          sourceMentionGroupSummary(sourceId, sourceMentions)
        ).join("")}
      </ul>
    </section>
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
  const document = sourceDocumentForVideo(video);

  if (!document) {
    return "";
  }

  const counts = sourceMentionCountsForDocument(document.source_id);

  return `
    <section class="video-description-preview">
      <h3>YouTube概要欄</h3>
      <p>${escapeHtml(document.content_preview || "プレビュー未入力")}</p>
      <div class="video-badges">
        <span class="video-badge">note URL ${escapeHtml(counts.note_url)}</span>
        <span class="video-badge">対戦カード ${escapeHtml(counts.matchup)}</span>
        <span class="video-badge">結果 ${escapeHtml(counts.result)}</span>
      </div>
    </section>
  `;
}
