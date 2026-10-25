import { labels } from "../data/labels.js";
import {
  boutResultText,
  escapeHtml,
  externalLink,
  formatDate,
  joinPresent,
  recordText,
} from "./html.js";

/**
 * Parts — 各セクションが共有する HTML 部品 (バッジ・リンクボタン・定義リスト・折りたたみ・
 * 動画ファサード・出典参照・関連試合・選手プロフィール)。状態も DOM も持たず文字列だけを返す。
 *
 * - 外部由来の文字列は必ず escapeHtml を通す。「組み立て済み HTML」を受け取る引数 (innerHtml 等) は
 *   二重エスケープを避けるため通さない (呼び出し側が安全な HTML を渡す契約)。
 * - 選手/大会/試合リンクは <button data-fighter-id|data-event-id|data-bout-id> で、クリックは
 *   shell.js の委譲ハンドラが拾う。属性名を変えるときは shell.js と同期する。
 * - 出典候補 (source_*_references) と出典言及は「候補」であり確定事実ではない。ラベルにその旨を残す。
 */
export class Parts {
  /** @param {{ repo: import("../data/repository.js").DataRepository, state: object }} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }

  get repo() { return this.ctx.repo; }
  get state() { return this.ctx.state; }

  // ── 基本部品 ──────────────────────────────────────────────────────

  badge(label, kind = "") {
    if (label === null || label === undefined || label === "") return "";
    return `<span class="badge${kind ? ` badge-${escapeHtml(kind)}` : ""}">${escapeHtml(label)}</span>`;
  }

  badges(items) {
    const html = items.filter(Boolean).join("");
    return html ? `<div class="badges">${html}</div>` : "";
  }

  /** 定義リスト。値が空の行は省く。value は組み立て済み HTML。 */
  dl(rows, className = "") {
    const present = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (present.length === 0) return "";
    const cls = className ? ` ${escapeHtml(className)}` : "";
    return `<dl class="dl${cls}">${present.map(([l, v]) => `<div class="dl-row"><dt>${escapeHtml(l)}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
  }

  /** 「詳細」折りたたみ (定義リスト入り)。内容が無ければ出さない。 */
  details(rows, label = "詳細", { open = false } = {}) {
    const content = this.dl(rows);
    if (!content) return "";
    return `<details class="fold fold-details"${open ? " open" : ""}><summary>${escapeHtml(label)}</summary>${content}</details>`;
  }

  /** 任意 HTML の折りたたみ */
  fold(label, innerHtml, { open = false, className = "", count = "" } = {}) {
    if (!innerHtml) return "";
    const cls = className ? ` ${escapeHtml(className)}` : "";
    const meta = count ? ` <span class="fold-count">${escapeHtml(count)}</span>` : "";
    return `<details class="fold${cls}"${open ? " open" : ""}><summary>${escapeHtml(label)}${meta}</summary><div class="fold-body">${innerHtml}</div></details>`;
  }

  /** 見出し付きセクション。内容が無ければ出さない。 */
  section(title, innerHtml, className = "") {
    if (!innerHtml) return "";
    const cls = className ? ` ${escapeHtml(className)}` : "";
    return `<section class="sec${cls}"><h3 class="sec-title">${escapeHtml(title)}</h3>${innerHtml}</section>`;
  }

  /** 入れ子アイテムのグリッド */
  grid(itemsHtml) {
    return itemsHtml ? `<div class="grid">${itemsHtml}</div>` : "";
  }

  item(innerHtml, className = "") {
    return `<div class="item${className ? ` ${escapeHtml(className)}` : ""}">${innerHtml}</div>`;
  }

  /** 本文テキストの折りたたみ (改行保持) */
  textFold(label, text, options = {}) {
    if (!text) return "";
    return this.fold(label, `<pre class="pre">${escapeHtml(text)}</pre>`, options);
  }

  // ── リンク (画面内遷移) ────────────────────────────────────────────

  fighterLink(fighterId, fallbackName) {
    const name = this.repo.fighterName(fighterId) || fallbackName || fighterId;
    if (!fighterId) return `<span class="name">${escapeHtml(name)}</span>`;
    return `<button type="button" class="link link-fighter" data-fighter-id="${escapeHtml(fighterId)}" data-fighter-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`;
  }

  eventLink(eventId, fallbackName) {
    const name = this.repo.eventName(eventId) || fallbackName || eventId;
    if (!eventId) return `<span class="name">${escapeHtml(name)}</span>`;
    return `<button type="button" class="link link-event" data-event-id="${escapeHtml(eventId)}" data-event-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`;
  }

