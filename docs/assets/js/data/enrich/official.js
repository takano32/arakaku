import { normalizeFighterName } from "../names.js";

/**
 * 団体公式サイト (official_players / official_tournaments) を選手・大会に突き合わせるための
 * 索引と ID 正規化 (純関数)。DataEnricher が索引を 1 回だけ構築してキャッシュする。
 */

/**
 * 公式選手の名前索引。exact は表示名の完全一致、normalized は表記ゆれを吸収した正規化キー
 * (normalizeFighterName)。同じ正規化キーに別名の公式選手が複数いる場合は曖昧として normalized から除く。
 */
export function buildOfficialPlayerIndexes(players) {
  const exact = new Map();
  const normalized = new Map();
  const ambiguous = new Set();
  for (const p of players ?? []) {
    if (!p.name) continue;
    exact.set(p.name, p);
    const key = normalizeFighterName(p.name);
    if (normalized.has(key) && normalized.get(key).name !== p.name) ambiguous.add(key);
    normalized.set(key, p);
  }
  for (const key of ambiguous) normalized.delete(key);
  return { exact, normalized };
}

/** 完全一致を優先し、取れなければ表記ゆれを吸収した正規化キーで突き合わせる。 */
export function findOfficialPlayer(indexes, name) {
  if (!name) return undefined;
  return indexes.exact.get(name) ?? indexes.normalized.get(normalizeFighterName(name));
}

/** 公式トーナメントの id を events.csv の event_id の形に揃える (maxbout- → max-bout-、階級の略称 → 正式名)。 */
export function normalizeTournamentId(id) {
  return id
    .replace("maxbout-", "max-bout-")
    .replace(/-light$/, "-lightweight")
    .replace(/-middle$/, "-middleweight")
    .replace(/-heavy$/, "-heavyweight");
}

/** 正規化した id → 公式トーナメント。 */
export function buildOfficialTournamentIndex(tournaments) {
  const index = new Map();
  for (const t of tournaments ?? []) index.set(normalizeTournamentId(t.id), t);
  return index;
}

/** event_id は max-bout-6-middleweight-gp / -tournament のように形式の接尾辞が付くので外して引く。 */
export function tournamentKeyForEvent(eventId) {
  return eventId.replace(/-(?:gp|tournament)$/, "");
}
