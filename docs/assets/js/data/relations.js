import { eventSortDate } from "./event_dates.js";

/**
 * 関係の解決と並べ替え (DataRepository の関係ヘルパから切り出した純関数)。
 * 入力 (索引・配列・検索関数) はすべて引数で受け取るので、手書きの入力で Node からテストできる。
 * 索引の構築とキャッシュ (memo) は DataRepository に残す。
 */

/**
 * エンティティに紐づく動画。linksByEntity は「entity_type \0 entity_id → video_links の行」の索引。
 * 動画が見つからないリンクは捨てる。
 * @returns {{ link: object, video: object }[]}
 */
export function videosForEntity(linksByEntity, type, id, videoById) {
  return (linksByEntity.get(`${type}\0${id}`) ?? [])
    .map(l => ({ link: l, video: videoById(l.video_id) }))
    .filter(i => i.video);
}

/** 大会の試合に紐づく動画の ID の集合。 */
export function videoIdsLinkedToEventBouts(bouts, videoLinks, eventId) {
  const boutIds = new Set(bouts.filter(b => b.event_id === eventId).map(b => b.bout_id));
  return new Set(videoLinks.filter(l => l.entity_type === "bout" && boutIds.has(l.entity_id)).map(l => l.video_id));
}

/** 戦績スナップショットを大会の新しい順に並べた新しい配列 (同じ日付なら event_id の降順)。 */
export function sortSnapshotsByEvent(snapshots, findEvent) {
  return [...snapshots]
    .sort((a, b) => eventSortDate(findEvent(b.event_id)).localeCompare(eventSortDate(findEvent(a.event_id)), "ja")
      || String(b.event_id ?? "").localeCompare(String(a.event_id ?? ""), "ja"));
}

/** 大会を新しい順に並べた新しい配列 (同じ日付なら興行番号の大きい順)。 */
export function sortEventsNewestFirst(events) {
  return [...events]
    .sort((a, b) => eventSortDate(b).localeCompare(eventSortDate(a), "ja") || (b.event_number ?? 0) - (a.event_number ?? 0));
}

/** 言及を種別ごとに数える。types に無い種別は数えない (types の種別はすべて 0 から)。 */
export function countMentionTypes(mentions, types) {
  const counts = Object.fromEntries(types.map(t => [t, 0]));
  for (const m of mentions) {
    if (m.mention_type in counts) counts[m.mention_type]++;
  }
  return counts;
}

/** 試合順の昇順 (第1試合 → メインイベント) に並べた新しい配列。 */
export function boutsInOrder(bouts) {
  return [...bouts].sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));
}

/** ids (統合された選手 ID の集合) のどれかが出た試合。 */
export function boutsForFighterIds(bouts, ids) {
  return bouts.filter(b => (b.fighters ?? []).some(f => ids.has(f.fighter_id)));
}
