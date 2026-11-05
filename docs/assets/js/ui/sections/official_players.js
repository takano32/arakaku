import { TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { escapeHtml, joinPresent, recordText } from "../html.js";
import { badge, badges, details } from "../parts/basic.js";
import { code } from "./common.js";

/** 管理ビュー「公式選手」: 団体公式サイトの選手一覧を原データに近い形で見せる。行の左の色帯 rec-src-official (緑) で出所を示す。 */
export const officialPlayersSection = {
  id: "officialPlayers",
  label: "公式選手",
  placeholder: "公式サイトの選手名で検索",
  empty: "該当する公式選手がいません。",
  build({ repo, state, query }) {
    const items = repo.officialPlayers
      // organization (団体名) を promotion_id に解決して合成。TAB_FILTERS.officialPlayers の団体フィルタが ID で照合する。
      .map((p) => ({ ...p, promotion_id: repo.promotionIdByName(p.organization) }))
      .filter((p) => itemPassesFilters(p, TAB_FILTERS.officialPlayers, state) &&
        query.includes([p.name, p.name_kana, p.nickname, p.organization, p.weight_class, p.nationality, p.gym, p.bio, p.id]));
    return {
      items,
      keyOf: (p) => p.id,
      rowClass: () => "rec-src-official",
      renderHead: (p) => {
        const record = recordText({ fight_count: null, wins: p.wins ?? null, losses: p.losses ?? null, draws: p.draws ?? null, win_rate: null });
        return `<div class="rec-text">
          <p class="rec-title">${escapeHtml(p.name)}${p.nickname ? ` <span class="nick">「${escapeHtml(p.nickname)}」</span>` : ""}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([p.weight_class, p.organization, p.nationality]))}</p>
          ${badges([badge("公式", "official")])}
        </div>
        <div class="rec-aside">${record ? `<span class="result-line">${escapeHtml(record)}</span>` : ""}</div>`;
      },
      renderBody: (p) => `
        ${p.bio ? `<p class="summary">${escapeHtml(p.bio)}</p>` : ""}
        ${details([
          ["id", code(p.id)],
          ["読み", escapeHtml(p.name_kana ?? "")],
          ["年齢", escapeHtml(p.age ?? "")],
          ["身長", escapeHtml(p.height ?? "")],
          ["デビュー", escapeHtml(p.debut ?? "")],
          ["所属", escapeHtml(p.gym ?? "")],
        ], "詳細", { open: true })}
      `,
    };
  },
};
