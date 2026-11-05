import { labels } from "../../data/labels.js";
import { escapeHtml, externalLink } from "../html.js";
import { badge, badges, fold, grid, item, section, textFold } from "./basic.js";

/**
 * 出典記事・出典本文・出典候補の HTML 部品。文字列だけを返し、必要なものは repo を受け取る。
 * 出典候補 (source_*_references) と出典言及は「候補」であり確定事実ではない。ラベルにその旨を残す。
 */

// ── 出典記事・出典本文 ─────────────────────────────────────────────

/** note 記事の参照 (アーカイブ題のリンク + 本文の折りたたみ) */
export function articleRef(repo, id) {
  const article = repo.findRichArticle(id);
  const doc = repo.sourceDocumentForArticle(id);
  const link = article?.url ? externalLink(article.url, article.title || id) : `<code>${escapeHtml(id)}</code>`;
  return `<span class="ref">${link}${textFold("本文を表示", doc?.content_text, { className: "fold-inline" })}</span>`;
}

export function articleRefs(repo, aids) {
  const ids = (Array.isArray(aids) ? aids : [aids]).filter(Boolean);
  if (ids.length === 0) return "未入力";
  return ids.map((id) => articleRef(repo, id)).join(", ");
}

/** 出典記事セクション (リスト) */
export function articleRefList(repo, articleIds, title = "出典記事") {
  const ids = (Array.isArray(articleIds) ? articleIds : [articleIds]).filter(Boolean);
  if (ids.length === 0) return "";
  return section(title, `<ul class="ref-list">${ids.map((id) => `<li>${articleRef(repo, id)}</li>`).join("")}</ul>`, "sec-articles");
}

export function sourceDocumentDetail(d) {
  return (d?.source_type === "note_article" && d.content_text)
    ? textFold("本文を表示", d.content_text, { className: "fold-inline" })
    : "";
}

export function sourceDocumentLink(d, title, url) {
  const label = title || d?.title || d?.source_ref_id || d?.source_id || "出典";
  return `<span class="ref">${externalLink(url || d?.url, label)}${sourceDocumentDetail(d)}</span>`;
}

export function sourceBody(d) {
  return d.content_text ? textFold("本文を表示", d.content_text) : `<p class="muted">本文は空です。</p>`;
}

export function sourceReferenceCounts(repo, sid) {
  const c = repo.countSourceReferences(sid);
  if (c.events + c.bouts + c.videos === 0) return "";
  return badges([badge(`大会候補 ${c.events}`), badge(`試合候補 ${c.bouts}`), badge(`動画候補 ${c.videos}`)]);
}

export function sourceMentionLink(repo, m) {
  const d = repo.sourceDocumentById(m.source_id);
  if (!d) return `<span class="muted">${escapeHtml(m.source_id)}</span>`;
  return `<span class="muted">${escapeHtml(labels.sourceType(d.source_type))} / ${externalLink(d.url, d.title || d.source_ref_id || m.source_id)} / line ${escapeHtml(m.line_number)}</span>`;
}

// ── 出典候補 (review 候補。確定情報ではない) ───────────────────────

export function splitTokens(v) { return String(v ?? "").split("|").map((t) => t.trim()).filter(Boolean); }

export function referenceMentionBadges(r) {
  return splitTokens(r.mention_types).map((t) => {
    const [type, count] = t.split(":").map((x) => x.trim());
    const label = labels.mentionType(type);
    return badge(count ? `${label} ${count}` : label);
  }).join("");
}

// confidence (high→medium→low→不明) を先頭キーにした文字列ソートキー。
export function referenceSortValue(r) {
  const order = { high: "0", medium: "1", low: "2" };
  return `${order[r.confidence] ?? "3"}:${r.source_title ?? ""}:${r.candidate_id ?? ""}`;
}

export function uniqueSourceReferences(refs) {
  return [...new Map(refs.map((reference) => [reference.candidate_id, reference])).values()];
}

export function sourceReferenceSummary(repo, r) {
  const d = repo.sourceDocumentById(r.source_id);
  const matched = splitTokens(r.matched_texts).slice(0, 3).join(" / ");
  return item(`
      <p class="muted small">${escapeHtml(labels.sourceType(r.source_type))} / ${sourceDocumentLink(d, r.source_title, r.source_url)}</p>
      ${badges([badge(`候補 ${r.confidence || "unknown"}`, "soft"), referenceMentionBadges(r)])}
      ${matched ? `<p class="small">${escapeHtml(matched)}</p>` : ""}
      ${r.line_numbers ? `<p class="muted small">line ${escapeHtml(r.line_numbers)}</p>` : ""}
    `, "item-reference");
}

/** 出典候補 (確度順上位 5 件) の折りたたみセクション */
export function sourceReferences(repo, refs, title = "出典候補") {
  const unique = uniqueSourceReferences(refs)
    .sort((a, b) => referenceSortValue(a).localeCompare(referenceSortValue(b), "ja"));
  const list = unique.slice(0, 5);
  if (list.length === 0) return "";
  const count = unique.length > list.length ? `上位${list.length}件` : `${list.length}件`;
  return fold(title, grid(list.map((r) => sourceReferenceSummary(repo, r)).join("")), { className: "fold-references", count });
}
