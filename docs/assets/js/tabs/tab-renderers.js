import {
  escapeHtml,
  externalLink,
  joinPresent,
  renderBooleanJa,
  renderIdList,
  renderTextList,
  renderValue,
} from "../ui/html-utils.js";

/** Template Method の具象: 各タブの HTML 生成 */
export class TabRenderers {
  /** @param {import("../core/view-context.js").ViewContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }

  recordList(records, renderItem) { return this.ctx.components.recordList(records, renderItem); }

  focusedOrFiltered(focusedId, findRecord, records, predicate) {
    return focusedId ? [findRecord(focusedId)].filter(Boolean) : records.filter(predicate);
  }

  boutResultLine(bout) {
    return joinPresent([
      bout.result?.round ? `${bout.result.round}R` : "",
      bout.result?.time,
      bout.result?.method_raw,
    ], "");
  }

  boutDecisionLine(bout) {
    return joinPresent([bout.result?.method_normalized, bout.result?.technique, bout.result?.decision_score]);
  }

  promotionRuleRows(promotion) {
    return [
      ["会場", promotion.rules?.venue],
      ["ラウンド", promotion.rules?.rounds],
      ["判定", promotion.rules?.judging],
      ["グローブ", promotion.rules?.glove],
      ["肘", renderBooleanJa(promotion.rules?.elbows)],
      ["サッカーボールキック", renderBooleanJa(promotion.rules?.soccer_kicks)],
      ["踏みつけ", renderBooleanJa(promotion.rules?.stomps)],
      ["4点頭部キック", renderBooleanJa(promotion.rules?.four_point_head_kicks)],
      ["4点頭部膝", renderBooleanJa(promotion.rules?.four_point_head_knees)],
    ];
  }

  renderFighterRows(bout) {
    const { navigation } = this.ctx;
    return (bout.fighters ?? []).map(f => `
      <li>
        <span>${navigation.fighterLink(f.fighter_id, f.name)}</span>
        <span class="meta">${escapeHtml(joinPresent([f.corner, f.result || "unknown"]))}</span>
      </li>
    `).join("");
  }

  renderFighterSnapshots(fighterId) {
    const { components, navigation, sources, repo } = this.ctx;
    const s = repo.fighterSnapshotsForFighter(fighterId);
    if (s.length === 0) return "";
    return components.relatedSection("出典別プロフィール", s, (x) => components.relatedItem(`
      <span class="meta">
        ${x.event_id ? navigation.eventLink(x.event_id, repo.eventName(x.event_id)) : "大会未設定"}
        / ${sources.renderArticleRefs(x.source_article_id)}
      </span>
      ${components.definitionList([
        ["snapshot_id", `<code>${escapeHtml(x.snapshot_id)}</code>`],
        ["所属", renderValue(x.gym)],
        ["身長・年齢", renderValue(joinPresent([x.height, x.age]))],
        ["戦績", renderValue(x.record_text)],
        ["主団体", renderValue(repo.promotionName(x.main_promotion_id))],
        ["肩書き", renderValue(x.titles_text)],
        ["キャッチコピー", renderValue(x.catchphrase)],
      ])}
    `, "fighter-snapshot-card"));
  }

  renderPromotionEvents(promotionId) {
    const { components, navigation, repo } = this.ctx;
    const e = repo.eventsForPromotion(promotionId);
    if (e.length === 0) return "";
    return components.relatedSection("大会", e.slice(0, 12), (x) => components.relatedItem(`
      <h4>${navigation.eventLink(x.event_id, x.name)}</h4>
      <p class="meta">${escapeHtml(joinPresent([x.event_type, x.published_at || x.event_date]))}</p>
    `, "promotion-event-card")) + (e.length > 12 ? `<p class="meta">ほか ${e.length - 12} 件</p>` : "");
  }

  renderPromotionTitles(promotionId) {
    const { components, repo } = this.ctx;
    const t = repo.titlesForPromotion(promotionId);
    if (t.length === 0) return "";
    return components.relatedSection("王座", t, (x) => components.relatedItem(`
      <h4>${escapeHtml(repo.titleDisplayName(x))}</h4>
      <p class="meta">${escapeHtml(x.lineage?.length ?? 0)} reigns</p>
    `, "promotion-title-card"));
  }

  renderVideoLinkedEntities(video) {
    const { components, labels, repo, navigation } = this.ctx;
    const l = repo.videoLinksForVideo(video.video_id);
    if (l.length === 0) return "";
    return components.relatedSection("紐づけ先", l, (x) => components.relatedItem(`
      <span class="video-badge">${escapeHtml(labels.relationType(x.relation_type))}</span>
      <span>${this.#renderLinkedEntityLabel(x)}</span>
      ${x.start_time || x.end_time ? `<span class="meta">${escapeHtml(joinPresent([x.start_time, x.end_time], " - "))}</span>` : ""}
      ${x.notes ? `<p class="meta">${escapeHtml(x.notes)}</p>` : ""}
    `, "video-link-entity-card"));
  }

  #renderLinkedEntityLabel(link) {
    const { navigation, repo } = this.ctx;
    const id = link.entity_id;
    if (link.entity_type === "event") return navigation.eventLink(id, repo.eventName(id));
    if (link.entity_type === "bout") {
      const b = repo.findBout(id);
      return b ? navigation.boutMatchup(b) : `<code>${escapeHtml(id)}</code>`;
    }
    if (link.entity_type === "fighter") return navigation.fighterLink(id, repo.fighterName(id));
    if (link.entity_type === "promotion") return escapeHtml(repo.promotionName(id));
    return `<code>${escapeHtml(id)}</code>`;
  }

  renderLineageCard(reign) {
    const { navigation, components, repo, sources } = this.ctx;
    const eventParts = [
      reign.won_at_event_id ? `獲得: ${navigation.eventLink(reign.won_at_event_id, repo.eventName(reign.won_at_event_id))}` : "",
      reign.lost_at_event_id ? `喪失: ${navigation.eventLink(reign.lost_at_event_id, repo.eventName(reign.lost_at_event_id))}` : "",
    ].filter(Boolean);
    const source = reign.source_video_id
      ? `出典: ${sources.renderVideoRefs([reign.source_video_id], { inline: true })}`
      : reign.source_article_id ? `出典: ${sources.renderArticleRefs(reign.source_article_id)}` : "";

    return components.relatedItem(`
      <p class="reign-label">${escapeHtml(reign.reign_label ?? `${reign.order}代`)}</p>
      <p class="fighter-name">${navigation.fighterLink(reign.fighter_id, reign.fighter_name)}</p>
      <p class="meta">${[...eventParts, source].filter(Boolean).join(" / ")}</p>
    `, "lineage-card");
  }

  bouts() {
    const { state, query, navigation, components, sources, repo } = this.ctx;
    const list = state.focusEventId
      ? repo.boutsForEvent(state.focusEventId)
      : repo.bouts.filter((bout) => query.includes(query.boutSearchText(bout)));
    return this.recordList(list, (b) => `
      <article class="card record-card bout-card">
        <h2>${navigation.boutMatchup(b)}</h2>
        <p class="meta">${navigation.eventLink(b.event_id, repo.eventName(b.event_id))} / ${escapeHtml(b.division ?? "")}</p>
        <p class="result">
          ${navigation.renderBoutResultSummary(b)}
          ${escapeHtml(this.boutResultLine(b))}
        </p>
        ${b.title?.is_title_bout ? `<p class="meta">王座戦: ${escapeHtml(b.title.note)}</p>` : ""}
        ${sources.renderVideoLinks("bout", b.bout_id)}
        ${sources.renderSourceReferences(sources.sourceReferencesForBout(b))}
        ${components.detailDisclosure([
          ["bout_id", `<code>${escapeHtml(b.bout_id)}</code>`],
          ["大会", navigation.eventLink(b.event_id, repo.eventName(b.event_id))],
          ["団体", repo.promotionName(b.promotion_id)],
          ["試合順", b.bout_order ? `第${b.bout_order}試合` : ""],
          ["階級", joinPresent([b.division, b.weight_class_id])],
          ["種別", b.bout_type],
          ["結果状態", b.result_status],
          ["選手", `<ul class="inline-list">${this.renderFighterRows(b)}</ul>`],
          ["決着", this.boutDecisionLine(b)],
          ["王座", b.title?.is_title_bout ? joinPresent([b.title.title_id, b.title.title_result]) : ""],
          ["推定元動画", renderIdList([b.inferred_from_video_id])],
          ["推定信頼度", b.inferred_confidence],
          ["メモ", b.notes],
        ])}
      </article>
    `);
  }

  fighters() {
    const { state, query, components, sources, related, repo } = this.ctx;
    const list = this.focusedOrFiltered(
      state.focusFighterId,
      repo.findFighter.bind(repo),
      repo.fighters,
      (fighter) => query.fighterMatches(fighter)
    );
    return this.recordList(list, (f) => `
      <article class="card record-card fighter-card">
        <h2>${escapeHtml(f.display_name)}</h2>
        <p class="meta">${escapeHtml(f.main_division ?? "")} / ${escapeHtml(repo.promotionName(f.main_promotion_id))}</p>
        ${components.primaryArticleRefList(sources.renderArticleRef.bind(sources), f.source_article_ids)}
        ${related.renderRelatedBouts(f.fighter_id)}
        ${components.detailDisclosure([
          ["fighter_id", `<code>${escapeHtml(f.fighter_id)}</code>`],
          ["別名", renderTextList(f.aliases)],
          ["主階級", f.main_division],
          ["主団体", repo.promotionName(f.main_promotion_id)],
          ["所属", f.profile?.gym],
          ["身長・年齢", joinPresent([f.profile?.height, f.profile?.age])],
          ["推定元動画", renderIdList(f.inferred_from_video_ids)],
          ["推定信頼度", f.inferred_confidence],
          ["概要", f.summary],
        ])}
        ${this.renderFighterSnapshots(f.fighter_id)}
      </article>
    `);
  }

  events() {
    const { state, query, navigation, components, sources, related, repo } = this.ctx;
    const list = this.focusedOrFiltered(
      state.focusEventId,
      repo.findEvent.bind(repo),
      repo.events,
      (event) => query.eventMatches(event)
    );
    return this.recordList(list, (e) => `
      <article class="card record-card event-card">
        <h2>${escapeHtml(e.name)}</h2>
        <p class="meta">${repo.promotionName(e.promotion_id)} / ${escapeHtml(e.published_at ?? "")}</p>
        <p>${escapeHtml(e.summary || "概要未入力")}</p>
        ${components.primaryArticleRefs(sources.renderArticleRefs.bind(sources), e.source_article_id)}
        ${sources.renderVideoLinks("event", e.event_id, repo.videoIdsLinkedToEventBouts(e.event_id))}
        ${sources.renderSourceReferences(repo.sourceReferencesForEvent(e))}
        ${related.renderEventBouts(e.event_id)}
        ${components.detailDisclosure([
          ["event_id", `<code>${escapeHtml(e.event_id)}</code>`],
          ["団体", repo.promotionName(e.promotion_id)],
          ["大会番号", e.event_number],
          ["大会種別", e.event_type],
          ["開催日", e.event_date],
          ["公開日", e.published_at],
          ["推定元", e.inferred_from],
          ["推定信頼度", e.inferred_confidence],
        ])}
      </article>
    `);
  }

  promotions() {
    const { query, components, sources, repo } = this.ctx;
    const list = repo.promotions.filter(p => query.promotionMatches(p));
    return this.recordList(list, (p) => `
      <article class="card record-card promotion-card">
        <h2>${escapeHtml(p.name)}</h2>
        <p class="meta">${escapeHtml(p.name_en ?? "")} / ${escapeHtml(p.category ?? "")}</p>
        <p>${escapeHtml(p.summary || "概要未入力")}</p>
        ${components.primaryArticleRefs(sources.renderArticleRefs.bind(sources), p.source_article_ids)}
        ${sources.renderVideoLinks("promotion", p.promotion_id)}
        ${this.renderPromotionEvents(p.promotion_id)}
        ${this.renderPromotionTitles(p.promotion_id)}
        ${components.detailDisclosure([
          ["promotion_id", `<code>${escapeHtml(p.promotion_id)}</code>`],
          ["英字名", p.name_en],
          ["カテゴリ", p.category],
          ["範囲", p.country_scope],
          ...this.promotionRuleRows(p),
        ])}
      </article>
    `);
  }

  videos() {
    const { query, components, labels, sources, repo } = this.ctx;
    const list = repo.videos.filter(v => query.videoMatches(v));
    return this.recordList(list, (v) => components.recordCard("video-card", `<h2>${externalLink(v.url, v.title)}</h2>`, `
      <p class="meta">${escapeHtml(v.channel_name ?? "")}${v.published_at ? ` / ${escapeHtml(v.published_at)}` : ""}</p>
      <div class="video-badges">
        <span class="video-badge">${escapeHtml(labels.videoType(v.video_type))}</span>
        <span class="video-badge">${escapeHtml(labels.linkStatus(v.link_status))}</span>
      </div>
      ${components.section("動画URL", sources.renderVideoSourceBlock(v, v.url), "primary-links")}
      ${components.primaryArticleRefList(sources.renderArticleRef.bind(sources), v.source_article_ids)}
      ${this.renderVideoLinkedEntities(v)}
      ${sources.renderVideoDescriptionPreview(v)}
      ${components.detailDisclosure([
        ["video_id", `<code>${escapeHtml(v.video_id)}</code>`],
        ["原題", v.original_title],
        ["platform", v.platform],
        ["platform_video_id", v.platform_video_id],
        ["公式状態", v.official_status],
        ["動画種別", labels.videoType(v.video_type)],
        ["紐づけ状態", labels.linkStatus(v.link_status)],
        ["重複候補", v.duplicate_group_id],
        ["重複メモ", v.duplicate_note],
        ["メモ", v.notes],
      ])}
    `));
  }

  titles() {
    const { query, components, repo } = this.ctx;
    const list = repo.titles.filter(t => query.titleMatches(t)).sort((a, b) => 
      repo.promotionName(a.promotion_id).localeCompare(repo.promotionName(b.promotion_id), "ja") || String(a.division ?? "").localeCompare(String(b.division ?? ""), "ja")
    );
    if (list.length === 0) return this.recordList(list, () => "");

    let prev = "";
    return this.recordList(list, (t) => {
      const g = `${repo.promotionName(t.promotion_id)} / ${t.division ?? "階級未設定"}`;
      const header = g !== prev ? `<h2 class="title-group-heading">${escapeHtml(g)}</h2>` : "";
      prev = g;
      const lineage = [...(t.lineage ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((reign) => this.renderLineageCard(reign))
        .join("");
      return `${header}<article class="card title-card">
        <h3>${escapeHtml(repo.titleDisplayName(t))}</h3>
        ${components.detailDisclosure([["title_id", `<code>${escapeHtml(t.title_id)}</code>`], ["団体", repo.promotionName(t.promotion_id)], ["階級", t.division], ["変遷数", (t.lineage ?? []).length]])}
        ${lineage ? components.relatedGrid(lineage) : ""}
      </article>`;
    });
  }

  mentions() {
    const { query, sources, labels, components, repo } = this.ctx;
    const list = repo.sourceMentions.filter(m => query.mentionMatches(m));
    return this.recordList(list, (m) => `
      <article class="card record-card source-mention-card">
        <h2><span class="video-badge">${escapeHtml(labels.mentionType(m.mention_type))}</span> ${escapeHtml(m.entity_hint || m.matched_text || m.mention_id)}</h2>
        ${sources.renderSourceMentionLink(m)}
        <p>${escapeHtml(m.matched_text || "本文なし")}</p>
        <details class="source-body"><summary>文脈を表示</summary><pre>${escapeHtml(m.context || m.matched_text || "")}</pre></details>
        ${components.detailDisclosure([["mention_id", `<code>${escapeHtml(m.mention_id)}</code>`], ["source_id", `<code>${escapeHtml(m.source_id)}</code>`], ["entity_type", m.entity_type], ["confidence", m.confidence], ["line_number", m.line_number], ["source_ref_id", m.source_ref_id], ["notes", m.notes]])}
      </article>
    `);
  }

  sources() {
    const { query, sources, labels, components, repo } = this.ctx;
    const list = repo.sourceDocuments.filter(d => query.sourceDocumentMatches(d));
    return this.recordList(list, (d) => components.recordCard("source-card", `<h2>${escapeHtml(d.title || d.source_ref_id)}</h2>`, `
      <p class="meta">${escapeHtml(labels.sourceType(d.source_type))} / ${escapeHtml(d.published_at || "日付未入力")} / ${escapeHtml(d.source_ref_id)}</p>
      ${d.url ? `<p>${externalLink(d.url, "出典を開く")}</p>` : ""}
      <p>${escapeHtml(d.content_preview || "プレビュー未入力")}</p>
      ${sources.renderSourceReferenceCounts(d.source_id)}
      ${sources.renderSourceBody(d)}
      ${components.detailDisclosure([["source_id", `<code>${escapeHtml(d.source_id)}</code>`], ["URL", d.url ? externalLink(d.url, d.url) : "未入力"], ["取得日時", d.fetched_at], ["content_hash", d.content_hash ? `<code>${escapeHtml(d.content_hash)}</code>` : "未入力"], ["notes", d.notes]])}
    `));
  }
}
