import { escapeHtml, externalLink } from "../ui/html-utils.js";

// 役割: 出典系 (記事/動画/note 本文/source_documents) と review 候補 (source_*_reference /
//   source_mentions) を HTML 化する描画サービス。データ取得は一切せず ctx.repo に委譲し、
//   整形と並び替え・上限件数の方針のみを持つ。
// アーキ上の位置: main.js で new され ctx.sources として tab-renderers / related-renderers から呼ばれる。
//   依存: ctx.repo (DataRepository=本文・rich 情報・参照の解決)、ctx.labels (種別の日本語ラベル)、
//   ctx.components (section/grid/card)、ctx.state (遅延ロード済みキーの判定)。出力は VirtualList が描画。
// 不変条件: 外部由来文字列は escapeHtml / externalLink を通す。source_mentions は管理タブ用に遅延ロード
//   されるため、未ロード時 (state.loadedDataKeys 未登録) は件数バッジを出さない — 件数 0 の誤表示を避ける契約。
//   referenceSortValue/mentionSortValue は表示順を決定的にするための client 側ソートキー。
// 関連スキル: .agents/skills/arakaku-viewer-ui, .agents/skills/arakaku-source-pipeline
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
    return `<div class="video-embed"><lite-youtube videoid="${escapeHtml(v.platform_video_id)}"></lite-youtube></div>`;
  }

  renderVideoSourceBlock(v, label = null) {
    // 既に archive_metadata を持つ動画は enrich 済みとみなし再 enrich を避ける。未 enrich なら
    // repo.getRichVideoInfo で archive/source 情報を補完してから描画する。
    const video = v ? (v.archive_metadata ? v : this.ctx.repo.getRichVideoInfo(v)) : v;
    const displayLabel = label || video?.title || video?.video_id || "動画";
    if (!video?.url) return `<code>${escapeHtml(video?.video_id || displayLabel)}</code>`;
    const d = this.ctx.repo.sourceDocumentForVideo(video);
    const detail = d?.content_text ? this.renderArticleSourceDetail(`<pre>${escapeHtml(d.content_text)}</pre>`) : "";
    const embed = this.renderVideoEmbed(video);
    return `<div class="video-source-block"><p class="video-source-title">${externalLink(video.url, displayLabel)}</p>${detail}${embed ? `<div class="video-source-embed">${embed}</div>` : ""}</div>`;
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

  // confidence (high→medium→low→不明) を先頭キーにした文字列ソートキー。localeCompare 比較で
  // 確度の高い候補を上に出す。renderSourceReferences でこの順に並べ slice(0,5) する。
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

  // options.collapsed=true で公式タブと同じ折りたたみ UI (既定は閉) にする。試合タブが使用。
  // 表示は確度上位 5 件まで。5 件で切り詰めたときは summary に「上位N件」と明示する。
  renderSourceReferences(refs, title = "出典候補", options = {}) {
    const { components } = this.ctx;
    const unique = this.uniqueSourceReferences(refs)
      .sort((a, b) => this.referenceSortValue(a).localeCompare(this.referenceSortValue(b), "ja"));
    const list = unique.slice(0, 5);
    if (list.length === 0) return "";
    const grid = components.relatedGrid(list.map(r => this.sourceReferenceSummary(r)).join(""));
    if (options.collapsed) {
      const count = unique.length > list.length ? `上位${list.length}件` : `${list.length}件`;
      return `<details class="related-source-mentions source-references-toggle"><summary>${escapeHtml(title)} <span class="meta">${escapeHtml(count)}</span></summary>${grid}</details>`;
    }
    return components.section(title, grid, "related-source-mentions");
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
    const richArticle = this.ctx.repo.findRichArticle(id);
    const document = this.ctx.repo.sourceDocumentForArticle(id);
    const detail = document?.content_text ? this.renderArticleSourceDetail(`<pre>${escapeHtml(document.content_text)}</pre>`) : "";
    const link = richArticle?.url ? externalLink(richArticle.url, richArticle.title || id) : `<code>${escapeHtml(id)}</code>`;
    return `<span class="article-source-ref">${link}${detail}</span>`;
  }

  renderVideoRefs(vids, opts = {}) {
    const ids = (vids ?? []).filter(Boolean);
    if (ids.length === 0) return "未入力";
    return ids.map(id => {
      const richVideo = this.ctx.repo.richVideoById(id);
      if (opts.inline) return richVideo?.url ? externalLink(richVideo.url, richVideo.title || id) : `<code>${escapeHtml(id)}</code>`;
      return richVideo ? this.renderVideoSourceBlock(richVideo, richVideo.title || id) : `<code>${escapeHtml(id)}</code>`;
    }).join(opts.inline ? ", " : "");
  }

  renderVideoDescriptionPreview(v) {
    const { components, repo, state } = this.ctx;
    const { reference: r, document: d } = repo.sourceContextForVideo(v);
    if (!r && !d) return "";
    const preview = r?.content_preview || d?.content_preview || "プレビュー未入力";
    // 言及件数バッジは source_mentions に依存する。出典参照(r)があればそれを優先。
    // source_mentions は管理タブ用に遅延ロードするため、未ロード時は件数バッジを出さない
    // (件数 0 の誤表示を避ける。管理タブを開いて読み込めば次回描画から表示される)。
    let badges = "";
    if (r) {
      badges = this.referenceMentionBadges(r);
    } else if (d && state.loadedDataKeys?.has("sourceMentions")) {
      badges = this.sourceMentionCountBadges(repo.countSourceMentions(d.source_id, ["note_url", "matchup", "result"]));
    }
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
