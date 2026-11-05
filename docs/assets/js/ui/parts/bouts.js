import { labels } from "../../data/labels.js";
import { boutResultText, escapeHtml, joinPresent } from "../html.js";
import { badge, grid, item, section } from "./basic.js";
import { boutLink, eventLink, fighterLink } from "./links.js";
import { videoLinks } from "./videos.js";

/**
 * 試合の表記 (対戦カード・勝敗・決着) と関連試合カードの HTML 部品。文字列だけを返す。
 */

// 対戦カード表記。enrich 済み bout.fighters[] を最優先し、無ければ fighter_a/b、勝者敗者ペア、
// 生 matchup 文字列、最後に bout_id とフォールバックする。
export function boutMatchup(repo, bout) {
  const fighterA = bout.fighters?.[0];
  const fighterB = bout.fighters?.[1];
  const aName = fighterA?.name ?? bout.fighter_a ?? "";
  const bName = fighterB?.name ?? bout.fighter_b ?? "";
  const aId = fighterA?.fighter_id ?? bout.fighter_a_id ?? "";
  const bId = fighterB?.fighter_id ?? bout.fighter_b_id ?? "";
  if (aName && bName) {
    return `${matchupSide(repo, aId, aName, bout)} <span class="vs">vs</span> ${matchupSide(repo, bId, bName, bout)}`;
  }
  if (bout.winner && bout.loser) {
    return `${matchupSide(repo, bout.winner_id, bout.winner, bout)} <span class="vs">vs</span> ${matchupSide(repo, bout.loser_id, bout.loser, bout)}`;
  }
  if (bout.matchup) return escapeHtml(bout.matchup);
  return escapeHtml(bout.bout_id);
}

// 勝者は太字 (result_status が unknown のときは勝敗を示さない)
function matchupSide(repo, id, name, bout) {
  const link = fighterLink(repo, id, name);
  const status = bout.result_status ?? "known";
  const isWinner = status !== "unknown" && bout.winner && bout.loser && (id ? bout.winner_id === id : bout.winner === name);
  return isWinner ? `<span class="winner">${link}</span>` : link;
}

/** 「A def. B」 (勝敗不明なら空) */
export function boutResultSummary(repo, bout) {
  const status = bout.result_status ?? "known";
  if (status === "unknown") return "";
  if (bout.winner && bout.loser) {
    return `${fighterLink(repo, bout.winner_id, bout.winner)} <span class="def">def.</span> ${fighterLink(repo, bout.loser_id, bout.loser)}`;
  }
  return "";
}

/** 決着の 1 行 (「3R 4:21 KO」等)。無ければ "" */
export function boutResultLine(bout) {
  return boutResultText(bout);
}

export function boutDecisionLine(bout) {
  const res = [bout.result?.method_normalized, bout.result?.technique, bout.result?.decision_score].filter(Boolean);
  return res.length > 0 ? res.join(" ") : "";
}

export function fighterRows(repo, bout) {
  return (bout.fighters ?? []).map((f) => `
      <li>${fighterLink(repo, f.fighter_id, f.name)} <span class="muted">${escapeHtml(joinPresent([labels.side(f.side), labels.fighterResult(f.result)]))}</span></li>
    `).join("");
}

// ── 関連試合 ───────────────────────────────────────────────────────

/** 関連試合 1 件 (選手ページでは大会名を、大会ページでは試合順を見出しにする) */
export function relatedBout(repo, bout, { showEvent = false, showOrder = false } = {}) {
  const result = boutResultSummary(repo, bout);
  const line = boutResultLine(bout);
  const head = [
    showOrder && bout.bout_order ? `<span class="muted small">第${escapeHtml(bout.bout_order)}試合</span>` : "",
    showEvent ? `<span class="small">${eventLink(repo, bout.event_id, repo.eventName(bout.event_id))}</span>` : "",
  ].filter(Boolean).join(" ");
  return item(`
      ${head ? `<p class="item-head">${head}</p>` : ""}
      <p class="item-title">${boutMatchup(repo, bout)} ${bout.numbers_records?.length ? badge("名鑑", "numbers") : ""} ${bout.numbers_only ? badge("名鑑のみ", "numbers") : ""}</p>
      ${result ? `<p class="result">${result}</p>` : ""}
      ${line ? `<p class="small">${escapeHtml(line)}</p>` : ""}
      <p class="small">${boutLink(bout.bout_id, "試合の詳細へ")}</p>
      ${videoLinks(repo, "bout", bout.bout_id)}
    `, "item-bout");
}

export function relatedBouts(repo, fighterId) {
  const bouts = repo.relatedBoutsForFighter(fighterId);
  if (bouts.length === 0) return `<p class="muted">関連試合はまだ登録されていません。</p>`;
  return section(`関連試合（${bouts.length}）`, grid(bouts.map((b) => relatedBout(repo, b, { showEvent: true })).join("")), "sec-bouts");
}

export function eventBouts(repo, eventId) {
  const bouts = repo.boutsForEvent(eventId);
  if (bouts.length === 0) return `<p class="muted">関連試合はまだ登録されていません。</p>`;
  return section(`試合（${bouts.length}）`, grid(bouts.map((b) => relatedBout(repo, b, { showOrder: true })).join("")), "sec-bouts");
}
