import { escapeHtml, joinPresent } from "../html.js";
import { badge, details } from "../parts/basic.js";
import { code } from "./common.js";

/** 管理ビュー「公式」: 公式サイトのトーナメント・試合・沿革。行の左の色帯 rec-src-official (緑)。 */

// 公式サイトの試合 (matches) と沿革 (history) は、note・公式の大会一覧・CSV のどれとも合わず、登場する選手も
// ほかに出てこない (例: 1995 荒木好之 vs デーモンキング)。公式サイトの仮のデータとみられるので、消さずに注記する (T.78)。
const UNVERIFIED_NOTE = `<p class="muted small">公式サイトのデータ。note・公式の大会一覧・このデータベースの記録と合わず、仮のデータの可能性があります。</p>`;

// 公式の沿革の month は「春」「夏」「冬」「通年」などの言葉なので、数字のときだけ「月」を付ける
// (以前は常に付けていて「春月」になった。T.112.4.25)。
function monthLabel(month) {
  if (month == null || month === "") return "";
  return /^\d+$/.test(String(month)) ? `${month}月` : String(month);
}

export const officialMiscSection = {
  id: "officialMisc",
  label: "公式",
  placeholder: "トーナメント・試合・沿革で検索",
  empty: "該当する公式データがありません。",
  build({ repo, query }) {
    // 検索は元のレコードで行う。足した _type・_key で検索すると「tournament」「h:」などで全件が当たっていた (T.112.6.3)。
    const items = [
      ...repo.officialTournaments.map((t) => [t, { _type: "tournament", _key: `t:${t.id}`, ...t }]),
      ...repo.officialMatches.map((m) => [m, { _type: "match", _key: `m:${m.id}`, ...m }]),
      ...repo.officialHistory.map((h, i) => [h, { _type: "history", _key: `h:${i}`, ...h }]),
    ]
      .filter(([record]) => query.includes(Object.values(record).filter((v) => typeof v === "string" || typeof v === "number")))
      .map(([, item]) => item);
    return {
      items,
      keyOf: (item) => item._key,
      rowClass: () => "rec-src-official",
      renderHead: (item) => {
        if (item._type === "tournament") {
          return `<div class="rec-text">
            <p class="rec-title">${escapeHtml(item.name)}</p>
            <p class="rec-sub">${escapeHtml(joinPresent([item.date, item.champion ? `優勝: ${item.champion}` : "", item.runner_up ? `準優勝: ${item.runner_up}` : ""]))}</p>
          </div>
          <div class="rec-aside">${badge("トーナメント", "official")}</div>`;
        }
        if (item._type === "match") {
          return `<div class="rec-text">
            <p class="rec-title">${escapeHtml(item.fighter1 ?? "")} <span class="vs">vs</span> ${escapeHtml(item.fighter2 ?? "")}</p>
            <p class="rec-sub">${escapeHtml(joinPresent([item.event, item.date, item.weight_class]))}</p>
          </div>
          <div class="rec-aside">${badge("試合", "official")}${badge("note と合わない", "soft")}${item.result ? `<span class="result-line">${escapeHtml(item.result)}</span>` : ""}</div>`;
        }
        return `<div class="rec-text">
          <p class="rec-title">${escapeHtml(item.title)}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([item.year, item.era, monthLabel(item.month)]))}</p>
        </div>
        <div class="rec-aside">${badge("沿革", "official")}${badge("note と合わない", "soft")}</div>`;
      },
      renderBody: (item) => {
        if (item._type === "tournament") {
          return details([["id", code(item.id)], ["video_id", code(item.video_id)]], "詳細", { open: true }) || `<p class="muted">詳細はありません。</p>`;
        }
        if (item._type === "match") {
          return UNVERIFIED_NOTE + details([["id", code(item.id)], ["決着", escapeHtml(item.method ?? "")], ["ラウンド", escapeHtml(item.round ?? "")], ["メモ", escapeHtml(item.notes ?? "")]], "詳細", { open: true });
        }
        return UNVERIFIED_NOTE + (item.description ? `<p>${escapeHtml(item.description)}</p>` : `<p class="muted">説明はありません。</p>`);
      },
    };
  },
};
