function renderSummary() {
  const d = state.data;

  const items = [
    ["団体", d.promotions.length],
    ["大会", d.events.length],
    ["試合", d.bouts.length],
    ["選手", d.fighters.length],
    ["王座", d.titles.length],
    ["動画", d.videos.length],
    ["出典", d.sourceDocuments?.length ?? 0],
  ];

  document.querySelector("#summary").innerHTML = items
    .map(([label, count]) => `
      <article class="summary-card">
        <strong>${escapeHtml(count)}</strong>
        <span>${escapeHtml(label)}</span>
      </article>
    `)
    .join("");
}

function renderTitleFilters() {
  const filters = document.querySelector("#title-filters");
  if (!filters) return;

  filters.hidden = state.tab !== "titles";

  const promotionSelect = document.querySelector("#title-promotion-filter");
  const divisionSelect = document.querySelector("#title-division-filter");

  if (!promotionSelect || !divisionSelect || !state.data) return;

  const promotionIds = uniqueSorted(state.data.titles.map((title) => title.promotion_id));
  const divisions = uniqueSorted(state.data.titles.map((title) => title.division));

  promotionSelect.innerHTML = [
    `<option value="">すべての団体</option>`,
    ...promotionIds.map((promotionId) => `
      <option value="${escapeHtml(promotionId)}" ${promotionId === state.titlePromotion ? "selected" : ""}>
        ${escapeHtml(promotionName(promotionId))}
      </option>
    `),
  ].join("");

  divisionSelect.innerHTML = [
    `<option value="">すべての階級</option>`,
    ...divisions.map((division) => `
      <option value="${escapeHtml(division)}" ${division === state.titleDivision ? "selected" : ""}>
        ${escapeHtml(division)}
      </option>
    `),
  ].join("");
}

function renderMentionFilters() {
  const filters = document.querySelector("#mention-filters");
  if (!filters) return;

  filters.hidden = state.tab !== "mentions";

  const mentionTypeSelect = document.querySelector("#mention-type-filter");
  if (!mentionTypeSelect || !state.data) return;

  const mentionTypes = uniqueSorted(
    (state.data.sourceMentions ?? []).map((mention) => mention.mention_type)
  ).sort((a, b) => {
    const orderA = MENTION_TYPE_ORDER.indexOf(a);
    const orderB = MENTION_TYPE_ORDER.indexOf(b);

    if (orderA === -1 && orderB === -1) return String(a).localeCompare(String(b), "ja");
    if (orderA === -1) return 1;
    if (orderB === -1) return -1;
    return orderA - orderB;
  });

  mentionTypeSelect.innerHTML = [
    `<option value="">すべての言及</option>`,
    ...mentionTypes.map((mentionType) => `
      <option value="${escapeHtml(mentionType)}" ${mentionType === state.mentionType ? "selected" : ""}>
        ${escapeHtml(`${mentionTypeLabel(mentionType)} / ${mentionType}`)}
      </option>
    `),
  ].join("");
}

function renderBouts() {
  const bouts = state.focusEventId
    ? state.data.bouts.filter((bout) => bout.event_id === state.focusEventId)
    : state.data.bouts.filter((bout) => includesQuery(boutSearchText(bout)));

  return bouts.map((bout) => `
    <article class="card">
      <h2>${boutMatchup(bout)}</h2>
      <p class="meta">${eventLink(bout.event_id, eventName(bout.event_id))} / ${escapeHtml(bout.division ?? "")}</p>
      <p class="result">
        ${renderBoutResultSummary(bout)}
        ${bout.result?.round ? `${escapeHtml(bout.result.round)}R` : ""}
        ${escapeHtml(bout.result?.time ?? "")}
        ${escapeHtml(bout.result?.method_raw ?? "")}
      </p>
      ${bout.title?.is_title_bout ? `<p class="meta">王座戦: ${escapeHtml(bout.title.note)}</p>` : ""}
      ${renderVideoLinks("bout", bout.bout_id)}
      ${renderGroupedSourceMentions(sourceMentionsForBout(bout))}
    </article>
  `).join("") || emptyMessage();
}

function renderFighters() {
  const fighters = state.focusFighterId
    ? state.data.fighters.filter((fighter) => fighter.fighter_id === state.focusFighterId)
    : state.data.fighters.filter((fighter) => fighterMatchesQuery(fighter));

  return fighters.map((fighter) => `
    <article class="card">
      <h2>${escapeHtml(fighter.display_name)}</h2>
      <p class="meta">${escapeHtml(fighter.main_division ?? "")} / ${escapeHtml(promotionName(fighter.main_promotion_id))}</p>
      <dl>
        <dt>所属</dt>
        <dd>${escapeHtml(fighter.profile?.gym ?? "不明")}</dd>
        <dt>身長・年齢</dt>
        <dd>${escapeHtml(fighter.profile?.height ?? "不明")} / ${escapeHtml(fighter.profile?.age ?? "不明")}</dd>
        <dt>概要</dt>
        <dd>${escapeHtml(fighter.summary || "未入力")}</dd>
      </dl>
      ${renderRelatedBouts(fighter.fighter_id)}
    </article>
  `).join("") || emptyMessage();
}

