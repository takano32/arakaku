#!/usr/bin/env node
// 関係の解決と並べ替え (data/relations.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import {
  boutsForFighterIds,
  boutsInOrder,
  countMentionTypes,
  sortEventsNewestFirst,
  sortSnapshotsByEvent,
  videoIdsLinkedToEventBouts,
  videosForEntity,
} from "../../docs/assets/js/data/relations.js";

test("エンティティの動画は索引から引き、見つからない動画は捨てる", () => {
  const l1 = { entity_type: "fighter", entity_id: "a", video_id: "v1" };
  const l2 = { entity_type: "fighter", entity_id: "a", video_id: "missing" };
  const index = new Map([["fighter\0a", [l1, l2]]]);
  const videos = { v1: { video_id: "v1" } };
  assert.deepEqual(videosForEntity(index, "fighter", "a", (id) => videos[id]), [{ link: l1, video: videos.v1 }]);
  assert.deepEqual(videosForEntity(index, "fighter", "b", (id) => videos[id]), []);
});

test("大会の試合に紐づく動画の ID だけを集める", () => {
  const bouts = [{ bout_id: "b1", event_id: "e1" }, { bout_id: "b2", event_id: "e2" }];
  const links = [
    { entity_type: "bout", entity_id: "b1", video_id: "v1" },
    { entity_type: "bout", entity_id: "b2", video_id: "v2" },
    { entity_type: "event", entity_id: "e1", video_id: "v3" },
    { entity_type: "bout", entity_id: "b1", video_id: "v1" },
  ];
  assert.deepEqual([...videoIdsLinkedToEventBouts(bouts, links, "e1")], ["v1"]);
  assert.equal(videoIdsLinkedToEventBouts(bouts, links, "none").size, 0);
});

test("スナップショットは大会の新しい順、同じ日付なら event_id の降順、元の配列は変えない", () => {
  const events = { e1: { published_at: "2024-01-01" }, e2: { result_published_at: "2025-01-01" }, e3: { published_at: "2024-01-01" } };
  const snaps = [{ event_id: "e1" }, { event_id: "e2" }, { event_id: "e3" }, { event_id: "unknown" }];
  const sorted = sortSnapshotsByEvent(snaps, (id) => events[id]);
  assert.deepEqual(sorted.map((s) => s.event_id), ["e2", "e3", "e1", "unknown"]);
  assert.deepEqual(snaps.map((s) => s.event_id), ["e1", "e2", "e3", "unknown"]);
});

test("大会は新しい順、同じ日付なら興行番号の大きい順", () => {
  const events = [
    { event_id: "a", published_at: "2024-01-01", event_number: 1 },
    { event_id: "b", published_at: "2024-01-01", event_number: 3 },
    { event_id: "c", published_at: "2025-01-01" },
    { event_id: "d" },
  ];
  assert.deepEqual(sortEventsNewestFirst(events).map((e) => e.event_id), ["c", "b", "a", "d"]);
  assert.equal(events[0].event_id, "a");
});

test("言及の種別は types のものだけを 0 から数える", () => {
  const mentions = [{ mention_type: "event" }, { mention_type: "event" }, { mention_type: "other" }];
  assert.deepEqual(countMentionTypes(mentions, ["event", "result"]), { event: 2, result: 0 });
  assert.deepEqual(countMentionTypes([], []), {});
});

test("試合順の昇順で、番号の無い試合は 0 扱い、元の配列は変えない", () => {
  const bouts = [{ bout_id: "x", bout_order: 3 }, { bout_id: "y" }, { bout_id: "z", bout_order: 1 }];
  assert.deepEqual(boutsInOrder(bouts).map((b) => b.bout_id), ["y", "z", "x"]);
  assert.equal(bouts[0].bout_id, "x");
});

test("統合された選手 ID のどれかが出た試合", () => {
  const bouts = [
    { bout_id: "1", fighters: [{ fighter_id: "a" }, { fighter_id: "b" }] },
    { bout_id: "2", fighters: [{ fighter_id: "c" }] },
    { bout_id: "3" },
    { bout_id: "4", fighters: [{ fighter_id: "a2" }] },
  ];
  assert.deepEqual(boutsForFighterIds(bouts, new Set(["a", "a2"])).map((b) => b.bout_id), ["1", "4"]);
});
