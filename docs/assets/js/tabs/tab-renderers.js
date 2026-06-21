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
import { TAB_FILTERS, itemPassesFilters } from "../filters.js";
import { mdToHtml } from "../ui/markdown.js";
import { numbersAchievementLabels } from "../core/data-enricher.js";

/**
 * 役割: 各タブ用の「descriptor 生成メソッド」(official/bouts/fighters…) と、その中で使う
 *   カード HTML 文字列ビルダーをまとめたクラス。タブ表示の見た目はほぼここで決まる。
 * アーキ上の位置: main.js が ctx (ViewContext) を渡して生成し、TabRendererRegistry が
 *   メソッド名 (= タブ ID) で呼び出す。データは ctx.repo (DataRepository) から、絞り込みは
 *   ctx.state + TAB_FILTERS から、副パーツは ctx.components/navigation/sources/related/labels
 *   経由で取得する。
 * 不変条件 / 注意:
 *   - 公開メソッド名は tab-registry.js の #strategies のキーと完全一致させること
 *     (例: official/tsushin/bouts/fighters/events/promotions/titles/videos/sources/mentions/
 *      numbersFighters/numbersNameMatches/numbersFightRecords/officialPlayers/officialMisc)。
 *   - 各メソッドは { items, renderItem, estimateSize?, itemsSource? } 形の descriptor を返す。
 *     itemsSource を返すと registry が配列の同一性で再描画要否を判定する (official() 参照)。
 *   - HTML は文字列連結で組むため、外部・任意文字列は必ず escapeHtml で囲むこと
 *     (body_html/body_md など信頼済み生成 HTML のみ非エスケープで挿入)。
 *   - 絞り込みタブは itemPassesFilters(item, TAB_FILTERS.<tab>, state) を通すこと。フィルタ
 *     仕様の単一の真実は filters.js。
 * 関連 skill: .agents/skills/arakaku-viewer-ui (描画), arakaku-filters (絞り込み)。
 */
/** Template Method の具象: 各タブの HTML 生成 */
export class TabRenderers {
  /** @param {import("../core/view-context.js").ViewContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }

  // focus (特定 ID へのジャンプ) 中はその 1 件だけを返し、未設定時のみ通常の絞り込み一覧を返す。
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
        ${sources.renderSourceReferences(sources.sourceReferencesForBout(b), "出典候補", { collapsed: true })}
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

  /**
   * 公式 bio (王座履歴・トーナメント成績など) を「／」区切りで分解してリスト表示する。
   * summary (名鑑/通信由来) に既出のセグメントは重複を避けて除外する
   * (名鑑 notes が公式 bio をほぼ網羅している選手が多いため)。
   */
  renderOfficialBio(od, summary) {
    const bio = od?.bio;
    if (!bio) return "";
    // 区切り・空白を全部除去した正規化文字列同士で包含判定し、表記揺れに依らず重複を弾く。
    const ref = (summary ?? "").replace(/[\s／/、,]/g, "");
    const items = bio
      .split(/[／/]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((item) => !ref.includes(item.replace(/[\s／/、,]/g, "")));
    if (items.length === 0) return "";
    return `
      <ul class="official-bio">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    `;
  }

  // 名鑑の win_rate (0〜1 の分数文字列) をパーセント 1 桁に整形する。生値は冗長なため。
  // 非数値/空は "" を返す。#recordText・選手カード詳細・管理名鑑カードで共用する。
  #winRatePercent(value) {
    if (value == null || value === "") return "";
    const n = Number(value);
    return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : "";
  }

