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
    [
      "出典候補",
      (d.sourceEventReferences?.length ?? 0) +
        (d.sourceBoutReferences?.length ?? 0) +
        (d.sourceVideoReferences?.length ?? 0),
    ],
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

function articleById(articleId) {
  return state.data.articles.find((article) => article.article_id === articleId);
}

function sourceDocumentForArticle(articleId) {
  return (state.data.sourceDocuments ?? []).find((document) =>
    document.source_type === "note_article" &&
    (document.source_ref_id === articleId || document.source_id === `note:${articleId}`)
  );
}

function renderValue(value) {
  if (value === null || value === undefined || value === "") {
    return "未入力";
  }
  return escapeHtml(value);
}

function renderIdList(values) {
  const items = (values ?? []).filter(Boolean);
  if (items.length === 0) {
    return "未入力";
  }
  return items.map((value) => `<code>${escapeHtml(value)}</code>`).join(", ");
}

function renderTextList(values) {
  const items = (values ?? []).filter(Boolean);
  if (items.length === 0) {
    return "未入力";
  }
  return items.map((value) => escapeHtml(value)).join(", ");
}

function renderVideoRefs(videoIds) {
  const ids = (videoIds ?? []).filter(Boolean);
  if (ids.length === 0) {
    return "未入力";
  }

  return ids.map((videoId) => {
    const video = videoById(videoId);
    if (!video) {
      return `<code>${escapeHtml(videoId)}</code>`;
    }
    return renderVideoLinkWithDetail(video, video.title || videoId);
  }).join(", ");
}

