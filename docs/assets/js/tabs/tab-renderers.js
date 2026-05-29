import {
  boutResultText,
  escapeHtml,
  externalLink,
  joinPresent,
  renderBooleanJa,
  renderIdList,
  renderTextList,
  renderValue,
} from "../ui/html-utils.js";

function mdToHtml(md) {
  let s = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // tables: consecutive lines starting with |
  s = s.replace(/((?:^\|.+\n?)+)/gm, (block) => {
    const lines = block.trim().split("\n").filter(l => !/^\s*\|[-| :]+\|\s*$/.test(l));
    return "<table>" + lines.map(l => "<tr>" +
      l.replace(/^\||\|$/g, "").split("|").map(c => `<td>${c.trim()}</td>`).join("") +
    "</tr>").join("") + "</table>\n";
  });

  s = s
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm,  "<h2>$1</h2>")
    .replace(/^# (.+)$/gm,   "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/  \n/g, "<br>");

  s = s.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`);

  s = s.split(/\n\n+/).map(p => {
    p = p.trim();
    if (!p || /^<(h[1-6]|ul|table)/.test(p)) return p;
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");

  return s;
}

/** Template Method の具象: 各タブの HTML 生成 */
export class TabRenderers {
  /** @param {import("../core/view-context.js").ViewContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }

  focusedOrFiltered(focusedId, findRecord, records, predicate) {
    return focusedId ? [findRecord(focusedId)].filter(Boolean) : records.filter(predicate);
  }

  boutDecisionLine(bout) {
    const res = [bout.result?.method_normalized, bout.result?.technique, bout.result?.decision_score].filter(Boolean);
    return res.length > 0 ? res.join(" ") : "";
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
      const b = repo.findRichBout(id);
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

  renderBoutCard(b) {
    const { navigation, components, sources, repo, labels } = this.ctx;
    const resultLine = boutResultText(b);
    const summary = navigation.renderBoutResultSummary(b);
    const hasResult = summary || resultLine;

    return `
      <article class="card record-card bout-card">
        <h2>${navigation.boutMatchup(b)}</h2>
        <p class="meta">
          ${navigation.eventLink(b.event_id, repo.eventName(b.event_id))} / ${escapeHtml(b.division ?? "")}
          ${b.numbers_records?.length ? `<span class="video-badge">名鑑</span>` : ""}
        </p>
        ${hasResult ? `<p class="result">${summary} ${escapeHtml(resultLine)}</p>` : ""}
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
          ["形式 (名鑑)", b.numbers_records?.[0]?.bout_format],
          ["結果状態", labels.resultStatus(b.result_status)],
          ["選手", `<ul class="inline-list">${this.renderFighterRows(b)}</ul>`],
          ["決着", this.boutDecisionLine(b)],
          ["王座", b.title?.is_title_bout ? joinPresent([b.title.title_id, b.title.title_result]) : ""],
          ["推定元動画", renderIdList([b.inferred_from_video_id])],
          ["推定信頼度", b.inferred_confidence],
          ["メモ", b.notes],
        ])}
      </article>
    `;
  }

  renderFighterCard(f) {
    const { components, sources, related, repo } = this.ctx;
    const nd = f.numbers_data;
    const od = f.official_data;
    return `
      <article class="card record-card fighter-card">
        <h2>
          ${escapeHtml(f.display_name)}
          ${od?.nickname ? `<span class="fighter-nickname">「${escapeHtml(od.nickname)}」</span>` : ""}
        </h2>
        <p class="meta">
          ${escapeHtml(f.main_division ?? "")} / ${escapeHtml(repo.promotionName(f.main_promotion_id))}
          ${nd ? `<span class="video-badge">名鑑</span>` : ""}
          ${od ? `<span class="video-badge official-badge">公式</span>` : ""}
        </p>
        ${f.summary ? `<p class="fighter-summary">${escapeHtml(f.summary)}</p>` : ""}
        ${components.definitionList([
          ["所属", f.profile?.gym],
          ["身長・年齢", joinPresent([f.profile?.height, f.profile?.age])],
          ["国籍", f.profile?.nationality],
        ])}
        ${od?.wins != null ? `
          <div class="official-stats-block">
            <span class="official-stat">${od.wins}勝 ${od.losses}敗${od.draws ? ` ${od.draws}分` : ""}</span>
          </div>
        ` : ""}
        ${nd ? `
          <div class="numbers-stats-block">
            <span class="numbers-stat">通算: ${escapeHtml(joinPresent([nd.stats?.fight_count ? `${nd.stats.fight_count}戦` : "", nd.stats?.wins ? `${nd.stats.wins}勝` : "", nd.stats?.losses ? `${nd.stats.losses}負` : ""], " "))}</span>
            ${nd.achievements?.white_glove_count ? `<span class="numbers-stat">白グローブ: ${nd.achievements.white_glove_count}回</span>` : ""}
            ${nd.achievements?.belt_marker ? `<span class="numbers-stat achievement-marker">👑 ${escapeHtml(nd.achievements.belt_marker)}</span>` : ""}
            ${nd.achievements?.tournament_win_marker ? `<span class="numbers-stat achievement-marker">🏆 ${escapeHtml(nd.achievements.tournament_win_marker)}</span>` : ""}
          </div>
        ` : ""}
        ${related.renderRelatedBouts(f.fighter_id)}
        ${this.renderFighterSnapshots(f.fighter_id)}
        ${components.primaryArticleRefList(sources.renderArticleRef.bind(sources), f.source_article_ids)}
        ${components.detailDisclosure([
          ["fighter_id", `<code>${escapeHtml(f.fighter_id)}</code>`],
          ["別名", renderTextList(f.aliases)],
          ["主階級", f.main_division],
          ["主団体", repo.promotionName(f.main_promotion_id)],
          ["名鑑勝率", nd?.stats?.win_rate],
          ["名鑑出場大会", nd?.achievements?.tournament_entry_raw],
          ["推定元動画", renderIdList(f.inferred_from_video_ids)],
          ["推定信頼度", f.inferred_confidence],
        ])}
      </article>
    `;
  }

  renderEventCard(e) {
    const { navigation, components, sources, related, repo } = this.ctx;
    const od = e.official_data;
    return `
      <article class="card record-card event-card">
        <h2>${escapeHtml(e.name)}</h2>
        <p class="meta">
          ${repo.promotionName(e.promotion_id)} / ${escapeHtml(e.published_at ?? "")}
          ${od ? `<span class="video-badge official-badge">公式</span>` : ""}
        </p>
        <p>${escapeHtml(e.summary || "概要未入力")}</p>
        ${od?.champion ? `
          <div class="official-stats-block">
            <span class="official-stat">優勝: ${escapeHtml(od.champion)}</span>
            ${od.runner_up ? `<span class="official-stat">準優勝: ${escapeHtml(od.runner_up)}</span>` : ""}
          </div>
        ` : ""}
        ${sources.renderVideoLinks("event", e.event_id, repo.videoIdsLinkedToEventBouts(e.event_id))}
        ${related.renderEventBouts(e.event_id)}
        ${sources.renderSourceReferences(repo.sourceReferencesForEvent(e))}
        ${components.primaryArticleRefs(sources.renderArticleRefs.bind(sources), e.source_article_id)}
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
    `;
  }

  renderPromotionCard(p) {
    const { components, sources, repo } = this.ctx;
    return `
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
    `;
  }

  renderVideoCard(video) {
    const { components, labels, sources, repo } = this.ctx;
    return components.recordCard("video-card", `<h2>${externalLink(video.url, video.title)}</h2>`, `
      <p class="meta">${escapeHtml(video.channel_name ?? "")}${video.published_at ? ` / ${escapeHtml(video.published_at)}` : ""}</p>
      <div class="video-badges">
        <span class="video-badge">${escapeHtml(labels.videoType(video.video_type))}</span>
        <span class="video-badge">${escapeHtml(labels.linkStatus(video.link_status))}</span>
      </div>
      ${components.section("動画URL", sources.renderVideoSourceBlock(video, video.url), "primary-links")}
      ${sources.renderVideoDescriptionPreview(video)}
      ${components.primaryArticleRefList(sources.renderArticleRef.bind(sources), video.source_article_ids)}
      ${this.renderVideoLinkedEntities(video)}
      ${components.detailDisclosure([
        ["video_id", `<code>${escapeHtml(video.video_id)}</code>`],
        ["原題", video.original_title],
        ["platform", video.platform],
        ["platform_video_id", video.platform_video_id],
        ["公式状態", video.official_status],
        ["動画種別", labels.videoType(video.video_type)],
        ["紐づけ状態", labels.linkStatus(video.link_status)],
        ["重複候補", video.duplicate_group_id],
        ["重複メモ", video.duplicate_note],
        ["メモ", video.notes],
      ])}
    `);
  }

  renderTitleCard(t) {
    const { components, repo } = this.ctx;
    const lineage = [...(t.lineage ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((reign) => this.renderLineageCard(reign))
      .join("");
    return `<article class="card title-card">
      <h3>${escapeHtml(repo.titleDisplayName(t))}</h3>
      ${components.detailDisclosure([["title_id", `<code>${escapeHtml(t.title_id)}</code>`], ["団体", repo.promotionName(t.promotion_id)], ["階級", t.division], ["変遷数", (t.lineage ?? []).length]], "詳細", { open: true })}
      ${lineage ? components.relatedGrid(lineage) : ""}
    </article>`;
  }

  renderMentionCard(m) {
    const { sources, labels, components } = this.ctx;
    return `
      <article class="card record-card source-mention-card">
        <h2><span class="video-badge">${escapeHtml(labels.mentionType(m.mention_type))}</span> ${escapeHtml(m.entity_hint || m.matched_text || m.mention_id)}</h2>
        ${sources.renderSourceMentionLink(m)}
        <p>${escapeHtml(m.matched_text || "本文なし")}</p>
        <details class="source-body"><summary>文脈を表示</summary><pre>${escapeHtml(m.context || m.matched_text || "")}</pre></details>
        ${components.detailDisclosure([["mention_id", `<code>${escapeHtml(m.mention_id)}</code>`], ["source_id", `<code>${escapeHtml(m.source_id)}</code>`], ["entity_type", m.entity_type], ["confidence", m.confidence], ["line_number", m.line_number], ["source_ref_id", m.source_ref_id], ["notes", m.notes]])}
      </article>
    `;
  }

  renderSourceCard(d) {
    const { sources, labels, components } = this.ctx;
    return components.recordCard("source-card", `<h2>${escapeHtml(d.title || d.source_ref_id)}</h2>`, `
      <p class="meta">${escapeHtml(labels.sourceType(d.source_type))} / ${escapeHtml(d.published_at || "日付未入力")} / ${escapeHtml(d.source_ref_id)}</p>
      ${d.url ? `<p>${externalLink(d.url, "出典を開く")}</p>` : ""}
      <p>${escapeHtml(d.content_preview || "プレビュー未入力")}</p>
      ${sources.renderSourceReferenceCounts(d.source_id)}
      ${sources.renderSourceBody(d)}
      ${components.detailDisclosure([["source_id", `<code>${escapeHtml(d.source_id)}</code>`], ["URL", d.url ? externalLink(d.url, d.url) : "未入力"], ["取得日時", d.fetched_at], ["content_hash", d.content_hash ? `<code>${escapeHtml(d.content_hash)}</code>` : "未入力"], ["notes", d.notes]])}
    `);
  }

  renderOfficialPageDocCard(page) {
    const el = document.createElement("article");
    el.className = "card record-card official-page-doc-card";
    el.innerHTML = `
      <details>
        <summary>
          <h2 class="inline">${escapeHtml(page.title)}</h2>
          <span class="meta">${escapeHtml(page.description ?? "")}</span>
        </summary>
        <div class="official-doc-body">${page.body_html}</div>
      </details>
    `;
    return el.outerHTML;
  }

  renderOfficialNewsDocCard(article) {
    const el = document.createElement("article");
    el.className = "card record-card official-news-doc-card";
    el.innerHTML = `
      <h2>${escapeHtml(article.title)}</h2>
      <p class="meta">${escapeHtml(joinPresent([article.date, article.category]))}</p>
      <div class="official-doc-body">${mdToHtml(article.body_md ?? "")}</div>
    `;
    return el.outerHTML;
  }

  official() {
    const { repo } = this.ctx;
    const pages = repo.officialPages.map(p => ({ _kind: "page", ...p }));
    const news = [...repo.officialNews]
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .map(n => ({ _kind: "news", ...n }));
    const items = [...pages, ...news];
    return {
      items,
      renderItem: (item) =>
        item._kind === "page"
          ? this.renderOfficialPageDocCard(item)
          : this.renderOfficialNewsDocCard(item),
    };
  }

  bouts() {
    const { query, repo } = this.ctx;
    return {
      items: repo.richBouts.filter((b) => query.boutMatches(b)),
      renderItem: (b) => this.renderBoutCard(b),
    };
  }

  fighters() {
    const { state, query, repo } = this.ctx;
    return {
      items: this.focusedOrFiltered(
        state.focusFighterId,
        repo.findRichFighter.bind(repo),
        repo.richFighters,
        (f) => query.fighterMatches(f)
      ),
      renderItem: (f) => this.renderFighterCard(f),
    };
  }

  events() {
    const { state, query, repo } = this.ctx;
    return {
      items: this.focusedOrFiltered(
        state.focusEventId,
        repo.findRichEvent.bind(repo),
        repo.richEvents,
        (e) => query.eventMatches(e)
      ),
      renderItem: (e) => this.renderEventCard(e),
    };
  }

  promotions() {
    const { query, repo } = this.ctx;
    return {
      items: repo.richPromotions.filter((p) => query.promotionMatches(p)),
      renderItem: (p) => this.renderPromotionCard(p),
    };
  }

  videos() {
    const { query, repo } = this.ctx;
    return {
      items: repo.richVideos.filter((v) => query.videoMatches(v)),
      renderItem: (v) => this.renderVideoCard(v),
    };
  }

  titles() {
    const { query, repo } = this.ctx;
    const list = repo.richTitles
      .filter((t) => query.titleMatches(t))
      .sort(
        (a, b) =>
          repo.promotionName(a.promotion_id).localeCompare(repo.promotionName(b.promotion_id), "ja") ||
          String(a.division ?? "").localeCompare(String(b.division ?? ""), "ja")
      );

    // Flatten: interleave group headers as synthetic items
    const flat = [];
    let prev = "";
    for (const t of list) {
      const g = `${repo.promotionName(t.promotion_id)} / ${t.division ?? "階級未設定"}`;
      if (g !== prev) {
        flat.push({ _header: true, label: g });
        prev = g;
      }
      flat.push(t);
    }

    return {
      items: flat,
      renderItem: (entry) =>
        entry._header
          ? `<h2 class="title-group-heading">${escapeHtml(entry.label)}</h2>`
          : this.renderTitleCard(entry),
      estimateSize: (i) => (flat[i]?._header ? 60 : 280),
    };
  }

  mentions() {
    const { query, repo } = this.ctx;
    return {
      items: repo.richSourceMentions.filter((m) => query.mentionMatches(m)),
      renderItem: (m) => this.renderMentionCard(m),
    };
  }

  sources() {
    const { query, repo } = this.ctx;
    return {
      items: repo.sourceDocuments.filter((d) => query.sourceDocumentMatches(d)),
      renderItem: (d) => this.renderSourceCard(d),
    };
  }

  renderNumbersFighterCard(f) {
    const { components } = this.ctx;
    const stats = [
      f.fight_count ? `${f.fight_count}戦` : null,
      f.wins != null ? `${f.wins}勝` : null,
      f.losses != null ? `${f.losses}負` : null,
    ].filter(Boolean).join(" ");
    return `
      <article class="card record-card numbers-fighter-card">
        <h2>${escapeHtml(f.display_name)}</h2>
        <p class="meta">
          ${escapeHtml(joinPresent([f.main_division, f.main_promotion_id]))}
          <span class="video-badge">${f.source_confidence === "numbers" ? "名鑑" : escapeHtml(f.source_confidence ?? "")}</span>
        </p>
        ${stats ? `<p class="meta">${escapeHtml(stats)}</p>` : ""}
        ${f.belt_marker ? `<p class="meta">👑 ${escapeHtml(f.belt_marker)}</p>` : ""}
        ${f.tournament_win_marker ? `<p class="meta">🏆 ${escapeHtml(f.tournament_win_marker)}</p>` : ""}
        ${components.detailDisclosure([
          ["numbers_fighter_id", `<code>${escapeHtml(f.numbers_fighter_id)}</code>`],
          ["キャッチコピー", f.catchphrase],
          ["メモ", f.notes],
        ])}
      </article>
    `;
  }

  renderNumbersNameMatchCard(m) {
    const { components } = this.ctx;
    const matchedLabel = m.matched_fighter_id
      ? `→ ${escapeHtml(m.matched_display_name || m.matched_fighter_id)}`
      : "→ 未対応";
    return `
      <article class="card record-card numbers-match-card">
        <h2>${escapeHtml(m.numbers_name)} ${matchedLabel}</h2>
        <p class="meta">
          <span class="video-badge">${escapeHtml(m.match_confidence || "未対応")}</span>
          ${m.match_method ? escapeHtml(m.match_method) : ""}
        </p>
        ${components.detailDisclosure([
          ["numbers_fighter_id", `<code>${escapeHtml(m.numbers_fighter_id)}</code>`],
          ["matched_fighter_id", m.matched_fighter_id ? `<code>${escapeHtml(m.matched_fighter_id)}</code>` : "未対応"],
          ["candidate_fighter_id", m.candidate_fighter_id ? `<code>${escapeHtml(m.candidate_fighter_id)}</code>` : ""],
          ["メモ", m.notes],
        ])}
      </article>
    `;
  }

  renderNumbersFightRecordCard(r) {
    const { components } = this.ctx;
    const matchup = `${escapeHtml(r.fighter_name)} vs ${escapeHtml(r.opponent_name || "不明")}`;
    const eventMeta = joinPresent([
      r.division,
      r.promotion_id,
      r.event_number_normalized ? `第${r.event_number_normalized}回` : "",
    ]);
    return `
      <article class="card record-card numbers-record-card">
        <h2>${matchup}</h2>
        <p class="meta">${escapeHtml(eventMeta)}</p>
        ${r.result ? `<p class="result">${escapeHtml(r.result_mark || "")} ${escapeHtml(r.result)}</p>` : ""}
        ${components.detailDisclosure([
          ["record_id", `<code>${escapeHtml(r.record_id)}</code>`],
          ["matched_fighter_id", r.matched_fighter_id ? `<code>${escapeHtml(r.matched_fighter_id)}</code>` : "未対応"],
          ["形式", r.bout_format],
          ["詳細", r.detail_raw],
        ])}
      </article>
    `;
  }

  renderOfficialPlayerCard(p) {
    const { components } = this.ctx;
    const record = [
      p.wins != null ? `${p.wins}勝` : null,
      p.losses != null ? `${p.losses}敗` : null,
      p.draws ? `${p.draws}分` : null,
    ].filter(Boolean).join(" ");
    return `
      <article class="card record-card official-player-card">
        <h2>
          ${escapeHtml(p.name)}
          ${p.nickname ? `<span class="fighter-nickname">「${escapeHtml(p.nickname)}」</span>` : ""}
        </h2>
        <p class="meta">
          ${escapeHtml(joinPresent([p.weight_class, p.organization, p.nationality]))}
          <span class="video-badge official-badge">公式</span>
        </p>
        ${record ? `<p class="meta">${escapeHtml(record)}</p>` : ""}
        ${p.bio ? `<p>${escapeHtml(p.bio)}</p>` : ""}
        ${components.detailDisclosure([
          ["id", `<code>${escapeHtml(p.id)}</code>`],
          ["読み", p.name_kana],
          ["年齢", p.age],
          ["身長", p.height],
          ["デビュー", p.debut],
          ["所属", p.gym],
        ])}
      </article>
    `;
  }

  numbersFighters() {
    const { repo } = this.ctx;
    return {
      items: repo.numbersFighters,
      renderItem: (f) => this.renderNumbersFighterCard(f),
    };
  }

  numbersNameMatches() {
    const { repo } = this.ctx;
    return {
      items: repo.numbersNameMatches,
      renderItem: (m) => this.renderNumbersNameMatchCard(m),
    };
  }

  numbersFightRecords() {
    const { repo } = this.ctx;
    return {
      items: repo.numbersFightRecords,
      renderItem: (r) => this.renderNumbersFightRecordCard(r),
    };
  }

  officialPlayers() {
    const { repo } = this.ctx;
    return {
      items: repo.officialPlayers,
      renderItem: (p) => this.renderOfficialPlayerCard(p),
    };
  }

  renderOfficialTournamentCard(t) {
    const { components } = this.ctx;
    return `
      <article class="card record-card official-tournament-card">
        <h2>${escapeHtml(t.name)}</h2>
        <p class="meta">
          ${escapeHtml(t.date ?? "")}
          <span class="video-badge official-badge">トーナメント</span>
        </p>
        ${t.champion ? `<p class="meta">優勝: ${escapeHtml(t.champion)}${t.runner_up ? ` / 準優勝: ${escapeHtml(t.runner_up)}` : ""}</p>` : ""}
        ${components.detailDisclosure([
          ["id", `<code>${escapeHtml(t.id)}</code>`],
          ["video_id", t.video_id ? `<code>${escapeHtml(t.video_id)}</code>` : ""],
        ])}
      </article>
    `;
  }

  renderOfficialMatchCard(m) {
    const { components } = this.ctx;
    return `
      <article class="card record-card official-match-card">
        <h2>${escapeHtml(m.fighter1 ?? "")} vs ${escapeHtml(m.fighter2 ?? "")}</h2>
        <p class="meta">
          ${escapeHtml(joinPresent([m.event, m.date, m.weight_class]))}
          <span class="video-badge official-badge">試合</span>
        </p>
        ${m.result ? `<p class="result">${escapeHtml(m.result)}</p>` : ""}
        ${components.detailDisclosure([
          ["id", `<code>${escapeHtml(m.id)}</code>`],
          ["決着", m.method],
          ["ラウンド", m.round],
          ["メモ", m.notes],
        ])}
      </article>
    `;
  }

  renderOfficialHistoryCard(h) {
    return `
      <article class="card record-card official-history-card">
        <h2>${escapeHtml(h.title)}</h2>
        <p class="meta">
          ${escapeHtml(joinPresent([h.year, h.era, h.month ? `${h.month}月` : ""]))}
          <span class="video-badge official-badge">沿革</span>
        </p>
        ${h.description ? `<p>${escapeHtml(h.description)}</p>` : ""}
      </article>
    `;
  }

  officialMisc() {
    const { repo } = this.ctx;
    const items = [
      ...repo.officialTournaments.map((t) => ({ _type: "tournament", ...t })),
      ...repo.officialMatches.map((m) => ({ _type: "match", ...m })),
      ...repo.officialHistory.map((h) => ({ _type: "history", ...h })),
    ];
    return {
      items,
      renderItem: (item) => {
        if (item._type === "tournament") return this.renderOfficialTournamentCard(item);
        if (item._type === "match") return this.renderOfficialMatchCard(item);
        return this.renderOfficialHistoryCard(item);
      },
    };
  }
}