function renderEvents() {
  const events = state.focusEventId
    ? state.data.events.filter((event) => event.event_id === state.focusEventId)
    : state.data.events.filter((event) =>
        includesQuery([
          event.name,
          promotionName(event.promotion_id),
          event.summary,
        ])
      );

  return events.map((event) => `
    <article class="card">
      <h2>${escapeHtml(event.name)}</h2>
      <p class="meta">${escapeHtml(promotionName(event.promotion_id))} / ${escapeHtml(event.published_at ?? "")}</p>
      <p>${escapeHtml(event.summary || "概要未入力")}</p>
      ${renderVideoLinks("event", event.event_id)}
      ${renderRelatedSourceMentions(sourceMentionsForEvent(event))}
      ${renderEventBouts(event.event_id)}
    </article>
  `).join("") || emptyMessage();
}

function renderPromotions() {
  const promotions = state.data.promotions.filter((promotion) =>
    includesQuery([
      promotion.name,
      promotion.name_en,
      promotion.category,
      promotion.summary,
    ])
  );

  return promotions.map((promotion) => `
    <article class="card">
      <h2>${escapeHtml(promotion.name)}</h2>
      <p class="meta">${escapeHtml(promotion.name_en ?? "")} / ${escapeHtml(promotion.category ?? "")}</p>
      <p>${escapeHtml(promotion.summary || "概要未入力")}</p>
      <dl>
        <dt>会場</dt>
        <dd>${escapeHtml(promotion.rules?.venue ?? "不明")}</dd>
        <dt>ラウンド</dt>
        <dd>${escapeHtml(promotion.rules?.rounds ?? "不明")}</dd>
        <dt>判定</dt>
        <dd>${escapeHtml(promotion.rules?.judging ?? "不明")}</dd>
      </dl>
    </article>
  `).join("") || emptyMessage();
}

function renderVideos() {
  const videos = state.data.videos.filter((video) =>
    includesQuery([
      video.title,
      video.url,
      video.channel_name,
      video.video_type,
      video.link_status,
      video.notes,
      video.duplicate_group_id,
      video.duplicate_note,
      sourceDocumentForVideo(video)?.content_preview,
    ])
  );

  if (videos.length === 0) {
    return emptyMessage();
  }

  return videos.map((video) => `
    <article class="card video-card">
      <h2>
        <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(video.title)}
        </a>
      </h2>

      <p class="meta">
        ${escapeHtml(video.channel_name ?? "")}
        ${video.published_at ? ` / ${escapeHtml(video.published_at)}` : ""}
      </p>

      <div class="video-badges">
        <span class="video-badge">${escapeHtml(videoTypeLabel(video.video_type))}</span>
        <span class="video-badge">${escapeHtml(linkStatusLabel(video.link_status))}</span>
      </div>

      <dl>
        <dt>URL</dt>
        <dd><a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(video.url)}</a></dd>

        <dt>platform_video_id</dt>
        <dd>${escapeHtml(video.platform_video_id ?? "")}</dd>

        ${video.duplicate_group_id ? `
          <dt>重複候補</dt>
          <dd>${escapeHtml(video.duplicate_group_id)}</dd>
        ` : ""}

        ${video.duplicate_note ? `
          <dt>重複メモ</dt>
          <dd>${escapeHtml(video.duplicate_note)}</dd>
        ` : ""}

        ${video.notes ? `
          <dt>メモ</dt>
          <dd>${escapeHtml(video.notes)}</dd>
        ` : ""}
      </dl>
      ${renderVideoDescriptionPreview(video)}
    </article>
  `).join("");
}

