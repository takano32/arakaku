import { normalizeFighterName } from "./names.js";

/**
 * 選手一覧の母集団と並び (純関数)。
 * - discoverFighters: canonical fighters.csv に無い選手を名鑑の対応表・公式サイトから発掘する
 * - numbersOrder / sortByNumbersOrder: 名鑑 (Numbers) の掲載順に並べる
 * DataRepository.richFighters がこの順で呼び、enrich と重複統合 (fighter_merge.js) を続ける。
 */

/**
 * canonical fighters.csv に存在しない選手を Numbers 突合・公式サイト選手一覧から発掘する。
 * 発掘した合成行は fighter_id/display_name のみ持ち、enrichFighter が肉付けする。
 */
export function discoverFighters(canonical, numbersNameMatches, officialPlayers) {
  const fighterIds = new Set(canonical.map(f => f.fighter_id));
  const discovered = [];

  // Numbers の対応表にだけ現れる選手
  for (const match of numbersNameMatches) {
    const fid = match.matched_fighter_id || match.candidate_fighter_id;
    if (fid && !fighterIds.has(fid)) {
      discovered.push({ fighter_id: fid, display_name: match.numbers_name || fid });
      fighterIds.add(fid);
    }
  }

  // 公式サイトにだけいる選手。enrichFighter は display_name で公式データを突き合わせるため、
  // 合成行の display_name を公式名にしておけば official_data が付与される。
  const knownNames = new Set([...canonical, ...discovered].map(f => normalizeFighterName(f.display_name)));
  for (const op of officialPlayers) {
    if (!op.name || knownNames.has(normalizeFighterName(op.name))) continue;
    const fid = fighterIds.has(op.id) ? `official_${op.id}` : op.id;
    if (fighterIds.has(fid)) continue;
    discovered.push({ fighter_id: fid, display_name: op.name });
    fighterIds.add(fid);
    knownNames.add(normalizeFighterName(op.name));
  }

  return discovered;
}

/** Numbers 名鑑掲載順 (numbers_fighter_id の並び) を fighter_id → rank の Map にする。 */
export function numbersOrder(numbersFighters, numbersNameMatches) {
  const matchByNumbersId = new Map();
  for (const m of numbersNameMatches) {
    if (m.numbers_fighter_id && !matchByNumbersId.has(m.numbers_fighter_id)) {
      matchByNumbersId.set(m.numbers_fighter_id, m);
    }
  }
  const order = new Map();
  for (const nf of numbersFighters) {
    const match = matchByNumbersId.get(nf.numbers_fighter_id);
    const fid = match?.matched_fighter_id || match?.candidate_fighter_id;
    if (fid && !order.has(fid)) order.set(fid, order.size);
  }
  return order;
}

/** 名鑑掲載順に並べたコピーを返す。名鑑に無い選手は元の並びのまま末尾に置く。 */
export function sortByNumbersOrder(fighters, order) {
  const originalIndex = new Map(fighters.map((f, idx) => [f.fighter_id, idx]));
  return [...fighters].sort((a, b) => {
    const ai = order.has(a.fighter_id) ? order.get(a.fighter_id) : Infinity;
    const bi = order.has(b.fighter_id) ? order.get(b.fighter_id) : Infinity;
    if (ai === Infinity && bi === Infinity) {
      return originalIndex.get(a.fighter_id) - originalIndex.get(b.fighter_id);
    }
    if (ai === Infinity) return 1;
    if (bi === Infinity) return -1;
    return ai - bi;
  });
}