function renderArticleRefs(articleIds) {
  const ids = (Array.isArray(articleIds) ? articleIds : [articleIds]).filter(Boolean);
  if (ids.length === 0) {
    return "未入力";
  }

  return ids.map((articleId) => {
    const article = articleById(articleId);
    const document = sourceDocumentForArticle(articleId);
    const label = article?.title || articleId;
    const detail = document?.content_text ? `
      <details class="article-source-detail">
        <summary>
          <span class="article-source-detail-closed">▶ 詳細</span>
          <span class="article-source-detail-open">▼ 詳細</span>
        </summary>
        <pre>${escapeHtml(document.content_text)}</pre>
      </details>
    ` : "";
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
        <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>
        ${detail}
      </span>
    `;
  }).join(", ");
}

function renderDefinitionList(rows) {
  const visibleRows = rows.filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (visibleRows.length === 0) {
    return "";
  }

  return `
    <dl class="record-details">
      ${visibleRows.map(([label, value]) => `
        <dt>${escapeHtml(label)}</dt>
        <dd>${value}</dd>
      `).join("")}
    </dl>
  `;
}

function renderDetailDisclosure(rows, label = "詳細") {
  const content = renderDefinitionList(rows);
  if (!content) {
    return "";
  }

  return `
    <details class="record-detail-toggle">
      <summary>${escapeHtml(label)}</summary>
      ${content}
    </details>
  `;
}

function renderPrimaryArticleRefs(articleIds, title = "出典記事") {
  const ids = (Array.isArray(articleIds) ? articleIds : [articleIds]).filter(Boolean);
  if (ids.length === 0) {
    return "";
  }

  return `
    <section class="primary-links">
      <h3>${escapeHtml(title)}</h3>
      <p>${renderArticleRefs(ids)}</p>
    </section>
  `;
}

function renderPrimaryVideoRefs(videoIds, title = "出典動画") {
  const ids = (videoIds ?? []).filter(Boolean);
  if (ids.length === 0) {
    return "";
  }

  return `
    <section class="primary-links">
      <h3>${escapeHtml(title)}</h3>
      <p>${renderVideoRefs(ids)}</p>
    </section>
  `;
}

function renderFighterRows(bout) {
  return (bout.fighters ?? []).map((fighter) => `
    <li>
      <span>${fighterLink(fighter.fighter_id, fighter.name)}</span>
      <span class="meta">
        ${fighter.corner ? `${escapeHtml(fighter.corner)} / ` : ""}
        ${escapeHtml(fighter.result || "unknown")}
      </span>
    </li>
  `).join("");
}

function renderFighterSnapshots(fighterId) {
  const snapshots = (state.data.fighterSnapshots ?? [])
    .filter((snapshot) => snapshot.fighter_id === fighterId)
    .sort((a, b) => String(b.event_id ?? "").localeCompare(String(a.event_id ?? ""), "ja"));

  if (snapshots.length === 0) {
    return "";
  }

  return `
    <section class="related-source-mentions">
      <h3>出典別プロフィール</h3>
      <ul>
        ${snapshots.map((snapshot) => `
          <li>
            <span class="meta">
              ${snapshot.event_id ? eventLink(snapshot.event_id, eventName(snapshot.event_id)) : "大会未設定"}
              / ${renderArticleRefs(snapshot.source_article_id)}
            </span>
            ${renderDefinitionList([
              ["snapshot_id", `<code>${escapeHtml(snapshot.snapshot_id)}</code>`],
              ["所属", renderValue(snapshot.gym)],
              ["身長・年齢", renderValue([snapshot.height, snapshot.age].filter(Boolean).join(" / "))],
              ["戦績", renderValue(snapshot.record_text)],
              ["主団体", renderValue(promotionName(snapshot.main_promotion_id))],
              ["肩書き", renderValue(snapshot.titles_text)],
              ["キャッチコピー", renderValue(snapshot.catchphrase)],
            ])}
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

function renderPromotionEvents(promotionId) {
  const events = state.data.events
    .filter((event) => event.promotion_id === promotionId)
    .sort((a, b) => String(b.published_at ?? b.event_date ?? "").localeCompare(String(a.published_at ?? a.event_date ?? ""), "ja"));

  if (events.length === 0) {
    return "";
  }

  return `
    <section class="related-source-mentions">
      <h3>大会</h3>
      <ul>
        ${events.slice(0, 12).map((event) => `
          <li>
            <span>${eventLink(event.event_id, event.name)}</span>
            <span class="meta">
              ${escapeHtml([event.event_type, event.published_at || event.event_date].filter(Boolean).join(" / "))}
            </span>
          </li>
        `).join("")}
      </ul>
      ${events.length > 12 ? `<p class="meta">ほか ${escapeHtml(events.length - 12)} 件</p>` : ""}
    </section>
  `;
}

function renderPromotionTitles(promotionId) {
  const titles = state.data.titles.filter((title) => title.promotion_id === promotionId);

  if (titles.length === 0) {
    return "";
  }

  return `
    <section class="related-source-mentions">
      <h3>王座</h3>
      <ul>
        ${titles.map((title) => `
          <li>
            <span>${escapeHtml(titleDisplayName(title))}</span>
            <span class="meta">${escapeHtml(title.lineage?.length ?? 0)} reigns</span>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

function renderBouts() {
  const bouts = state.focusEventId
    ? state.data.bouts.filter((bout) => bout.event_id === state.focusEventId)
    : state.data.bouts.filter((bout) => includesQuery(boutSearchText(bout)));

  return bouts.map((bout) => `
    <article class="card record-card bout-card">
      <h2>${boutMatchup(bout)}</h2>
      <p class="meta">${eventLink(bout.event_id, eventName(bout.event_id))} / ${escapeHtml(bout.division ?? "")}</p>
      <p class="result">
        ${renderBoutResultSummary(bout)}
        ${bout.result?.round ? `${escapeHtml(bout.result.round)}R` : ""}
        ${escapeHtml(bout.result?.time ?? "")}
        ${escapeHtml(bout.result?.method_raw ?? "")}
      </p>
      ${bout.title?.is_title_bout ? `<p class="meta">王座戦: ${escapeHtml(bout.title.note)}</p>` : ""}
      ${renderPrimaryArticleRefs(bout.source_article_id)}
      ${renderVideoLinks("bout", bout.bout_id)}
      ${renderSourceReferences(sourceReferencesForBout(bout))}
      ${renderDetailDisclosure([
        ["bout_id", `<code>${escapeHtml(bout.bout_id)}</code>`],
        ["大会", eventLink(bout.event_id, eventName(bout.event_id))],
        ["団体", escapeHtml(promotionName(bout.promotion_id))],
        ["試合順", renderValue(bout.bout_order ? `第${bout.bout_order}試合` : "")],
        ["階級", renderValue([bout.division, bout.weight_class_id].filter(Boolean).join(" / "))],
        ["種別", renderValue(bout.bout_type)],
        ["結果状態", renderValue(bout.result_status)],
        ["選手", `<ul class="inline-list">${renderFighterRows(bout)}</ul>`],
        ["決着", renderValue([
          bout.result?.method_normalized,
          bout.result?.technique,
          bout.result?.decision_score,
        ].filter(Boolean).join(" / "))],
        ["王座", bout.title?.is_title_bout ? renderValue([
          bout.title.title_id,
          bout.title.title_result,
        ].filter(Boolean).join(" / ")) : ""],
        ["推定元動画", renderIdList([bout.inferred_from_video_id])],
        ["推定信頼度", renderValue(bout.inferred_confidence)],
        ["メモ", renderValue(bout.notes)],
      ])}
    </article>
  `).join("") || emptyMessage();
}

function renderFighters() {
  const fighters = state.focusFighterId
    ? state.data.fighters.filter((fighter) => fighter.fighter_id === state.focusFighterId)
    : state.data.fighters.filter((fighter) => fighterMatchesQuery(fighter));

  return fighters.map((fighter) => `
    <article class="card record-card fighter-card">
      <h2>${escapeHtml(fighter.display_name)}</h2>
      <p class="meta">${escapeHtml(fighter.main_division ?? "")} / ${escapeHtml(promotionName(fighter.main_promotion_id))}</p>
      ${renderPrimaryArticleRefs(fighter.source_article_ids)}
      ${renderRelatedBouts(fighter.fighter_id)}
      ${renderDetailDisclosure([
        ["fighter_id", `<code>${escapeHtml(fighter.fighter_id)}</code>`],
        ["別名", renderTextList(fighter.aliases)],
        ["主階級", renderValue(fighter.main_division)],
        ["主団体", renderValue(promotionName(fighter.main_promotion_id))],
        ["所属", renderValue(fighter.profile?.gym)],
        ["身長・年齢", renderValue([fighter.profile?.height, fighter.profile?.age].filter(Boolean).join(" / "))],
        ["推定元動画", renderIdList(fighter.inferred_from_video_ids)],
        ["推定信頼度", renderValue(fighter.inferred_confidence)],
        ["概要", renderValue(fighter.summary)],
      ])}
      ${renderFighterSnapshots(fighter.fighter_id)}
    </article>
  `).join("") || emptyMessage();
}

function renderEvents() {
  const events = state.focusEventId
    ? state.data.events.filter((event) => event.event_id === state.focusEventId)
    : state.data.events.filter((event) =>
        includesQuery([
          event.name,
          event.event_id,
          event.event_type,
          event.source_article_id,
          event.source_video_ids?.join(" "),
          event.inferred_from,
          event.inferred_confidence,
          promotionName(event.promotion_id),
          event.summary,
          ...sourceReferencesForEvent(event).map(sourceReferenceSearchText),
        ])
      );

  return events.map((event) => `
    <article class="card record-card event-card">
      <h2>${escapeHtml(event.name)}</h2>
      <p class="meta">${escapeHtml(promotionName(event.promotion_id))} / ${escapeHtml(event.published_at ?? "")}</p>
      <p>${escapeHtml(event.summary || "概要未入力")}</p>
      ${renderPrimaryArticleRefs(event.source_article_id)}
      ${renderPrimaryVideoRefs(event.source_video_ids)}
      ${renderVideoLinks("event", event.event_id)}
      ${renderSourceReferences(sourceReferencesForEvent(event))}
      ${renderEventBouts(event.event_id)}
      ${renderDetailDisclosure([
        ["event_id", `<code>${escapeHtml(event.event_id)}</code>`],
        ["団体", escapeHtml(promotionName(event.promotion_id))],
        ["大会番号", renderValue(event.event_number)],
        ["大会種別", renderValue(event.event_type)],
        ["開催日", renderValue(event.event_date)],
        ["公開日", renderValue(event.published_at)],
        ["推定元", renderValue(event.inferred_from)],
        ["推定信頼度", renderValue(event.inferred_confidence)],
      ])}
    </article>
  `).join("") || emptyMessage();
}

function renderPromotions() {
  const promotions = state.data.promotions.filter((promotion) =>
    includesQuery([
      promotion.name,
      promotion.name_en,
      promotion.promotion_id,
      promotion.category,
      promotion.country_scope,
      promotion.summary,
      promotion.source_article_ids?.join(" "),
      ...state.data.events
        .filter((event) => event.promotion_id === promotion.promotion_id)
        .map((event) => [event.event_id, event.name].join(" ")),
      ...state.data.titles
        .filter((title) => title.promotion_id === promotion.promotion_id)
        .map((title) => titleDisplayName(title)),
    ])
  );

  return promotions.map((promotion) => `
    <article class="card record-card promotion-card">
      <h2>${escapeHtml(promotion.name)}</h2>
      <p class="meta">${escapeHtml(promotion.name_en ?? "")} / ${escapeHtml(promotion.category ?? "")}</p>
      <p>${escapeHtml(promotion.summary || "概要未入力")}</p>
      ${renderPrimaryArticleRefs(promotion.source_article_ids)}
      ${renderVideoLinks("promotion", promotion.promotion_id)}
      ${renderPromotionEvents(promotion.promotion_id)}
      ${renderPromotionTitles(promotion.promotion_id)}
      ${renderDetailDisclosure([
        ["promotion_id", `<code>${escapeHtml(promotion.promotion_id)}</code>`],
        ["英字名", renderValue(promotion.name_en)],
        ["カテゴリ", renderValue(promotion.category)],
        ["範囲", renderValue(promotion.country_scope)],
        ["会場", renderValue(promotion.rules?.venue)],
        ["ラウンド", renderValue(promotion.rules?.rounds)],
        ["判定", renderValue(promotion.rules?.judging)],
        ["グローブ", renderValue(promotion.rules?.glove)],
        ["肘", renderValue(promotion.rules?.elbows === null ? "" : promotion.rules?.elbows ? "あり" : "なし")],
        ["サッカーボールキック", renderValue(promotion.rules?.soccer_kicks === null ? "" : promotion.rules?.soccer_kicks ? "あり" : "なし")],
        ["踏みつけ", renderValue(promotion.rules?.stomps === null ? "" : promotion.rules?.stomps ? "あり" : "なし")],
        ["4点頭部キック", renderValue(promotion.rules?.four_point_head_kicks === null ? "" : promotion.rules?.four_point_head_kicks ? "あり" : "なし")],
        ["4点頭部膝", renderValue(promotion.rules?.four_point_head_knees === null ? "" : promotion.rules?.four_point_head_knees ? "あり" : "なし")],
      ])}
    </article>
  `).join("") || emptyMessage();
}

function renderVideoLinkedEntities(video) {
  const links = state.data.videoLinks.filter((link) => link.video_id === video.video_id);
  if (links.length === 0) {
    return "";
  }

  return `
    <section class="related-source-mentions">
      <h3>紐づけ先</h3>
      <ul>
        ${links.map((link) => `
          <li>
            <span class="video-badge">${escapeHtml(relationTypeLabel(link.relation_type))}</span>
            <span>${renderLinkedEntity(link)}</span>
            ${link.start_time || link.end_time ? `<span class="meta">${escapeHtml([link.start_time, link.end_time].filter(Boolean).join(" - "))}</span>` : ""}
            ${link.notes ? `<p class="meta">${escapeHtml(link.notes)}</p>` : ""}
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

function renderLinkedEntity(link) {
  if (link.entity_type === "event") {
    return eventLink(link.entity_id, eventName(link.entity_id));
  }
  if (link.entity_type === "bout") {
    const bout = state.data.bouts.find((item) => item.bout_id === link.entity_id);
    return bout ? boutMatchup(bout) : `<code>${escapeHtml(link.entity_id)}</code>`;
  }
  if (link.entity_type === "fighter") {
    return fighterLink(link.entity_id, fighterName(link.entity_id));
  }
  if (link.entity_type === "promotion") {
    return escapeHtml(promotionName(link.entity_id));
  }
  return `<code>${escapeHtml(link.entity_id)}</code>`;
}

function renderVideos() {
  const videos = state.data.videos.filter((video) =>
    includesQuery([
      video.title,
      video.original_title,
      video.video_id,
      video.url,
      video.channel_name,
      video.platform,
      video.platform_video_id,
      video.official_status,
      video.video_type,
      video.link_status,
      video.notes,
      video.duplicate_group_id,
      video.duplicate_note,
      video.source_article_ids?.join(" "),
      sourceReferenceForVideo(video)?.content_preview,
      sourceReferenceForVideo(video)?.matched_texts,
      sourceDocumentForVideo(video)?.content_preview,
    ])
  );

  if (videos.length === 0) {
    return emptyMessage();
  }

  return videos.map((video) => `
    <article class="card record-card video-card">
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

      <section class="primary-links">
        <h3>動画URL</h3>
        <p>${renderVideoLinkWithDetail(video, video.url)}</p>
      </section>

      ${renderPrimaryArticleRefs(video.source_article_ids)}
      ${renderVideoLinkedEntities(video)}
      ${renderVideoDescriptionPreview(video)}

      ${renderDetailDisclosure([
        ["video_id", `<code>${escapeHtml(video.video_id)}</code>`],
        ["原題", renderValue(video.original_title)],
        ["platform", renderValue(video.platform)],
        ["platform_video_id", renderValue(video.platform_video_id)],
        ["公式状態", renderValue(video.official_status)],
        ["動画種別", renderValue(videoTypeLabel(video.video_type))],
        ["紐づけ状態", renderValue(linkStatusLabel(video.link_status))],
        ["重複候補", renderValue(video.duplicate_group_id)],
        ["重複メモ", renderValue(video.duplicate_note)],
        ["メモ", renderValue(video.notes)],
      ])}
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
          reign.won_at_event_id,
          reign.lost_at_event_id,
          reign.source_article_id,
          reign.source_video_id,
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
          <span class="fighter-name">
            ${fighterLink(reign.fighter_id, reign.fighter_name)}
            <span class="meta">
              ${reign.won_at_event_id ? ` / 獲得: ${eventLink(reign.won_at_event_id, eventName(reign.won_at_event_id))}` : ""}
              ${reign.lost_at_event_id ? ` / 喪失: ${eventLink(reign.lost_at_event_id, eventName(reign.lost_at_event_id))}` : ""}
              ${reign.source_video_id ? ` / 出典: ${renderVideoRefs([reign.source_video_id])}` : ""}
              ${!reign.source_video_id && reign.source_article_id ? ` / 出典: ${renderArticleRefs(reign.source_article_id)}` : ""}
            </span>
          </span>
        </li>
      `)
      .join("");

    return `
      ${groupHeader}
      <article class="card title-card">
        <h3>${escapeHtml(titleDisplayName(title))}</h3>
        ${renderDetailDisclosure([
          ["title_id", `<code>${escapeHtml(title.title_id)}</code>`],
          ["団体", escapeHtml(promotionName(title.promotion_id))],
          ["階級", renderValue(title.division)],
          ["変遷数", renderValue((title.lineage ?? []).length)],
        ])}
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
    <article class="card record-card source-mention-card">
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

      ${renderDetailDisclosure([
        ["mention_id", `<code>${escapeHtml(mention.mention_id)}</code>`],
        ["source_id", `<code>${escapeHtml(mention.source_id)}</code>`],
        ["entity_type", renderValue(mention.entity_type)],
        ["confidence", renderValue(mention.confidence)],
        ["line_number", renderValue(mention.line_number)],
        ["source_ref_id", renderValue(mention.source_ref_id)],
        ["notes", renderValue(mention.notes)],
      ])}
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
    <article class="card record-card source-card">
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
      ${renderSourceReferenceCounts(document.source_id)}
      ${renderSourceBody(document)}
      ${renderDetailDisclosure([
        ["source_id", `<code>${escapeHtml(document.source_id)}</code>`],
        ["URL", document.url ? `<a href="${escapeHtml(document.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(document.url)}</a>` : "未入力"],
        ["取得日時", renderValue(document.fetched_at)],
        ["content_hash", document.content_hash ? `<code>${escapeHtml(document.content_hash)}</code>` : "未入力"],
        ["notes", renderValue(document.notes)],
      ])}
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
