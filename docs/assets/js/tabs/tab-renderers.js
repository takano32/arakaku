import { escapeHtml, emptyMessage, renderIdList, renderTextList, renderValue, uniqueSorted } from "../ui/html-utils.js";
import { MENTION_TYPE_ORDER } from "../config.js";

/** Template Method の具象: 各タブの HTML 生成 */
export class TabRenderers {
  /** @param {import("../core/view-context.js").ViewContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }

  renderFighterRows(bout) {
    const { navigation } = this.ctx;
    return (bout.fighters ?? [])
      .map(
        (fighter) => `
    <li>
      <span>${navigation.fighterLink(fighter.fighter_id, fighter.name)}</span>
      <span class="meta">
        ${fighter.corner ? `${escapeHtml(fighter.corner)} / ` : ""}
        ${escapeHtml(fighter.result || "unknown")}
      </span>
    </li>
  `
      )
      .join("");
  }

  renderFighterSnapshots(fighterId) {
    const { components, navigation, sources, repo } = this.ctx;
    const snapshots = repo.fighterSnapshots
      .filter((snapshot) => snapshot.fighter_id === fighterId)
      .sort((a, b) => String(b.event_id ?? "").localeCompare(String(a.event_id ?? ""), "ja"));

    if (snapshots.length === 0) {
      return "";
    }

    return `
      <section class="related-source-mentions">
        <h3>出典別プロフィール</h3>
        ${components.relatedGrid(
          snapshots
            .map((snapshot) =>
              components.relatedItem(
                `
          <span class="meta">
            ${snapshot.event_id ? navigation.eventLink(snapshot.event_id, repo.eventName(snapshot.event_id)) : "大会未設定"}
            / ${sources.renderArticleRefs(snapshot.source_article_id)}
          </span>
          ${components.definitionList([
            ["snapshot_id", `<code>${escapeHtml(snapshot.snapshot_id)}</code>`],
            ["所属", renderValue(snapshot.gym)],
            ["身長・年齢", renderValue([snapshot.height, snapshot.age].filter(Boolean).join(" / "))],
            ["戦績", renderValue(snapshot.record_text)],
            ["主団体", renderValue(repo.promotionName(snapshot.main_promotion_id))],
            ["肩書き", renderValue(snapshot.titles_text)],
            ["キャッチコピー", renderValue(snapshot.catchphrase)],
          ])}
        `,
                "fighter-snapshot-card"
              )
            )
            .join("")
        )}
      </section>
    `;
  }

  renderPromotionEvents(promotionId) {
    const { components, navigation, repo } = this.ctx;
    const events = repo.events
      .filter((event) => event.promotion_id === promotionId)
      .sort((a, b) =>
        String(b.published_at ?? b.event_date ?? "").localeCompare(String(a.published_at ?? a.event_date ?? ""), "ja")
      );

    if (events.length === 0) {
      return "";
    }

    return `
      <section class="related-source-mentions">
        <h3>大会</h3>
        ${components.relatedGrid(
          events
            .slice(0, 12)
            .map((event) =>
              components.relatedItem(
                `
          <h4>${navigation.eventLink(event.event_id, event.name)}</h4>
          <p class="meta">
            ${escapeHtml([event.event_type, event.published_at || event.event_date].filter(Boolean).join(" / "))}
          </p>
        `,
                "promotion-event-card"
              )
            )
            .join("")
        )}
        ${events.length > 12 ? `<p class="meta">ほか ${escapeHtml(events.length - 12)} 件</p>` : ""}
      </section>
    `;
  }

  renderPromotionTitles(promotionId) {
    const { components, repo } = this.ctx;
    const titles = repo.titles.filter((title) => title.promotion_id === promotionId);

    if (titles.length === 0) {
      return "";
    }

    return `
      <section class="related-source-mentions">
        <h3>王座</h3>
        ${components.relatedGrid(
          titles
            .map((title) =>
              components.relatedItem(
                `
          <h4>${escapeHtml(repo.titleDisplayName(title))}</h4>
          <p class="meta">${escapeHtml(title.lineage?.length ?? 0)} reigns</p>
        `,
                "promotion-title-card"
              )
            )
            .join("")
        )}
      </section>
    `;
  }

  renderLinkedEntity(link) {
    const { navigation, repo } = this.ctx;

    if (link.entity_type === "event") {
      return navigation.eventLink(link.entity_id, repo.eventName(link.entity_id));
    }
    if (link.entity_type === "bout") {
      const bout = repo.findBout(link.entity_id);
      return bout ? navigation.boutMatchup(bout) : `<code>${escapeHtml(link.entity_id)}</code>`;
    }
    if (link.entity_type === "fighter") {
      return navigation.fighterLink(link.entity_id, repo.fighterName(link.entity_id));
    }
    if (link.entity_type === "promotion") {
      return escapeHtml(repo.promotionName(link.entity_id));
    }
    return `<code>${escapeHtml(link.entity_id)}</code>`;
  }

  renderVideoLinkedEntities(video) {
    const { components, labels, repo } = this.ctx;
    const links = repo.videoLinks.filter((link) => link.video_id === video.video_id);

    if (links.length === 0) {
      return "";
    }

    return `
      <section class="related-source-mentions">
        <h3>紐づけ先</h3>
        ${components.relatedGrid(
          links
            .map((link) =>
              components.relatedItem(
                `
          <span class="video-badge">${escapeHtml(labels.relationType(link.relation_type))}</span>
          <span>${this.renderLinkedEntity(link)}</span>
          ${link.start_time || link.end_time ? `<span class="meta">${escapeHtml([link.start_time, link.end_time].filter(Boolean).join(" - "))}</span>` : ""}
          ${link.notes ? `<p class="meta">${escapeHtml(link.notes)}</p>` : ""}
        `,
                "video-link-entity-card"
              )
            )
            .join("")
        )}
      </section>
    `;
  }

  bouts() {
    const { state, query, navigation, components, sources, related, repo } = this.ctx;
    const bouts = state.focusEventId
      ? repo.bouts.filter((bout) => bout.event_id === state.focusEventId)
      : repo.bouts.filter((bout) => query.includes(query.boutSearchText(bout)));

    return (
      bouts
        .map(
          (bout) => `
    <article class="card record-card bout-card">
      <h2>${navigation.boutMatchup(bout)}</h2>
      <p class="meta">${navigation.eventLink(bout.event_id, repo.eventName(bout.event_id))} / ${escapeHtml(bout.division ?? "")}</p>
      <p class="result">
        ${navigation.renderBoutResultSummary(bout)}
        ${bout.result?.round ? `${escapeHtml(bout.result.round)}R` : ""}
        ${escapeHtml(bout.result?.time ?? "")}
        ${escapeHtml(bout.result?.method_raw ?? "")}
      </p>
      ${bout.title?.is_title_bout ? `<p class="meta">王座戦: ${escapeHtml(bout.title.note)}</p>` : ""}
      ${components.primaryArticleRefs(sources.renderArticleRefs.bind(sources), bout.source_article_id)}
      ${sources.renderVideoLinks("bout", bout.bout_id)}
      ${sources.renderSourceReferences(sources.sourceReferencesForBout(bout))}
      ${components.detailDisclosure([
        ["bout_id", `<code>${escapeHtml(bout.bout_id)}</code>`],
        ["大会", navigation.eventLink(bout.event_id, repo.eventName(bout.event_id))],
        ["団体", escapeHtml(repo.promotionName(bout.promotion_id))],
        ["試合順", renderValue(bout.bout_order ? `第${bout.bout_order}試合` : "")],
        ["階級", renderValue([bout.division, bout.weight_class_id].filter(Boolean).join(" / "))],
        ["種別", renderValue(bout.bout_type)],
        ["結果状態", renderValue(bout.result_status)],
        ["選手", `<ul class="inline-list">${this.renderFighterRows(bout)}</ul>`],
        [
          "決着",
          renderValue(
            [bout.result?.method_normalized, bout.result?.technique, bout.result?.decision_score]
              .filter(Boolean)
              .join(" / ")
          ),
        ],
        [
          "王座",
          bout.title?.is_title_bout
            ? renderValue([bout.title.title_id, bout.title.title_result].filter(Boolean).join(" / "))
            : "",
        ],
        ["推定元動画", renderIdList([bout.inferred_from_video_id])],
        ["推定信頼度", renderValue(bout.inferred_confidence)],
        ["メモ", renderValue(bout.notes)],
      ])}
    </article>
  `
        )
        .join("") || emptyMessage()
    );
  }

  fighters() {
    const { state, query, navigation, components, sources, related, repo } = this.ctx;
    const fighters = state.focusFighterId
      ? repo.fighters.filter((fighter) => fighter.fighter_id === state.focusFighterId)
      : repo.fighters.filter((fighter) => query.fighterMatches(fighter));

    return (
      fighters
        .map(
          (fighter) => `
    <article class="card record-card fighter-card">
      <h2>${escapeHtml(fighter.display_name)}</h2>
      <p class="meta">${escapeHtml(fighter.main_division ?? "")} / ${escapeHtml(repo.promotionName(fighter.main_promotion_id))}</p>
      ${components.primaryArticleRefs(sources.renderArticleRefs.bind(sources), fighter.source_article_ids)}
      ${related.renderRelatedBouts(fighter.fighter_id)}
      ${components.detailDisclosure([
        ["fighter_id", `<code>${escapeHtml(fighter.fighter_id)}</code>`],
        ["別名", renderTextList(fighter.aliases)],
        ["主階級", renderValue(fighter.main_division)],
        ["主団体", renderValue(repo.promotionName(fighter.main_promotion_id))],
        ["所属", renderValue(fighter.profile?.gym)],
        ["身長・年齢", renderValue([fighter.profile?.height, fighter.profile?.age].filter(Boolean).join(" / "))],
        ["推定元動画", renderIdList(fighter.inferred_from_video_ids)],
        ["推定信頼度", renderValue(fighter.inferred_confidence)],
        ["概要", renderValue(fighter.summary)],
      ])}
      ${this.renderFighterSnapshots(fighter.fighter_id)}
    </article>
  `
        )
        .join("") || emptyMessage()
    );
  }

  events() {
    const { state, query, navigation, components, sources, related, repo } = this.ctx;

    const events = state.focusEventId
      ? repo.events.filter((event) => event.event_id === state.focusEventId)
      : repo.events.filter((event) =>
          query.includes([
            event.name,
            event.event_id,
            event.event_type,
            event.source_article_id,
            event.source_video_ids?.join(" "),
            event.inferred_from,
            event.inferred_confidence,
            repo.promotionName(event.promotion_id),
            event.summary,
            ...repo.sourceReferencesForEvent(event).map((reference) =>
              sources.sourceReferenceSearchText(reference)
            ),
          ])
        );

    return (
      events
        .map(
          (event) => `
    <article class="card record-card event-card">
      <h2>${escapeHtml(event.name)}</h2>
      <p class="meta">${escapeHtml(repo.promotionName(event.promotion_id))} / ${escapeHtml(event.published_at ?? "")}</p>
      <p>${escapeHtml(event.summary || "概要未入力")}</p>
      ${components.primaryArticleRefs(sources.renderArticleRefs.bind(sources), event.source_article_id)}
      ${components.primaryVideoRefs(sources.renderVideoRefs.bind(sources), repo.eventSourceVideoIdsWithoutBoutCoverage(event))}
      ${sources.renderVideoLinks("event", event.event_id)}
      ${sources.renderSourceReferences(repo.sourceReferencesForEvent(event))}
      ${related.renderEventBouts(event.event_id)}
      ${components.detailDisclosure([
        ["event_id", `<code>${escapeHtml(event.event_id)}</code>`],
        ["団体", escapeHtml(repo.promotionName(event.promotion_id))],
        ["大会番号", renderValue(event.event_number)],
        ["大会種別", renderValue(event.event_type)],
        ["開催日", renderValue(event.event_date)],
        ["公開日", renderValue(event.published_at)],
        ["推定元", renderValue(event.inferred_from)],
        ["推定信頼度", renderValue(event.inferred_confidence)],
      ])}
    </article>
  `
        )
        .join("") || emptyMessage()
    );
  }

  promotions() {
    const { query, components, sources, repo } = this.ctx;

    const promotions = repo.promotions.filter((promotion) =>
      query.includes([
        promotion.name,
        promotion.name_en,
        promotion.promotion_id,
        promotion.category,
        promotion.country_scope,
        promotion.summary,
        promotion.source_article_ids?.join(" "),
        ...repo.events
          .filter((event) => event.promotion_id === promotion.promotion_id)
          .map((event) => [event.event_id, event.name].join(" ")),
        ...repo.titles
          .filter((title) => title.promotion_id === promotion.promotion_id)
          .map((title) => repo.titleDisplayName(title)),
      ])
    );

    return (
      promotions
        .map(
          (promotion) => `
    <article class="card record-card promotion-card">
      <h2>${escapeHtml(promotion.name)}</h2>
      <p class="meta">${escapeHtml(promotion.name_en ?? "")} / ${escapeHtml(promotion.category ?? "")}</p>
      <p>${escapeHtml(promotion.summary || "概要未入力")}</p>
      ${components.primaryArticleRefs(sources.renderArticleRefs.bind(sources), promotion.source_article_ids)}
      ${sources.renderVideoLinks("promotion", promotion.promotion_id)}
      ${this.renderPromotionEvents(promotion.promotion_id)}
      ${this.renderPromotionTitles(promotion.promotion_id)}
      ${components.detailDisclosure([
        ["promotion_id", `<code>${escapeHtml(promotion.promotion_id)}</code>`],
        ["英字名", renderValue(promotion.name_en)],
        ["カテゴリ", renderValue(promotion.category)],
        ["範囲", renderValue(promotion.country_scope)],
        ["会場", renderValue(promotion.rules?.venue)],
        ["ラウンド", renderValue(promotion.rules?.rounds)],
        ["判定", renderValue(promotion.rules?.judging)],
        ["グローブ", renderValue(promotion.rules?.glove)],
        ["肘", renderValue(promotion.rules?.elbows === null ? "" : promotion.rules?.elbows ? "あり" : "なし")],
        [
          "サッカーボールキック",
          renderValue(promotion.rules?.soccer_kicks === null ? "" : promotion.rules?.soccer_kicks ? "あり" : "なし"),
        ],
        ["踏みつけ", renderValue(promotion.rules?.stomps === null ? "" : promotion.rules?.stomps ? "あり" : "なし")],
        [
          "4点頭部キック",
          renderValue(
            promotion.rules?.four_point_head_kicks === null ? "" : promotion.rules?.four_point_head_kicks ? "あり" : "なし"
          ),
        ],
        [
          "4点頭部膝",
          renderValue(
            promotion.rules?.four_point_head_knees === null ? "" : promotion.rules?.four_point_head_knees ? "あり" : "なし"
          ),
        ],
      ])}
    </article>
  `
        )
        .join("") || emptyMessage()
    );
  }

  videos() {
    const { query, components, labels, sources, repo } = this.ctx;

    const videos = repo.videos.filter((video) =>
      query.includes([
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
        repo.sourceReferenceForVideo(video)?.content_preview,
        repo.sourceReferenceForVideo(video)?.matched_texts,
        repo.sourceDocumentForVideo(video)?.content_preview,
      ])
    );

    if (videos.length === 0) {
      return emptyMessage();
    }

    return videos
      .map(
        (video) => `
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
        <span class="video-badge">${escapeHtml(labels.videoType(video.video_type))}</span>
        <span class="video-badge">${escapeHtml(labels.linkStatus(video.link_status))}</span>
      </div>
      <section class="primary-links">
        <h3>動画URL</h3>
        ${sources.renderVideoSourceBlock(video, video.url)}
      </section>
      ${components.primaryArticleRefs(sources.renderArticleRefs.bind(sources), video.source_article_ids)}
      ${this.renderVideoLinkedEntities(video)}
      ${sources.renderVideoDescriptionPreview(video)}
      ${components.detailDisclosure([
        ["video_id", `<code>${escapeHtml(video.video_id)}</code>`],
        ["原題", renderValue(video.original_title)],
        ["platform", renderValue(video.platform)],
        ["platform_video_id", renderValue(video.platform_video_id)],
        ["公式状態", renderValue(video.official_status)],
        ["動画種別", renderValue(labels.videoType(video.video_type))],
        ["紐づけ状態", renderValue(labels.linkStatus(video.link_status))],
        ["重複候補", renderValue(video.duplicate_group_id)],
        ["重複メモ", renderValue(video.duplicate_note)],
        ["メモ", renderValue(video.notes)],
      ])}
    </article>
  `
      )
      .join("");
  }

  titles() {
    const { state, query, navigation, components, repo } = this.ctx;

    const titles = repo.titles
      .filter((title) => {
        if (state.titlePromotion && title.promotion_id !== state.titlePromotion) {
          return false;
        }
        if (state.titleDivision && title.division !== state.titleDivision) {
          return false;
        }

        return query.includes([
          title.title_id,
          title.division,
          repo.promotionName(title.promotion_id),
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
        const promotionCompare = repo.promotionName(a.promotion_id).localeCompare(
          repo.promotionName(b.promotion_id),
          "ja"
        );
        if (promotionCompare !== 0) return promotionCompare;
        return String(a.division ?? "").localeCompare(String(b.division ?? ""), "ja");
      });

    if (titles.length === 0) {
      return emptyMessage();
    }

    let previousGroup = "";
    const { sources } = this.ctx;

    return titles
      .map((title) => {
        const group = `${repo.promotionName(title.promotion_id)} / ${title.division ?? "階級未設定"}`;
        const groupHeader =
          group !== previousGroup ? `<h2 class="title-group-heading">${escapeHtml(group)}</h2>` : "";
        previousGroup = group;

        const lineage = [...(title.lineage ?? [])]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((reign) =>
            this.ctx.components.relatedItem(
              `
          <p class="reign-label">${escapeHtml(reign.reign_label ?? `${reign.order}代`)}</p>
          <p class="fighter-name">${navigation.fighterLink(reign.fighter_id, reign.fighter_name)}</p>
          <p class="meta">
            ${reign.won_at_event_id ? `獲得: ${navigation.eventLink(reign.won_at_event_id, repo.eventName(reign.won_at_event_id))}` : ""}
            ${reign.lost_at_event_id ? `${reign.won_at_event_id ? " / " : ""}喪失: ${navigation.eventLink(reign.lost_at_event_id, repo.eventName(reign.lost_at_event_id))}` : ""}
            ${reign.source_video_id ? ` / 出典: ${sources.renderVideoRefs([reign.source_video_id], { inline: true })}` : ""}
            ${!reign.source_video_id && reign.source_article_id ? ` / 出典: ${sources.renderArticleRefs(reign.source_article_id)}` : ""}
          </p>
        `,
              "lineage-card"
            )
          )
          .join("");

        return `
        ${groupHeader}
        <article class="card title-card">
          <h3>${escapeHtml(repo.titleDisplayName(title))}</h3>
          ${components.detailDisclosure([
            ["title_id", `<code>${escapeHtml(title.title_id)}</code>`],
            ["団体", escapeHtml(repo.promotionName(title.promotion_id))],
            ["階級", renderValue(title.division)],
            ["変遷数", renderValue((title.lineage ?? []).length)],
          ])}
          ${lineage ? components.relatedGrid(lineage) : ""}
        </article>
      `;
      })
      .join("");
  }

  mentions() {
    const { state, query, sources, labels, components } = this.ctx;

    const mentions = this.ctx.repo.sourceMentions.filter(
      (mention) =>
        (!state.mentionType || mention.mention_type === state.mentionType) &&
        query.includes([query.mentionSearchText(mention)])
    );

    if (mentions.length === 0) {
      return emptyMessage();
    }

    return mentions
      .map(
        (mention) => `
    <article class="card record-card source-mention-card">
      <h2>
        <span class="video-badge">${escapeHtml(labels.mentionType(mention.mention_type))}</span>
        ${escapeHtml(mention.entity_hint || mention.matched_text || mention.mention_id)}
      </h2>
      ${sources.renderSourceMentionLink(mention)}
      <p>${escapeHtml(mention.matched_text || "本文なし")}</p>
      <details class="source-body">
        <summary>文脈を表示</summary>
        <pre>${escapeHtml(mention.context || mention.matched_text || "")}</pre>
      </details>
      ${components.detailDisclosure([
        ["mention_id", `<code>${escapeHtml(mention.mention_id)}</code>`],
        ["source_id", `<code>${escapeHtml(mention.source_id)}</code>`],
        ["entity_type", renderValue(mention.entity_type)],
        ["confidence", renderValue(mention.confidence)],
        ["line_number", renderValue(mention.line_number)],
        ["source_ref_id", renderValue(mention.source_ref_id)],
        ["notes", renderValue(mention.notes)],
      ])}
    </article>
  `
      )
      .join("");
  }

  sources() {
    const { query, sources, labels, components } = this.ctx;

    const documents = this.ctx.repo.sourceDocuments.filter((document) =>
      query.includes([
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

    return documents
      .map(
        (document) => `
    <article class="card record-card source-card">
      <h2>${escapeHtml(document.title || document.source_ref_id)}</h2>
      <p class="meta">
        ${escapeHtml(labels.sourceType(document.source_type))}
        / ${escapeHtml(document.published_at || "日付未入力")}
        / ${escapeHtml(document.source_ref_id)}
      </p>
      ${
        document.url
          ? `
        <p>
          <a href="${escapeHtml(document.url)}" target="_blank" rel="noopener noreferrer">出典を開く</a>
        </p>
      `
          : ""
      }
      <p>${escapeHtml(document.content_preview || "プレビュー未入力")}</p>
      ${sources.renderSourceReferenceCounts(document.source_id)}
      ${sources.renderSourceBody(document)}
      ${components.detailDisclosure([
        ["source_id", `<code>${escapeHtml(document.source_id)}</code>`],
        [
          "URL",
          document.url
            ? `<a href="${escapeHtml(document.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(document.url)}</a>`
            : "未入力",
        ],
        ["取得日時", renderValue(document.fetched_at)],
        [
          "content_hash",
          document.content_hash ? `<code>${escapeHtml(document.content_hash)}</code>` : "未入力",
        ],
        ["notes", renderValue(document.notes)],
      ])}
    </article>
  `
      )
      .join("");
  }
}