  // 戦績 (record: {fight_count,wins,losses,draws,win_rate}) を
  // 「N戦 X勝Y敗Z分 (勝率 R%)」の 1 行にする。公開選手カード・管理名鑑/公式カードで共用。
  #recordText(r) {
    const base = joinPresent([
      r.fight_count != null ? `${r.fight_count}戦` : "",
      r.wins != null ? `${r.wins}勝` : "",
      r.losses != null ? `${r.losses}敗` : "",
      r.draws ? `${r.draws}分` : "",
    ], " ");
    const wr = this.#winRatePercent(r.win_rate);
    return wr ? `${base} (勝率 ${wr})` : base;
  }

  /**
   * 公式 + 名鑑をマージした「戦績・プロフィール」ブロック。戦績は profile.record に
   * 一度だけ集約済み (二重表示しない)。名鑑実績マーカーと、summary と重複しない公式 bio を併記する。
   */
  renderProfileBlock(f) {
    const r = f.profile?.record;
    const achievements = f.profile?.achievements ?? [];
    const entry = f.numbers_data?.achievements?.tournament_entry_raw; // 名鑑の出場大会マーカー
    const bio = this.renderOfficialBio(f.official_data, f.summary);
    const chips = [
      r ? `<span class="numbers-stat">通算 ${escapeHtml(this.#recordText(r))}</span>` : "",
      ...achievements.map((a) => `<span class="numbers-stat achievement-marker">${escapeHtml(a)}</span>`),
      entry ? `<span class="numbers-stat">出場 ${escapeHtml(entry)}</span>` : "",
    ].filter(Boolean).join("");
    if (!chips && !bio) return "";
    return `
      <section class="source-block source-profile">
        <span class="source-block-label">戦績・プロフィール</span>
        ${chips ? `<div class="numbers-stats-block">${chips}</div>` : ""}
        ${bio}
      </section>
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
        ${this.renderProfileBlock(f)}
        ${related.renderRelatedBouts(f.fighter_id)}
        ${this.renderFighterSnapshots(f.fighter_id)}
        ${components.primaryArticleRefList(sources.renderArticleRef.bind(sources), f.source_article_ids)}
        ${components.detailDisclosure([
          ["fighter_id", `<code>${escapeHtml(f.fighter_id)}</code>`],
          ["別名", renderTextList(f.aliases)],
          ["主階級", f.main_division],
          ["主団体", repo.promotionName(f.main_promotion_id)],
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
          <section class="source-block source-official">
            <span class="source-block-label">公式データ</span>
            <div class="official-stats-block">
              <span class="official-stat">優勝: ${escapeHtml(od.champion)}</span>
              ${od.runner_up ? `<span class="official-stat">準優勝: ${escapeHtml(od.runner_up)}</span>` : ""}
            </div>
          </section>
        ` : ""}
        ${sources.renderVideoLinks("event", e.event_id, repo.videoIdsLinkedToEventBouts(e.event_id))}
        ${related.renderEventBouts(e.event_id)}
        ${sources.renderSourceReferences(repo.sourceReferencesForEvent(e), "出典候補", { collapsed: true })}
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
        <summary><span class="summary-title">${escapeHtml(page.title)}</span> <span class="meta">${escapeHtml(page.description ?? "")}</span></summary>
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
    // pages と news を 1 リストに混ぜるため _kind で種別を付け、renderItem 側で分岐する。
    const pages = repo.officialPages.map(p => ({ _kind: "page", ...p }));
    const news = [...repo.officialNews]
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .map(n => ({ _kind: "news", ...n }));
    const items = [...pages, ...news];
    return {
      items,
      // 描画元配列の同一性で再描画要否を判定させる (tab-registry の itemsSource 参照)
      itemsSource: [repo.officialPages, repo.officialNews],
      renderItem: (item) =>
        item._kind === "page"
          ? this.renderOfficialPageDocCard(item)
          : this.renderOfficialNewsDocCard(item),
    };
  }

  // note 記事スクレイプから本文だけを抽出する。
  // 日付行の後 ～ フッタ (応援・ハッシュタグ等) の前を本文とし、
  // 見出しと重複する先頭行を落とす。記事本文が無ければ "" を返す。
  #cleanNoteBody(text, title) {
    if (!text) return "";
    const dateRe = /\d{4}年\d{1,2}月\d{1,2}日/;
    const footerMarkers = new Set(["ダウンロード", "copy", "いいなと思ったら応援しよう！", "チップで応援する"]);
    const lines = text.split("\n");
    const dateIdx = lines.findIndex((l) => dateRe.test(l));
    if (dateIdx === -1) return "";

    let body = lines.slice(dateIdx + 1);
    const footerIdx = body.findIndex((l) => footerMarkers.has(l.trim()));
    if (footerIdx !== -1) body = body.slice(0, footerIdx);

    const heading = (title || "").trim();
    while (body.length && (body[0].trim() === "" || body[0].trim() === heading)) {
      body = body.slice(1);
    }
    return body.join("\n").trim();
  }

  renderNoteArticleCard(doc) {
    const { repo, labels } = this.ctx;
    const archive = repo.findNoteArchive(doc.url);
    const article = repo.findArticle(doc.source_ref_id);
    const articleType = article?.article_type;
    const body = this.#cleanNoteBody(doc.content_text, doc.title);
    // 本文があれば本文をそのまま表示。無ければ概要 (og:description) をフォールバック表示。
    const fallback = archive?.description ?? doc.content_preview ?? "";
    return `
      <article class="card record-card note-article-card">
        <h2>${externalLink(doc.url, doc.title)}</h2>
        <p class="meta">
          ${articleType ? `<span class="video-badge">${escapeHtml(labels.articleType(articleType))}</span>` : ""}
          <span class="video-badge">${escapeHtml(labels.sourceType(doc.source_type))}</span>
        </p>
        ${body
          ? `<div class="note-body">${escapeHtml(body)}</div>`
          : (fallback ? `<p>${escapeHtml(fallback)}</p>` : "")}
      </article>
    `;
  }

  // note 記事に絞り込み用フィールド (団体: article から / 階級: article_links→bout から複数) を付与
  #withNoteFilterFields(doc) {
    const { repo } = this.ctx;
    const article = repo.findArticle(doc.source_ref_id);
    const divisions = [...new Set(
      repo.findManyByField("articleLinks", "article_id", doc.source_ref_id)
        .filter((l) => l.entity_type === "bout")
        .map((l) => repo.findBout(l.entity_id)?.division)
        .filter(Boolean)
    )];
    // promotion_id / divisions は TAB_FILTERS.tsushin の field と一致させる合成フィールド。
    // これを付けないと団体・階級フィルタが note 記事に効かない。
    return { ...doc, promotion_id: article?.promotion_id, divisions };
  }

  tsushin() {
    const { state, repo } = this.ctx;
    const items = repo.sourceDocuments
      .filter((d) => d.source_type === "note_article")
      .map((d) => this.#withNoteFilterFields(d))
      .filter((d) => itemPassesFilters(d, TAB_FILTERS.tsushin, state));
    return {
      items,
      renderItem: (d) => this.renderNoteArticleCard(d),
    };
  }

  bouts() {
    const { state, query, repo } = this.ctx;
    return {
      items: repo.richBouts.filter((b) => query.boutMatches(b) && itemPassesFilters(b, TAB_FILTERS.bouts, state)),
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
        (f) => query.fighterMatches(f) && itemPassesFilters(f, TAB_FILTERS.fighters, state)
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
        (e) => query.eventMatches(e) && itemPassesFilters(e, TAB_FILTERS.events, state)
      ),
      renderItem: (e) => this.renderEventCard(e),
    };
  }

  promotions() {
    const { state, query, repo } = this.ctx;
    return {
      items: repo.richPromotions.filter((p) => query.promotionMatches(p) && itemPassesFilters(p, TAB_FILTERS.promotions, state)),
      renderItem: (p) => this.renderPromotionCard(p),
    };
  }

  videos() {
    const { state, query, repo } = this.ctx;
    return {
      items: repo.richVideos.filter((v) => query.videoMatches(v) && itemPassesFilters(v, TAB_FILTERS.videos, state)),
      renderItem: (v) => this.renderVideoCard(v),
    };
  }

  titles() {
    const { state, query, repo } = this.ctx;
    const list = repo.richTitles
      .filter((t) => query.titleMatches(t) && itemPassesFilters(t, TAB_FILTERS.titles, state))
      .sort(
        (a, b) =>
          repo.promotionName(a.promotion_id).localeCompare(repo.promotionName(b.promotion_id), "ja") ||
          String(a.division ?? "").localeCompare(String(b.division ?? ""), "ja")
      );

    // Flatten: interleave group headers as synthetic items
    // 見出しは _header フラグ付きの合成アイテムとして items に混ぜる。renderItem と
    // estimateSize はこのフラグで本物の王座カードと見出しを区別するので両者を同期させること。
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
    const { state, query, repo } = this.ctx;
    return {
      items: repo.sourceDocuments.filter((d) => query.sourceDocumentMatches(d) && itemPassesFilters(d, TAB_FILTERS.sources, state)),
      renderItem: (d) => this.renderSourceCard(d),
    };
  }

  renderNumbersFighterCard(f) {
    const { components } = this.ctx;
    // JSON は stats/achievements/profile を入れ子で持つ (フラットに読まないこと)。照合済みの選手は
    // 公開「選手」カードにも出るが、未照合の名鑑選手はこのカードが唯一の表示先なので全項目を見せる。
    const record = this.#recordText({
      fight_count: f.stats?.fight_count ?? null,
      wins: f.stats?.wins ?? null,
      losses: f.stats?.losses ?? null,
      draws: null,
      win_rate: f.stats?.win_rate ?? null,
    });
    const achievements = numbersAchievementLabels(f.achievements);
    const entry = f.achievements?.tournament_entry_raw;
    const markers = [...achievements, entry ? `出場 ${entry}` : ""].filter(Boolean);
    return `
      <article class="card record-card numbers-fighter-card">
        <h2>${escapeHtml(f.display_name)}</h2>
        <p class="meta">
          ${escapeHtml(joinPresent([f.main_division, f.main_promotion_id]))}
          <span class="video-badge">${f.source_confidence === "numbers" ? "名鑑" : escapeHtml(f.source_confidence ?? "")}</span>
        </p>
        ${record ? `<p class="meta">通算 ${escapeHtml(record)}</p>` : ""}
        ${markers.length ? `<p class="meta">${markers.map((a) => escapeHtml(a)).join(" ／ ")}</p>` : ""}
        ${f.catchphrase ? `<p class="fighter-summary">${escapeHtml(f.catchphrase)}</p>` : ""}
        ${components.definitionList([
          ["所属", renderValue(f.profile?.gym)],
          ["身長・年齢", renderValue(joinPresent([f.profile?.height, f.profile?.age]))],
        ])}
        ${components.detailDisclosure([
          ["numbers_fighter_id", `<code>${escapeHtml(f.numbers_fighter_id)}</code>`],
          ["団体(原文)", f.main_promotion_raw],
          ["メモ", f.notes],
          ["出典", joinPresent([f.source_sheet, f.source_row ? `行${f.source_row}` : ""], " / ")],
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
        <p class="meta">${escapeHtml(joinPresent([eventMeta, r.bout_format]))}</p>
        ${r.result ? `<p class="result">${escapeHtml(r.result_mark || "")} ${escapeHtml(r.result)}</p>` : ""}
        ${r.detail_raw ? `<p class="record-detail">${escapeHtml(r.detail_raw)}</p>` : ""}
        ${components.detailDisclosure([
          ["record_id", `<code>${escapeHtml(r.record_id)}</code>`],
          ["numbers_fighter_id", `<code>${escapeHtml(r.numbers_fighter_id)}</code>`],
          ["matched_fighter_id", r.matched_fighter_id ? `<code>${escapeHtml(r.matched_fighter_id)}</code>` : "未対応"],
          ["candidate_fighter_id", r.candidate_fighter_id ? `<code>${escapeHtml(r.candidate_fighter_id)}</code>` : ""],
          ["相手 matched_fighter_id", r.opponent_matched_fighter_id ? `<code>${escapeHtml(r.opponent_matched_fighter_id)}</code>` : ""],
          ["相手 candidate_fighter_id", r.opponent_candidate_fighter_id ? `<code>${escapeHtml(r.opponent_candidate_fighter_id)}</code>` : ""],
          ["相手 numbers_fighter_id", r.opponent_numbers_fighter_id ? `<code>${escapeHtml(r.opponent_numbers_fighter_id)}</code>` : ""],
          ["団体(原文)", r.promotion_raw],
          ["大会番号(原文)", r.event_number_raw],
          ["出典", joinPresent([r.source_sheet, r.source_row ? `行${r.source_row}` : ""], " / ")],
        ])}
      </article>
    `;
  }

  renderOfficialPlayerCard(p) {
    const { components } = this.ctx;
    const record = this.#recordText({
      fight_count: null, wins: p.wins ?? null, losses: p.losses ?? null, draws: p.draws ?? null, win_rate: null,
    });
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
    const { state, repo } = this.ctx;
    return {
      items: repo.numbersFighters.filter((f) => itemPassesFilters(f, TAB_FILTERS.numbersFighters, state)),
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
    const { state, repo } = this.ctx;
    return {
      items: repo.numbersFightRecords.filter((r) => itemPassesFilters(r, TAB_FILTERS.numbersFightRecords, state)),
      renderItem: (r) => this.renderNumbersFightRecordCard(r),
    };
  }

  officialPlayers() {
    const { state, repo } = this.ctx;
    const items = repo.officialPlayers
      // organization (団体名) を promotion_id に解決して合成。TAB_FILTERS.officialPlayers の
      // 団体フィルタが ID で照合するため、フィルタ前に付与しておく必要がある。
      .map((p) => ({ ...p, promotion_id: repo.promotionIdByName(p.organization) }))
      .filter((p) => itemPassesFilters(p, TAB_FILTERS.officialPlayers, state));
    return {
      items,
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
