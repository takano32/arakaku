import { TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { numbersAchievementLabels } from "../../data/enrich/fighter.js";
import { escapeHtml, joinPresent, recordText } from "../html.js";
import { badge, badges, details, dl } from "../parts/basic.js";
import { code } from "./common.js";

/** 管理ビュー「名鑑選手」: 名鑑 (Numbers) の選手を原データに近い形で全項目見せる。行の左の色帯 rec-src-numbers (青) で出所を示す。 */
export const numbersFightersSection = {
  id: "numbersFighters",
  label: "名鑑選手",
  placeholder: "名鑑の選手名で検索",
  empty: "該当する名鑑選手がいません。",
  build({ repo, state, query }) {
    const items = repo.numbersFighters.filter((f) =>
      itemPassesFilters(f, TAB_FILTERS.numbersFighters, state) &&
      query.includes([f.display_name, f.main_division, f.main_promotion_raw, f.main_promotion_id, f.profile?.gym, f.catchphrase, f.notes, f.numbers_fighter_id]));
    return {
      items,
      keyOf: (f) => f.numbers_fighter_id,
      rowClass: () => "rec-src-numbers",
      renderHead: (f) => {
        const record = recordText({
          fight_count: f.stats?.fight_count ?? null, wins: f.stats?.wins ?? null, losses: f.stats?.losses ?? null, draws: null, win_rate: f.stats?.win_rate ?? null,
        });
        return `<div class="rec-text">
          <p class="rec-title">${escapeHtml(f.display_name)}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([f.main_division, f.main_promotion_id, f.profile?.gym]))}</p>
          ${badges([badge(f.source_confidence === "numbers" ? "名鑑" : (f.source_confidence ?? ""), "numbers")])}
        </div>
        <div class="rec-aside">${record ? `<span class="result-line">${escapeHtml(record)}</span>` : ""}</div>`;
      },
      renderBody: (f) => {
        const markers = [...numbersAchievementLabels(f.achievements), f.achievements?.tournament_entry_raw ? `出場 ${f.achievements.tournament_entry_raw}` : ""].filter(Boolean);
        return `
          ${markers.length ? `<div class="stats">${markers.map((a) => `<span class="stat stat-gold">${escapeHtml(a)}</span>`).join("")}</div>` : ""}
          ${f.catchphrase ? `<p class="summary">${escapeHtml(f.catchphrase)}</p>` : ""}
          ${f.notes ? `<p class="pre-line small">${escapeHtml(f.notes)}</p>` : ""}
          ${dl([
            ["所属", escapeHtml(f.profile?.gym ?? "")],
            ["身長・年齢", escapeHtml(joinPresent([f.profile?.height, f.profile?.age]))],
            ["勝率 (原値)", escapeHtml(f.stats?.win_rate ?? "")],
          ], "dl-inline")}
          ${details([
            ["numbers_fighter_id", code(f.numbers_fighter_id)],
            ["団体(原文)", escapeHtml(f.main_promotion_raw ?? "")],
            ["出典", escapeHtml(joinPresent([f.source_sheet, f.source_row ? `行${f.source_row}` : ""], " / "))],
          ])}
        `;
      },
    };
  },
};
