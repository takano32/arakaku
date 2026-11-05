import * as basic from "./parts/basic.js";
import * as bouts from "./parts/bouts.js";
import * as fighters from "./parts/fighters.js";
import * as links from "./parts/links.js";
import * as sources from "./parts/sources.js";
import * as videos from "./parts/videos.js";

/**
 * Parts — ui/parts/*.js の純関数に repo / state を渡すだけのファサード。各セクションが
 * `parts.x(...)` で呼ぶ既存の呼び口を保つ。HTML の規則は各モジュールにある。
 */
export class Parts {
  /** @param {{ repo: import("../data/repository.js").DataRepository, state: object }} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }

  get repo() { return this.ctx.repo; }
  get state() { return this.ctx.state; }

  // ── 基本部品 ──────────────────────────────────────────────────────
  badge(label, kind = "") { return basic.badge(label, kind); }
  badges(items) { return basic.badges(items); }
  dl(rows, className = "") { return basic.dl(rows, className); }
  details(rows, label = "詳細", options = {}) { return basic.details(rows, label, options); }
  fold(label, innerHtml, options = {}) { return basic.fold(label, innerHtml, options); }
  section(title, innerHtml, className = "") { return basic.section(title, innerHtml, className); }
  grid(itemsHtml) { return basic.grid(itemsHtml); }
  item(innerHtml, className = "") { return basic.item(innerHtml, className); }
  textFold(label, text, options = {}) { return basic.textFold(label, text, options); }

  // ── リンク (画面内遷移) ────────────────────────────────────────────
  fighterLink(fighterId, fallbackName) { return links.fighterLink(this.repo, fighterId, fallbackName); }
  eventLink(eventId, fallbackName) { return links.eventLink(this.repo, eventId, fallbackName); }
  boutLink(boutId, labelHtml) { return links.boutLink(boutId, labelHtml); }

  // ── 試合の表記 ─────────────────────────────────────────────────────
  boutMatchup(bout) { return bouts.boutMatchup(this.repo, bout); }
  boutResultSummary(bout) { return bouts.boutResultSummary(this.repo, bout); }
  boutResultLine(bout) { return bouts.boutResultLine(bout); }
  boutDecisionLine(bout) { return bouts.boutDecisionLine(bout); }
  fighterRows(bout) { return bouts.fighterRows(this.repo, bout); }
  relatedBout(bout, options = {}) { return bouts.relatedBout(this.repo, bout, options); }
  relatedBouts(fighterId) { return bouts.relatedBouts(this.repo, fighterId); }
  eventBouts(eventId) { return bouts.eventBouts(this.repo, eventId); }

  // ── 動画 ───────────────────────────────────────────────────────────
  videoFacade(v) { return videos.videoFacade(v); }
  videoBlock(v, label = null) { return videos.videoBlock(this.repo, v, label); }
  videoLinks(type, id, excludeVideoIds = new Set(), title = "動画") { return videos.videoLinks(this.repo, type, id, excludeVideoIds, title); }
  videoRefs(vids, options = {}) { return videos.videoRefs(this.repo, vids, options); }
  videoDescriptionPreview(v) {
    return videos.videoDescriptionPreview(this.repo, v, { mentionsLoaded: Boolean(this.state.loadedDataKeys?.has("sourceMentions")) });
  }
  mentionCountBadges(counts) { return videos.mentionCountBadges(counts); }

  // ── 出典記事・出典本文・出典候補 ───────────────────────────────────
  articleRef(id) { return sources.articleRef(this.repo, id); }
  articleRefs(aids) { return sources.articleRefs(this.repo, aids); }
  articleRefList(articleIds, title = "出典記事") { return sources.articleRefList(this.repo, articleIds, title); }
  sourceDocumentDetail(d) { return sources.sourceDocumentDetail(d); }
  sourceDocumentLink(d, title, url) { return sources.sourceDocumentLink(d, title, url); }
  sourceBody(d) { return sources.sourceBody(d); }
  sourceReferenceCounts(sid) { return sources.sourceReferenceCounts(this.repo, sid); }
  sourceMentionLink(m) { return sources.sourceMentionLink(this.repo, m); }
  splitTokens(v) { return sources.splitTokens(v); }
  referenceMentionBadges(r) { return sources.referenceMentionBadges(r); }
  referenceSortValue(r) { return sources.referenceSortValue(r); }
  uniqueSourceReferences(refs) { return sources.uniqueSourceReferences(refs); }
  sourceReferenceSummary(r) { return sources.sourceReferenceSummary(this.repo, r); }
  sourceReferences(refs, title = "出典候補") { return sources.sourceReferences(this.repo, refs, title); }

  // ── 選手プロフィール ───────────────────────────────────────────────
  officialBio(od, summary) { return fighters.officialBio(od, summary); }
  profileBlock(f) { return fighters.profileBlock(f); }
  snapshotSource(snapshot) { return fighters.snapshotSource(this.repo, snapshot); }
  fighterSnapshots(fighterId) { return fighters.fighterSnapshots(this.repo, fighterId); }
}
