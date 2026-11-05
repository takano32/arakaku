import { EVENT_TYPE_LABELS, TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { eventDateLabel } from "../../data/event_dates.js";
import { escapeHtml, joinPresent } from "../html.js";
import { badge, badges, details, section } from "../parts/basic.js";
import { eventBouts } from "../parts/bouts.js";
import { articleRefList, sourceReferences } from "../parts/sources.js";
import { videoLinks } from "../parts/videos.js";
import { focusedOrFiltered } from "./common.js";

/** 大会タブ */
export const eventsSection = {
  id: "events",
  label: "大会",
  placeholder: "大会名・団体で検索",
  empty: "該当する大会がありません。",
  build({ repo, state, query }) {
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
          <p class="rec-sub">${escapeHtml(joinPresent([repo.promotionName(e.promotion_id), eventDateLabel(e), EVENT_TYPE_LABELS[e.event_type] ?? e.event_type]))}</p>
          ${badges([
            od ? badge("公式", "official") : "",
            e.numbers_only ? badge("名鑑のみ", "numbers") : "",
            od?.champion ? badge(`優勝 ${od.champion}`, "gold") : "",
          ])}
        </div>
        <div class="rec-aside">${bouts ? `<span class="result-line">${bouts}試合</span>` : ""}</div>`;
      },
      renderBody: (e) => {
        const od = e.official_data;
        return `
          <p class="summary">${escapeHtml(e.summary || "概要未入力")}</p>
          ${od?.champion ? section("公式データ", `<div class="stats"><span class="stat stat-official">優勝: ${escapeHtml(od.champion)}</span>${od.runner_up ? `<span class="stat stat-official">準優勝: ${escapeHtml(od.runner_up)}</span>` : ""}</div>`, "sec-official") : ""}
          ${videoLinks(repo, "event", e.event_id, repo.videoIdsLinkedToEventBouts(e.event_id))}
          ${eventBouts(repo, e.event_id)}
          ${sourceReferences(repo, repo.sourceReferencesForEvent(e), "出典候補")}
          ${articleRefList(repo, e.source_article_id)}
          ${details([
            ["event_id", `<code>${escapeHtml(e.event_id)}</code>`],
            ["団体", escapeHtml(repo.promotionName(e.promotion_id))],
            ["大会番号", escapeHtml(e.event_number ?? "")],
            ["名鑑の興行番号", escapeHtml(e.numbers_event_number ?? "")],
            ["大会種別", escapeHtml(e.event_type ?? "")],
            ["結果発表日", escapeHtml(e.result_published_at ?? "")],
            ["note の最初の投稿日", escapeHtml(e.note_published_at ?? "")],
            ["公開日", escapeHtml(e.published_at ?? "")],
            ["推定元", escapeHtml(e.inferred_from ?? "")],
            ["推定信頼度", escapeHtml(e.inferred_confidence ?? "")],
          ])}
        `;
      },
    };
  },
};
