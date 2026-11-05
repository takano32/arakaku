import { escapeHtml } from "../html.js";
import { badge, details } from "../parts/basic.js";
import { fighterLink } from "../parts/links.js";
import { code } from "./common.js";

/** 管理ビュー「名前対応」: 名鑑の選手名と fighter_id の対応 (numbers_name_matches)。行の左の色帯 rec-src-numbers (青)。 */
export const numbersNameMatchesSection = {
  id: "numbersNameMatches",
  label: "名前対応",
  placeholder: "名鑑名・fighter_id で検索",
  empty: "該当する対応がありません。",
  build({ repo, query }) {
    const items = repo.numbersNameMatches.filter((m) =>
      query.includes([m.numbers_name, m.matched_fighter_id, m.matched_display_name, m.candidate_fighter_id, m.match_method, m.match_confidence, m.notes]));
    return {
      items,
      keyOf: (m) => m.numbers_fighter_id,
      rowClass: () => "rec-src-numbers",
      renderHead: (m) => `<div class="rec-text">
          <p class="rec-title">${escapeHtml(m.numbers_name)} <span class="muted">→</span> ${m.matched_fighter_id ? fighterLink(repo, m.matched_fighter_id, m.matched_display_name || m.matched_fighter_id) : "<span class=\"muted\">未対応</span>"}</p>
          <p class="rec-sub">${escapeHtml(m.match_method ?? "")}</p>
        </div>
        <div class="rec-aside">${badge(m.match_confidence || "未対応", m.match_confidence ? "numbers" : "soft")}</div>`,
      renderBody: (m) => details([
        ["numbers_fighter_id", code(m.numbers_fighter_id)],
        ["matched_fighter_id", m.matched_fighter_id ? code(m.matched_fighter_id) : "未対応"],
        ["candidate_fighter_id", code(m.candidate_fighter_id)],
        ["メモ", escapeHtml(m.notes ?? "")],
      ], "詳細", { open: true }),
    };
  },
};
