import { normalizeFighterName } from "./names.js";

/**
 * 表記ゆれだけが異なる重複選手 (例: 「ビル・ジャガー」と「ビルジャガー」) を 1 人に統合する (純関数)。
 * 関連グラフ (試合/動画/記事) を保持する canonical 行を survivor とし、
 * 他行の numbers/official データ・動画/記事 ID・別名を吸収する。統合された fighter_id は
 * `merged_fighter_ids` と aliasIndex (fighter_id → survivor) で survivor に解決できる。
 * 団体が矛盾する組は誤統合を避けて統合しない。
 *
 * @param {object[]} fighters   enrich 済みの選手 (統合しない行はその場で merged_fighter_ids を付ける。統合する組は複製する)
 * @param {Set<string>} canonicalIds fighters.csv にある fighter_id
 * @returns {{ survivors: object[], aliasIndex: Map<string, object> }}
 */
export function mergeDuplicateFighters(fighters, canonicalIds) {
  const groups = new Map();
  for (const f of fighters) {
    const key = normalizeFighterName(f.display_name);
    (groups.get(key) ?? groups.set(key, []).get(key)).push(f);
  }

  const aliasIndex = new Map();
  const survivors = [];
  for (const group of groups.values()) {
    const promotions = new Set(group.map(f => f.main_promotion_id).filter(Boolean));
    // 1 人だけ、または団体が矛盾する組は統合しない
    if (group.length === 1 || promotions.size > 1) {
      for (const f of group) {
        f.merged_fighter_ids = [f.fighter_id];
        aliasIndex.set(f.fighter_id, f);
        survivors.push(f);
      }
      continue;
    }
    survivors.push(mergeFighterGroup(group, canonicalIds, aliasIndex));
  }
  return { survivors, aliasIndex };
}

function mergeFighterGroup(group, canonicalIds, aliasIndex) {
  const relCount = f => (f.inferred_from_video_ids?.length ?? 0) + (f.source_article_ids?.length ?? 0);
  // survivor: canonical 優先 → 関連が多い → 名鑑あり
  const [primary, ...rest] = [...group].sort((a, b) =>
    (canonicalIds.has(b.fighter_id) - canonicalIds.has(a.fighter_id)) ||
    (relCount(b) - relCount(a)) ||
    ((b.numbers_data ? 1 : 0) - (a.numbers_data ? 1 : 0))
  );

  const survivor = { ...primary, profile: { ...(primary.profile ?? {}) } };
  const union = (a, b) => [...new Set([...(a ?? []), ...(b ?? [])])];
  for (const other of rest) {
    survivor.numbers_data ??= other.numbers_data;
    survivor.official_data ??= other.official_data;
    survivor.summary ||= other.summary;
    survivor.main_division ||= other.main_division;
    survivor.main_promotion_id ||= other.main_promotion_id;
    survivor.inferred_from_video_ids = union(survivor.inferred_from_video_ids, other.inferred_from_video_ids);
    survivor.source_article_ids = union(survivor.source_article_ids, other.source_article_ids);
    survivor.aliases = union(survivor.aliases, [...(other.aliases ?? []), other.display_name]);
    for (const [k, v] of Object.entries(other.profile ?? {})) survivor.profile[k] ??= v;
  }
  survivor.aliases = (survivor.aliases ?? []).filter(a => a && a !== survivor.display_name);
  survivor.merged_fighter_ids = group.map(f => f.fighter_id);

  for (const member of group) aliasIndex.set(member.fighter_id, survivor);
  aliasIndex.set(survivor.fighter_id, survivor);
  return survivor;
}
