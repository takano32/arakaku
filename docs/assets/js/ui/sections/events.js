import { TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { escapeHtml, joinPresent } from "../html.js";
import { focusedOrFiltered } from "./common.js";

const EVENT_TYPE_LABELS = { numbered_event: "通常大会", tournament: "トーナメント", special_event: "特別大会" };

/** 大会タブ */
export const eventsSection = {
  id: "events",
  label: "大会",
  placeholder: "大会名・団体で検索",
  empty: "該当する大会がありません。",
  build({ repo, parts, state, query }) {
    const items = focusedOrFiltered(
      state.focusEventId,
      (id) => repo.findRichEvent(id),
      repo.richEvents,
      (e) => query.eventMatches(e) && itemPassesFilters(e, TAB_FILTERS.events, state)
    );
    return {
      items,
      keyOf: (e) => e.event_id,
      rowClass: () => "rec-event",
      renderHead: (e) => {
        const od = e.official_data;
        const bouts = repo.boutsForEvent(e.event_id).length;
        return `<div class="rec-text">
          <p class="rec-title">${escapeHtml(e.name)}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([repo.promotionName(e.promotion_id), e.event_date || e.published_at, EVENT_TYPE_LABELS[e.event_type] ?? e.event_type]))}</p>
          ${parts.badges([
            od ? parts.badge("公式", "official") : "",
            e.numbers_only ? parts.badge("名鑑のみ", "numbers") : "",
            od?.champion ? parts.badge(`優勝 ${od.champion}`, "gold") : "",
          ])}
        </div>
        <div class="rec-aside">${bouts ? `<span class="result-line">${bouts}試合</span>` : ""}</div>`;
      },
      renderBody: (e) => {
        const od = e.official_data;
        return `
          <p class="summary">${escapeHtml(e.summary || "概要未入力")}</p>
          ${od?.champion ? parts.section("公式データ", `<div class="stats"><span class="stat stat-official">優勝: ${escapeHtml(od.champion)}</span>${od.runner_up ? `<span class="stat stat-official">準優勝: ${escapeHtml(od.runner_up)}</span>` : ""}</div>`, "sec-official") : ""}
          ${parts.videoLinks("event", e.event_id, repo.videoIdsLinkedToEventBouts(e.event_id))}
          ${parts.eventBouts(e.event_id)}
          ${parts.sourceReferences(repo.sourceReferencesForEvent(e), "出典候補")}
          ${parts.articleRefList(e.source_article_id)}
          ${parts.details([
            ["event_id", `<code>${escapeHtml(e.event_id)}</code>`],
            ["団体", escapeHtml(repo.promotionName(e.promotion_id))],
            ["大会番号", escapeHtml(e.event_number ?? "")],
            ["名鑑の興行番号", escapeHtml(e.numbers_event_number ?? "")],
            ["大会種別", escapeHtml(e.event_type ?? "")],
            ["開催日", escapeHtml(e.event_date ?? "")],
            ["公開日", escapeHtml(e.published_at ?? "")],
            ["推定元", escapeHtml(e.inferred_from ?? "")],
            ["推定信頼度", escapeHtml(e.inferred_confidence ?? "")],
          ])}
        `;
      },
    };
  },
};
