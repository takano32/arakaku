import { TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { escapeHtml, joinPresent } from "../html.js";
import { details } from "../parts/basic.js";
import { code } from "./common.js";

/** 管理ビュー「名鑑記録」: 名鑑 (Numbers) の個人成績を原データに近い形で全項目見せる。行の左の色帯 rec-src-numbers (青)。 */
export const numbersFightRecordsSection = {
  id: "numbersFightRecords",
  label: "名鑑記録",
  placeholder: "選手名・相手・決着で検索",
  empty: "該当する記録がありません。",
  build({ repo, state, query }) {
    const items = repo.numbersFightRecords.filter((r) =>
      itemPassesFilters(r, TAB_FILTERS.numbersFightRecords, state) &&
      query.includes([r.fighter_name, r.opponent_name, r.division, r.promotion_raw, r.promotion_id, r.event_number_raw, r.bout_format, r.result, r.detail_raw, r.record_id]));
    const eventMeta = (r) => joinPresent([
      r.division,
      r.promotion_id,
      // MAXバウトは原文が「第5回 1回戦A」で、正規化値は回数だけなので原文を出す
      r.event_number_raw?.startsWith("第") ? r.event_number_raw : r.event_number_normalized ? `第${r.event_number_normalized}回` : "",
    ]);
    return {
      items,
      keyOf: (r) => r.record_id,
      rowClass: () => "rec-src-numbers",
      renderHead: (r) => `<div class="rec-text">
          <p class="rec-title">${escapeHtml(r.fighter_name)} <span class="vs">vs</span> ${escapeHtml(r.opponent_name || "不明")}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([eventMeta(r), r.bout_format]))}</p>
        </div>
        <div class="rec-aside">${r.result ? `<span class="result-line">${escapeHtml(joinPresent([r.result_mark, r.result], " "))}</span>` : ""}</div>`,
      renderBody: (r) => `
        ${r.detail_raw ? `<p class="pre-line">${escapeHtml(r.detail_raw)}</p>` : ""}
        ${details([
          ["record_id", code(r.record_id)],
          ["numbers_fighter_id", code(r.numbers_fighter_id)],
          ["matched_fighter_id", r.matched_fighter_id ? code(r.matched_fighter_id) : "未対応"],
          ["candidate_fighter_id", code(r.candidate_fighter_id)],
          ["相手 matched_fighter_id", code(r.opponent_matched_fighter_id)],
          ["相手 candidate_fighter_id", code(r.opponent_candidate_fighter_id)],
          ["相手 numbers_fighter_id", code(r.opponent_numbers_fighter_id)],
          ["団体(原文)", escapeHtml(r.promotion_raw ?? "")],
          ["大会番号(原文)", escapeHtml(r.event_number_raw ?? "")],
          ["出典", escapeHtml(joinPresent([r.source_sheet, r.source_row ? `行${r.source_row}` : ""], " / "))],
        ], "詳細", { open: true })}
      `,
    };
  },
};
