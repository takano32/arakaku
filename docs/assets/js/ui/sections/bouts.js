import { labels } from "../../data/labels.js";
import { TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { codeList, escapeHtml, joinPresent } from "../html.js";
import { focusedOrFiltered } from "./common.js";

/** 試合タブ */
export const boutsSection = {
  id: "bouts",
  label: "試合",
  placeholder: "選手名・大会名・決まり手で検索",
  empty: "該当する試合がありません。",
  build({ repo, parts, state, query }) {
    const items = focusedOrFiltered(
      state.focusBoutId,
      (id) => repo.findRichBout(id),
      repo.richBouts,
      (b) => query.boutMatches(b) && itemPassesFilters(b, TAB_FILTERS.bouts, state)
    );
    const eventDate = (b) => repo.eventDateLabel(repo.findEvent(b.event_id));
    const titleOf = (b) => repo.titles.find((t) => t.title_id === b.title?.title_id);
    return {
      items,
      keyOf: (b) => b.bout_id,
      rowClass: (b) => `rec-bout${b.result_status === "unknown" ? " rec-unknown" : ""}`,
      renderHead: (b) => {
        const line = parts.boutResultLine(b);
        return `<div class="rec-text">
          <p class="rec-title">${parts.boutMatchup(b)}</p>
          <p class="rec-sub">${parts.eventLink(b.event_id, repo.eventName(b.event_id))}${b.division ? ` <span class="sep">/</span> ${escapeHtml(b.division)}` : ""}${eventDate(b) ? ` <span class="sep">/</span> ${escapeHtml(eventDate(b))}` : ""}</p>
          ${parts.badges([
            b.numbers_only ? parts.badge("名鑑のみ", "numbers") : (b.numbers_records?.length ? parts.badge("名鑑", "numbers") : ""),
            b.title?.is_title_bout ? parts.badge("王座戦", "gold") : "",
            b.result_status === "unknown" ? parts.badge("勝敗未入力", "soft") : "",
          ])}
        </div>
        <div class="rec-aside">${line ? `<span class="result-line">${escapeHtml(line)}</span>` : ""}</div>`;
      },
      renderBody: (b) => {
        const summary = parts.boutResultSummary(b);
        const decision = parts.boutDecisionLine(b);
        return `
          ${summary ? `<p class="result">${summary}${decision ? ` <span class="muted">${escapeHtml(decision)}</span>` : ""}</p>` : ""}
          ${b.title?.is_title_bout ? `<p class="small">王座戦: ${titleOf(b) ? `<a href="?tab=titles&title_promo=${encodeURIComponent(b.promotion_id)}">${escapeHtml(repo.titleDisplayName(titleOf(b)))}</a>` : ""}${b.title.note ? ` <span class="muted">${escapeHtml(b.title.note)}</span>` : ""}</p>` : ""}
          ${b.notes ? `<p class="small muted">${escapeHtml(b.notes)}</p>` : ""}
          ${parts.videoLinks("bout", b.bout_id)}
          ${parts.sourceReferences(repo.sourceReferencesForBout(b), "出典候補")}
          ${parts.details([
            ["bout_id", `<code>${escapeHtml(b.bout_id)}</code>`],
            ["大会", parts.eventLink(b.event_id, repo.eventName(b.event_id))],
            ["団体", escapeHtml(repo.promotionName(b.promotion_id))],
            ["試合順", b.bout_order ? `第${escapeHtml(b.bout_order)}試合` : ""],
            ["階級", escapeHtml(joinPresent([b.division, b.weight_class_id]))],
            ["種別", escapeHtml(labels.boutType(b.bout_type))],
            ["形式 (名鑑)", escapeHtml(b.numbers_records?.[0]?.bout_format ?? "")],
            ["結果状態", escapeHtml(labels.resultStatus(b.result_status))],
            ["選手", `<ul class="plain-list">${parts.fighterRows(b)}</ul>`],
            ["決着", escapeHtml(decision)],
            ["王座", b.title?.is_title_bout ? escapeHtml(titleOf(b) ? repo.titleDisplayName(titleOf(b)) : b.title.title_id ?? "") : ""],
            ["推定元動画", codeList([b.inferred_from_video_id])],
            ["推定信頼度", escapeHtml(b.inferred_confidence ?? "")],
            ["メモ", escapeHtml(b.notes ?? "")],
          ])}
        `;
      },
    };
  },
};
