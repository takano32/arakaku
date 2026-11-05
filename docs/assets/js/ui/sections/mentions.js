import { labels } from "../../data/labels.js";
import { escapeHtml } from "../html.js";
import { badge, details, textFold } from "../parts/basic.js";
import { sourceMentionLink } from "../parts/sources.js";
import { code } from "./common.js";

/** 管理ビュー「出典言及」: 出典本文から抽出した言及。候補であり確定事実ではない。 */
export const mentionsSection = {
  id: "mentions",
  label: "出典言及",
  placeholder: "言及テキストで検索",
  empty: "該当する言及がありません。",
  build({ repo, query }) {
    const items = repo.richSourceMentions.filter((m) => query.mentionMatches(m));
    return {
      items,
      keyOf: (m) => m.mention_id,
      rowClass: () => "rec-mention",
      renderHead: (m) => `<div class="rec-text">
          <p class="rec-title">${badge(labels.mentionType(m.mention_type), "soft")} ${escapeHtml(m.entity_hint || m.matched_text || m.mention_id)}</p>
          <p class="rec-sub">${sourceMentionLink(repo, m)}</p>
        </div>
        <div class="rec-aside">${badge(`候補 ${m.confidence || "unknown"}`, "soft")}</div>`,
      renderBody: (m) => `
        <p class="pre-line">${escapeHtml(m.matched_text || "本文なし")}</p>
        ${textFold("文脈を表示", m.context || m.matched_text || "")}
        ${details([
          ["mention_id", code(m.mention_id)],
          ["source_id", code(m.source_id)],
          ["entity_type", escapeHtml(m.entity_type ?? "")],
          ["confidence", escapeHtml(m.confidence ?? "")],
          ["line_number", escapeHtml(m.line_number ?? "")],
          ["source_ref_id", escapeHtml(m.source_ref_id ?? "")],
          ["notes", escapeHtml(m.notes ?? "")],
        ])}
      `,
    };
  },
};