function renderTitles() {
  const titles = state.data.titles
    .filter((title) => {
      if (state.titlePromotion && title.promotion_id !== state.titlePromotion) {
        return false;
      }

      if (state.titleDivision && title.division !== state.titleDivision) {
        return false;
      }

      return includesQuery([
        title.title_id,
        title.division,
        promotionName(title.promotion_id),
        ...(title.lineage ?? []).flatMap((reign) => [
          reign.fighter_name,
          reign.reign_label,
        ]),
      ]);
    })
    .sort((a, b) => {
      const promotionCompare = promotionName(a.promotion_id).localeCompare(
        promotionName(b.promotion_id),
        "ja"
      );

      if (promotionCompare !== 0) return promotionCompare;

      return String(a.division ?? "").localeCompare(String(b.division ?? ""), "ja");
    });

  if (titles.length === 0) {
    return emptyMessage();
  }

  let previousGroup = "";

  return titles.map((title) => {
    const group = `${promotionName(title.promotion_id)} / ${title.division ?? "階級未設定"}`;
    const groupHeader = group !== previousGroup
      ? `<h2 class="title-group-heading">${escapeHtml(group)}</h2>`
      : "";

    previousGroup = group;

    const lineage = [...(title.lineage ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((reign) => `
        <li>
          <span class="reign-label">${escapeHtml(reign.reign_label ?? `${reign.order}代`)}</span>
          <span class="fighter-name">${fighterLink(reign.fighter_id, reign.fighter_name)}</span>
        </li>
      `)
      .join("");

    return `
      ${groupHeader}
      <article class="card title-card">
        <h3>${escapeHtml(titleDisplayName(title))}</h3>
        <p class="meta">${escapeHtml(title.title_id)}</p>
        <ol class="lineage-list">
          ${lineage}
        </ol>
      </article>
    `;
  }).join("");
}

function renderSourceBody(document) {
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


function mentionTypeLabel(mentionType) {
  const labels = {
    event: "大会",
    matchup: "対戦カード",
    result: "結果",
    note_url: "note URL",
    youtube_url: "YouTube URL",
    match_result: "試合結果",
  };

  return labels[mentionType] ?? mentionType ?? "言及";
}

function sourceDocumentById(sourceId) {
  return (state.data.sourceDocuments ?? []).find((document) => document.source_id === sourceId);
}

function renderSourceMentionLink(mention) {
  const document = sourceDocumentById(mention.source_id);

  if (!document) {
    return `<span class="meta">${escapeHtml(mention.source_id)}</span>`;
  }

  const title = document.title || document.source_ref_id || mention.source_id;

  return `
    <span class="meta">
      ${escapeHtml(sourceTypeLabel(document.source_type))}
      /
      <a href="${escapeHtml(document.url)}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(title)}
      </a>
      /
      line ${escapeHtml(mention.line_number)}
    </span>
  `;
}

function renderMentions() {
  const mentions = (state.data.sourceMentions ?? []).filter((mention) =>
    (!state.mentionType || mention.mention_type === state.mentionType) &&
    includesQuery([mentionSearchText(mention)])
  );

  if (mentions.length === 0) {
    return emptyMessage();
  }

  return mentions.map((mention) => `
    <article class="card source-mention-card">
      <h2>
        <span class="video-badge">${escapeHtml(mentionTypeLabel(mention.mention_type))}</span>
        ${escapeHtml(mention.entity_hint || mention.matched_text || mention.mention_id)}
      </h2>

      ${renderSourceMentionLink(mention)}

      <p>${escapeHtml(mention.matched_text || "本文なし")}</p>

      <details class="source-body">
        <summary>文脈を表示</summary>
        <pre>${escapeHtml(mention.context || mention.matched_text || "")}</pre>
      </details>

      <dl>
        <dt>mention_id</dt>
        <dd>${escapeHtml(mention.mention_id)}</dd>

        <dt>source_id</dt>
        <dd>${escapeHtml(mention.source_id)}</dd>

        <dt>entity_type</dt>
        <dd>${escapeHtml(mention.entity_type)}</dd>

        <dt>confidence</dt>
        <dd>${escapeHtml(mention.confidence)}</dd>
      </dl>
    </article>
  `).join("");
}

function renderSources() {
  const documents = (state.data.sourceDocuments ?? []).filter((document) =>
    includesQuery([
      document.title,
      document.url,
      document.source_type,
      document.source_ref_id,
      document.content_preview,
      document.content_text,
      document.notes,
    ])
  );

  if (documents.length === 0) {
    return emptyMessage();
  }

  return documents.map((document) => `
    <article class="card source-card">
      <h2>${escapeHtml(document.title || document.source_ref_id)}</h2>
      <p class="meta">
        ${escapeHtml(sourceTypeLabel(document.source_type))}
        / ${escapeHtml(document.published_at || "日付未入力")}
        / ${escapeHtml(document.source_ref_id)}
      </p>
      ${document.url ? `
        <p>
          <a href="${escapeHtml(document.url)}" target="_blank" rel="noopener noreferrer">
            出典を開く
          </a>
        </p>
      ` : ""}
      <p>${escapeHtml(document.content_preview || "プレビュー未入力")}</p>
      <dl>
        <dt>source_id</dt>
        <dd>${escapeHtml(document.source_id)}</dd>
        <dt>content_hash</dt>
        <dd><code>${escapeHtml(document.content_hash)}</code></dd>
      </dl>
      ${renderSourceBody(document)}
    </article>
  `).join("");
}

function emptyMessage() {
  return `<article class="card"><p>該当するデータがありません。</p></article>`;
}

function renderContent() {
  const renderers = {
    bouts: renderBouts,
    fighters: renderFighters,
    events: renderEvents,
    promotions: renderPromotions,
    titles: renderTitles,
    videos: renderVideos,
    sources: renderSources,
    mentions: renderMentions,
  };

  const renderer = renderers[state.tab] ?? renderBouts;
  document.querySelector("#content").innerHTML = renderer();
}

function renderTabs() {
  const tabs = document.querySelector(".tabs");
  if (!tabs) return;

  tabs.innerHTML = TABS
    .map(([tabId, label]) => `
      <button type="button" class="tab ${tabId === state.tab ? "active" : ""}" data-tab="${escapeHtml(tabId)}">
        ${escapeHtml(label)}
      </button>
    `)
    .join("");
}

function render() {
  if (!state.data) return;

  renderSummary();
  renderTabs();
  renderTitleFilters();
  renderMentionFilters();
  renderContent();
}