  boutLink(boutId, labelHtml) {
    return `<button type="button" class="link link-bout" data-bout-id="${escapeHtml(boutId)}">${labelHtml}</button>`;
  }

  // ── 試合の表記 ─────────────────────────────────────────────────────

  // 対戦カード表記。enrich 済み bout.fighters[] を最優先し、無ければ fighter_a/b、勝者敗者ペア、
  // 生 matchup 文字列、最後に bout_id とフォールバックする。
  boutMatchup(bout) {
    const fighterA = bout.fighters?.[0];
    const fighterB = bout.fighters?.[1];
    const aName = fighterA?.name ?? bout.fighter_a ?? "";
    const bName = fighterB?.name ?? bout.fighter_b ?? "";
    const aId = fighterA?.fighter_id ?? bout.fighter_a_id ?? "";
    const bId = fighterB?.fighter_id ?? bout.fighter_b_id ?? "";
    if (aName && bName) {
      return `${this.#matchupSide(aId, aName, bout)} <span class="vs">vs</span> ${this.#matchupSide(bId, bName, bout)}`;
    }
    if (bout.winner && bout.loser) {
      return `${this.#matchupSide(bout.winner_id, bout.winner, bout)} <span class="vs">vs</span> ${this.#matchupSide(bout.loser_id, bout.loser, bout)}`;
    }
    if (bout.matchup) return escapeHtml(bout.matchup);
    return escapeHtml(bout.bout_id);
  }

