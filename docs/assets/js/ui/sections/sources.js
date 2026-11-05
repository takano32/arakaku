import { labels } from "../../data/labels.js";
import { TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { escapeHtml, externalLink, joinPresent } from "../html.js";
import { badge, badges, details } from "../parts/basic.js";
import { sourceBody, sourceReferenceCounts } from "../parts/sources.js";
import { code } from "./common.js";

/** 管理ビュー「出典本文」: 出典文書 (note 本文 / YouTube 概要欄) の本文そのものと、出典候補の件数を確認するビュー。 */
export const sourcesSection = {
  id: "sources",
  label: "出典本文",
  placeholder: "出典のタイトル・本文で検索",
  empty: "該当する出典がありません。",
  build({ repo, state, query }) {
    const items = repo.sourceDocuments.filter((d) => query.sourceDocumentMatches(d) && itemPassesFilters(d, TAB_FILTERS.sources, state));
    return {
      items,
      keyOf: (d) => d.source_id,
      rowClass: (d) => `rec-source rec-src-${d.source_type === "note_article" ? "note" : "youtube"}`,
      renderHead: (d) => `<div class="rec-text">
          <p class="rec-title">${escapeHtml(d.title || d.source_ref_id)}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([d.published_at || "日付未入力", d.source_ref_id]))}</p>
          ${badges([badge(labels.sourceType(d.source_type), d.source_type === "note_article" ? "note" : ""), sourceReferenceCounts(repo, d.source_id)])}
        </div>`,
      renderBody: (d) => `
        ${d.url ? `<p class="small">${externalLink(d.url, "出典を開く")}</p>` : ""}
        <p class="pre-line small">${escapeHtml(d.content_preview || "プレビュー未入力")}</p>
        ${sourceBody(d)}
        ${details([
          ["source_id", code(d.source_id)],
          ["URL", d.url ? externalLink(d.url, d.url) : "未入力"],
          ["取得日時", escapeHtml(d.fetched_at ?? "")],
          ["content_hash", d.content_hash ? code(d.content_hash) : "未入力"],
          ["notes", escapeHtml(d.notes ?? "")],
        ])}
      `,
    };
  },
};
