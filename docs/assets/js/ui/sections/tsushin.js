import { labels } from "../../data/labels.js";
import { TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { escapeHtml, externalLink, joinPresent } from "../html.js";

// note 記事スクレイプから本文だけを抽出する。
// 日付行の後 ～ フッタ (応援・ハッシュタグ等) の前を本文とし、見出しと重複する先頭行を落とす。
export function cleanNoteBody(text, title) {
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

// 本文の日付行 (「2025年4月29日 11:08」) を拾う
function noteDate(text) {
  const m = /(\d{4}年\d{1,2}月\d{1,2}日)/.exec(text ?? "");
  return m ? m[1] : "";
}

/**
 * 通信タブ: アラカク通信のーとの記事本文 (source_type=note_article)。
 * 本文 (source_document_bodies) はタブを開いたときに遅延ロードされ、届くまではプレビューで描画する。
 */
export const tsushinSection = {
  id: "tsushin",
  label: "通信",
  placeholder: "記事タイトル・本文で検索",
  empty: "該当する記事がありません。",
  build({ repo, parts, state, query }) {
    const withFilterFields = (doc) => {
      const article = repo.findArticle(doc.source_ref_id);
      const divisions = [...new Set(
        repo.findManyByField("articleLinks", "article_id", doc.source_ref_id)
          .filter((l) => l.entity_type === "bout")
          .map((l) => repo.findBout(l.entity_id)?.division)
          .filter(Boolean)
      )];
      // promotion_id / divisions は TAB_FILTERS.tsushin の field と一致させる合成フィールド
      return { ...doc, promotion_id: article?.promotion_id, divisions, article_type: article?.article_type, published_at: doc.published_at || article?.published_at };
    };
    const items = repo.sourceDocuments
      .filter((d) => d.source_type === "note_article")
      .map(withFilterFields)
      .filter((d) => itemPassesFilters(d, TAB_FILTERS.tsushin, state) && query.sourceDocumentMatches(d));
    return {
      items,
      keyOf: (d) => d.source_id,
      rowClass: () => "rec-article",
      renderHead: (d) => {
        const archive = repo.findNoteArchive(d.url);
        const body = cleanNoteBody(d.content_text, d.title);
        const preview = (body || archive?.description || d.content_preview || "").replace(/\s+/g, " ").slice(0, 120);
        const date = d.published_at || noteDate(d.content_text || d.content_preview);
        return `<div class="rec-text">
          <p class="rec-title">${escapeHtml(d.title || d.source_ref_id)}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([date, repo.promotionName(d.promotion_id) !== d.promotion_id ? repo.promotionName(d.promotion_id) : "", d.divisions.join("・")]))}</p>
          ${preview ? `<p class="rec-preview">${escapeHtml(preview)}</p>` : ""}
        </div>
        <div class="rec-aside">${parts.badges([
          d.article_type ? parts.badge(labels.articleType(d.article_type)) : "",
          parts.badge(labels.sourceType(d.source_type), "note"),
        ])}</div>`;
      },
      renderBody: (d) => {
        const archive = repo.findNoteArchive(d.url);
        const body = cleanNoteBody(d.content_text, d.title);
        const fallback = archive?.description ?? d.content_preview ?? "";
        const loading = !d.content_text && !state.loadedDataKeys?.has("sourceDocumentBodies");
        return `
          <p class="small">${externalLink(d.url, "note で記事を開く")}</p>
          ${body
            ? `<div class="note-body">${escapeHtml(body)}</div>`
            : (fallback ? `<p class="pre-line">${escapeHtml(fallback)}</p>` : "")}
          ${loading ? `<p class="muted small">本文を読み込み中…</p>` : ""}
        `;
      },
    };
  },
};