  // 勝者は太字 (result_status が unknown のときは勝敗を示さない)
  #matchupSide(id, name, bout) {
    const link = this.fighterLink(id, name);
    const status = bout.result_status ?? "known";
    const isWinner = status !== "unknown" && bout.winner && bout.loser && (id ? bout.winner_id === id : bout.winner === name);
    return isWinner ? `<span class="winner">${link}</span>` : link;
  }

  /** 「A def. B」 (勝敗不明なら空) */
  boutResultSummary(bout) {
    const status = bout.result_status ?? "known";
    if (status === "unknown") return "";
    if (bout.winner && bout.loser) {
      return `${this.fighterLink(bout.winner_id, bout.winner)} <span class="def">def.</span> ${this.fighterLink(bout.loser_id, bout.loser)}`;
    }
    return "";
  }

  /** 決着の 1 行 (「3R 4:21 KO」等)。無ければ "" */
  boutResultLine(bout) {
    return boutResultText(bout);
  }

  boutDecisionLine(bout) {
    const res = [bout.result?.method_normalized, bout.result?.technique, bout.result?.decision_score].filter(Boolean);
    return res.length > 0 ? res.join(" ") : "";
  }

  fighterRows(bout) {
    return (bout.fighters ?? []).map((f) => `
      <li>${this.fighterLink(f.fighter_id, f.name)} <span class="muted">${escapeHtml(joinPresent([f.corner, f.result || "unknown"]))}</span></li>
    `).join("");
  }

  // ── 動画 ───────────────────────────────────────────────────────────

  /**
   * YouTube の埋め込みファサード。クリックするまで iframe を作らず、サムネイル画像だけを置く。
   * サムネイルは archives の thumbnail_sizes から確実に存在するサイズを選ぶ
   * (maxres → sddefault → hqdefault。hqdefault は全動画にある) ので 404 を出さない。
   */
  videoFacade(v) {
    if (v.platform !== "youtube" || !v.platform_video_id) return "";
    const id = escapeHtml(v.platform_video_id);
    const sizes = (v.thumbnail_sizes || "").split(" ").filter(Boolean);
    const file = sizes.includes("maxres") ? "maxresdefault.jpg" : sizes.includes("standard") ? "sddefault.jpg" : "hqdefault.jpg";
    const title = escapeHtml(v.title || v.video_id || "動画");
    return `<div class="yt" data-yt-id="${id}">
      <img class="yt-thumb" src="https://i.ytimg.com/vi/${id}/${file}" alt="" loading="lazy" decoding="async">
      <button type="button" class="yt-play" aria-label="再生: ${title}"><span class="yt-play-icon" aria-hidden="true"></span></button>
    </div>`;
  }

  /** 動画ブロック: タイトルリンク + 概要欄の折りたたみ + ファサード */
  videoBlock(v, label = null) {
    const video = v ? (v.archive_metadata ? v : this.repo.getRichVideoInfo(v)) : v;
    const displayLabel = label || video?.title || video?.video_id || "動画";
    if (!video?.url) return `<code>${escapeHtml(video?.video_id || displayLabel)}</code>`;
    const d = this.repo.sourceDocumentForVideo(video);
    const meta = joinPresent([video.channel_name, formatDate(video.published_at)]);
    return `<div class="vblock">
      <p class="vblock-title">${externalLink(video.url, displayLabel)}</p>
      ${meta ? `<p class="muted small">${escapeHtml(meta)}</p>` : ""}
      ${this.videoFacade(video)}
      ${this.textFold("概要欄を表示", d?.content_text, { className: "fold-inline" })}
    </div>`;
  }

  /** エンティティ (bout/event/promotion/fighter) に紐づく動画のセクション */
  videoLinks(type, id, excludeVideoIds = new Set(), title = "動画") {
    const excluded = excludeVideoIds instanceof Set ? excludeVideoIds : new Set(excludeVideoIds);
    const items = this.repo.videosForEntity(type, id).filter(({ video }) => !excluded.has(video.video_id));
    if (items.length === 0) return "";
    const cards = items.map(({ link, video }) => this.item(`
      ${this.videoBlock(video)}
      ${this.badges([this.badge(labels.relationType(link.relation_type || video.video_type))])}
      ${link.notes ? `<p class="muted small">${escapeHtml(link.notes)}</p>` : ""}
    `, "item-video")).join("");
    return this.section(title, this.grid(cards), "sec-videos");
  }

  /** 動画 ID の参照 (インラインリンク、または動画ブロック) */
  videoRefs(vids, { inline = false } = {}) {
    const ids = (vids ?? []).filter(Boolean);
    if (ids.length === 0) return "未入力";
    return ids.map((id) => {
      const rv = this.repo.richVideoById(id);
      if (inline) return rv?.url ? externalLink(rv.url, rv.title || id) : `<code>${escapeHtml(id)}</code>`;
      return rv ? this.videoBlock(rv, rv.title || id) : `<code>${escapeHtml(id)}</code>`;
    }).join(inline ? ", " : "");
  }

  /** 動画の YouTube 概要欄プレビュー (出典参照 → 本文の順。言及バッジ付き) */
  videoDescriptionPreview(v) {
    const { reference: r, document: d } = this.repo.sourceContextForVideo(v);
    if (!r && !d) return "";
    const preview = r?.content_preview || d?.content_preview || "プレビュー未入力";
    // 言及件数バッジは source_mentions に依存する。出典参照 (r) があればそれを優先し、
    // 無い場合は source_mentions がロード済みのときだけ件数を出す (0 件の誤表示を避ける)。
    let badges = "";
    if (r) {
      badges = this.referenceMentionBadges(r);
    } else if (d && this.state.loadedDataKeys?.has("sourceMentions")) {
      badges = this.mentionCountBadges(this.repo.countSourceMentions(d.source_id, ["note_url", "matchup", "result"]));
    }
    return this.section("YouTube概要欄", `<p class="pre-line">${escapeHtml(preview)}</p>${this.badges([badges])}`, "sec-description");
  }

  mentionCountBadges(counts) {
    return [
      `note URL ${counts.note_url ?? 0}`,
      `対戦カード ${counts.matchup ?? 0}`,
      `結果 ${counts.result ?? 0}`,
    ].map((label) => this.badge(label)).join("");
  }

  // ── 出典記事・出典本文 ─────────────────────────────────────────────

  /** note 記事の参照 (アーカイブ題のリンク + 本文の折りたたみ) */
  articleRef(id) {
    const article = this.repo.findRichArticle(id);
    const doc = this.repo.sourceDocumentForArticle(id);
    const link = article?.url ? externalLink(article.url, article.title || id) : `<code>${escapeHtml(id)}</code>`;
    return `<span class="ref">${link}${this.textFold("本文を表示", doc?.content_text, { className: "fold-inline" })}</span>`;
  }

  articleRefs(aids) {
    const ids = (Array.isArray(aids) ? aids : [aids]).filter(Boolean);
    if (ids.length === 0) return "未入力";
    return ids.map((id) => this.articleRef(id)).join(", ");
  }

  /** 出典記事セクション (リスト) */
  articleRefList(articleIds, title = "出典記事") {
    const ids = (Array.isArray(articleIds) ? articleIds : [articleIds]).filter(Boolean);
    if (ids.length === 0) return "";
    return this.section(title, `<ul class="ref-list">${ids.map((id) => `<li>${this.articleRef(id)}</li>`).join("")}</ul>`, "sec-articles");
  }

  sourceDocumentDetail(d) {
    return (d?.source_type === "note_article" && d.content_text)
      ? this.textFold("本文を表示", d.content_text, { className: "fold-inline" })
      : "";
  }

  sourceDocumentLink(d, title, url) {
    const label = title || d?.title || d?.source_ref_id || d?.source_id || "出典";
    return `<span class="ref">${externalLink(url || d?.url, label)}${this.sourceDocumentDetail(d)}</span>`;
  }

  sourceBody(d) {
    return d.content_text ? this.textFold("本文を表示", d.content_text) : `<p class="muted">本文は空です。</p>`;
  }

  sourceReferenceCounts(sid) {
    const c = this.repo.countSourceReferences(sid);
    if (c.events + c.bouts + c.videos === 0) return "";
    return this.badges([this.badge(`大会候補 ${c.events}`), this.badge(`試合候補 ${c.bouts}`), this.badge(`動画候補 ${c.videos}`)]);
  }

  sourceMentionLink(m) {
    const d = this.repo.sourceDocumentById(m.source_id);
    if (!d) return `<span class="muted">${escapeHtml(m.source_id)}</span>`;
    return `<span class="muted">${escapeHtml(labels.sourceType(d.source_type))} / ${externalLink(d.url, d.title || d.source_ref_id || m.source_id)} / line ${escapeHtml(m.line_number)}</span>`;
  }

  // ── 出典候補 (review 候補。確定情報ではない) ───────────────────────

  splitTokens(v) { return String(v ?? "").split("|").map((t) => t.trim()).filter(Boolean); }

  referenceMentionBadges(r) {
    return this.splitTokens(r.mention_types).map((t) => {
      const [type, count] = t.split(":").map((x) => x.trim());
      const label = labels.mentionType(type);
      return this.badge(count ? `${label} ${count}` : label);
    }).join("");
  }

  // confidence (high→medium→low→不明) を先頭キーにした文字列ソートキー。
  referenceSortValue(r) {
    const order = { high: "0", medium: "1", low: "2" };
    return `${order[r.confidence] ?? "3"}:${r.source_title ?? ""}:${r.candidate_id ?? ""}`;
  }

  uniqueSourceReferences(refs) {
    return [...new Map(refs.map((reference) => [reference.candidate_id, reference])).values()];
  }

  sourceReferenceSummary(r) {
    const d = this.repo.sourceDocumentById(r.source_id);
    const matched = this.splitTokens(r.matched_texts).slice(0, 3).join(" / ");
    return this.item(`
      <p class="muted small">${escapeHtml(labels.sourceType(r.source_type))} / ${this.sourceDocumentLink(d, r.source_title, r.source_url)}</p>
      ${this.badges([this.badge(`候補 ${r.confidence || "unknown"}`, "soft"), this.referenceMentionBadges(r)])}
      ${matched ? `<p class="small">${escapeHtml(matched)}</p>` : ""}
      ${r.line_numbers ? `<p class="muted small">line ${escapeHtml(r.line_numbers)}</p>` : ""}
    `, "item-reference");
  }

  /** 出典候補 (確度順上位 5 件) の折りたたみセクション */
  sourceReferences(refs, title = "出典候補") {
    const unique = this.uniqueSourceReferences(refs)
      .sort((a, b) => this.referenceSortValue(a).localeCompare(this.referenceSortValue(b), "ja"));
    const list = unique.slice(0, 5);
    if (list.length === 0) return "";
    const count = unique.length > list.length ? `上位${list.length}件` : `${list.length}件`;
    return this.fold(title, this.grid(list.map((r) => this.sourceReferenceSummary(r)).join("")), { className: "fold-references", count });
  }

  // ── 関連試合 ───────────────────────────────────────────────────────

  /** 関連試合 1 件 (選手ページでは大会名を、大会ページでは試合順を見出しにする) */
  relatedBout(bout, { showEvent = false, showOrder = false } = {}) {
    const result = this.boutResultSummary(bout);
    const line = this.boutResultLine(bout);
    const head = [
      showOrder && bout.bout_order ? `<span class="muted small">第${escapeHtml(bout.bout_order)}試合</span>` : "",
      showEvent ? `<span class="small">${this.eventLink(bout.event_id, this.repo.eventName(bout.event_id))}</span>` : "",
    ].filter(Boolean).join(" ");
    return this.item(`
      ${head ? `<p class="item-head">${head}</p>` : ""}
      <p class="item-title">${this.boutMatchup(bout)} ${bout.numbers_records?.length ? this.badge("名鑑", "numbers") : ""} ${bout.numbers_only ? this.badge("名鑑のみ", "numbers") : ""}</p>
      ${result ? `<p class="result">${result}</p>` : ""}
      ${line ? `<p class="small">${escapeHtml(line)}</p>` : ""}
      <p class="small">${this.boutLink(bout.bout_id, "試合の詳細へ")}</p>
      ${this.videoLinks("bout", bout.bout_id)}
    `, "item-bout");
  }

  relatedBouts(fighterId) {
    const bouts = this.repo.relatedBoutsForFighter(fighterId);
    if (bouts.length === 0) return `<p class="muted">関連試合はまだ登録されていません。</p>`;
    return this.section(`関連試合（${bouts.length}）`, this.grid(bouts.map((b) => this.relatedBout(b, { showEvent: true })).join("")), "sec-bouts");
  }

  eventBouts(eventId) {
    const bouts = this.repo.boutsForEvent(eventId);
    if (bouts.length === 0) return `<p class="muted">関連試合はまだ登録されていません。</p>`;
    return this.section(`試合（${bouts.length}）`, this.grid(bouts.map((b) => this.relatedBout(b, { showOrder: true })).join("")), "sec-bouts");
  }

  // ── 選手プロフィール ───────────────────────────────────────────────

  /**
   * 公式 bio (王座履歴・トーナメント成績など) を「／」区切りで分解してリスト表示する。
   * summary (名鑑/通信由来) に既出のセグメントは重複を避けて除外する。
   */
  officialBio(od, summary) {
    const bio = od?.bio;
    if (!bio) return "";
    const ref = (summary ?? "").replace(/[\s／/、,]/g, "");
    const items = bio
      .split(/[／/]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((item) => !ref.includes(item.replace(/[\s／/、,]/g, "")));
    if (items.length === 0) return "";
    return `<ul class="bio">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  /** 公式 + 名鑑を統合した「戦績・プロフィール」ブロック (戦績は一度だけ表示) */
  profileBlock(f) {
    const r = f.profile?.record;
    const achievements = f.profile?.achievements ?? [];
    const entry = f.numbers_data?.achievements?.tournament_entry_raw;
    const bio = this.officialBio(f.official_data, f.summary);
    const chips = [
      r ? `<span class="stat">通算 ${escapeHtml(recordText(r))}</span>` : "",
      ...achievements.map((a) => `<span class="stat stat-gold">${escapeHtml(a)}</span>`),
      entry ? `<span class="stat">出場 ${escapeHtml(entry)}</span>` : "",
    ].filter(Boolean).join("");
    if (!chips && !bio) return "";
    return this.section("戦績・プロフィール", `${chips ? `<div class="stats">${chips}</div>` : ""}${bio}`, "sec-profile");
  }

  // source_id は note:<article_id> または official_news:<slug>
  snapshotSource(snapshot) {
    const [type, ref] = (snapshot.source_id ?? "").split(/:(.*)/s);
    if (type === "official_news") {
      const news = this.repo.officialNews.find((n) => n.slug === ref);
      return `公式ニュース「${escapeHtml(news?.title ?? ref)}」${news?.date ? `（${escapeHtml(news.date)}）` : ""}`;
    }
    return this.articleRefs(snapshot.source_article_id);
  }

  /** 出典別プロフィール (fighter_snapshots) */
  fighterSnapshots(fighterId) {
    const s = this.repo.fighterSnapshotsForFighter(fighterId);
    if (s.length === 0) return "";
    return this.section("出典別プロフィール", this.grid(s.map((x) => this.item(`
      <p class="item-head small">${x.event_id ? this.eventLink(x.event_id, this.repo.eventName(x.event_id)) : "大会未設定"} / ${this.snapshotSource(x)}</p>
      ${this.dl([
        ["所属", escapeHtml(x.gym ?? "")],
        ["身長・年齢", escapeHtml(joinPresent([x.height, x.age]))],
        ["戦績", escapeHtml(x.record_text ?? "")],
        ["主団体", escapeHtml(this.repo.promotionName(x.main_promotion_id) ?? "")],
        ["肩書き", escapeHtml(x.titles_text ?? "")],
        ["キャッチコピー", escapeHtml(x.catchphrase ?? "")],
        ["snapshot_id", `<code>${escapeHtml(x.snapshot_id)}</code>`],
      ])}
    `, "item-snapshot")).join("")), "sec-snapshots");
  }
}
