#!/usr/bin/env node
// 王座の歴代補完 (inferLineageEvents) と表示名 (titleDisplayName) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { enrichTitle, inferLineageEvents, titleDisplayName } from "../../docs/assets/js/data/title_lineage.js";

test("次代の獲得大会を前代の喪失大会に、前代の喪失大会を次代の獲得大会に補う", () => {
  const out = inferLineageEvents([
    { order: 1, won_at_event_id: "e1" },
    { order: 2, won_at_event_id: "e2" },
    { order: 3, lost_at_event_id: "e4" },
    { order: 4 },
  ]);
  assert.deepEqual(out.map((r) => [r.won_at_event_id ?? null, r.lost_at_event_id ?? null]), [
    ["e1", "e2"],
    ["e2", null],
    [null, "e4"],
    ["e4", null],
  ]);
});

test("返上 (vacated) した代には次代の獲得大会を喪失大会として入れない", () => {
  const out = inferLineageEvents([
    { order: 1, won_at_event_id: "e1", end_reason: "vacated" },
    { order: 2, won_at_event_id: "e3" },
  ]);
  assert.equal(out[0].lost_at_event_id, undefined);
  assert.equal(out[1].won_at_event_id, "e3");
});

test("明示された大会は上書きしない", () => {
  const out = inferLineageEvents([
    { order: 1, won_at_event_id: "e1", lost_at_event_id: "e9" },
    { order: 2, won_at_event_id: "e2" },
  ]);
  assert.equal(out[0].lost_at_event_id, "e9");
});

test("入力の配列・オブジェクトは変更しない (コピーを返す)", () => {
  const lineage = [{ order: 1 }, { order: 2, won_at_event_id: "e2" }];
  const out = inferLineageEvents(lineage);
  assert.equal(lineage[0].lost_at_event_id, undefined);
  assert.notEqual(out, lineage);
  assert.notEqual(out[0], lineage[0]);
  assert.deepEqual(inferLineageEvents(undefined), []);
  assert.deepEqual(inferLineageEvents([]), []);
});

test("enrichTitle は lineage だけ差し替えた王座のコピーを返す", () => {
  const title = { title_id: "t", promotion_id: "target", division: "ライト級", lineage: [{ order: 1 }, { order: 2, won_at_event_id: "e2" }] };
  const rich = enrichTitle(title);
  assert.equal(rich.lineage[0].lost_at_event_id, "e2");
  assert.equal(title.lineage[0].lost_at_event_id, undefined);
  assert.equal(rich.title_id, "t");
});

test("表示名: 王座 / トーナメント / MAXバウト / 階級未設定", () => {
  assert.equal(titleDisplayName({ title_id: "target-lightweight", promotion_id: "target", division: "ライト級" }, "ターゲット"), "ターゲット ライト級王座");
  assert.equal(titleDisplayName({ title_id: "max-bout-tournament-middle", promotion_id: "max_bout", division: "ミドル級" }, "MAXバウト"), "MAXバウト ミドル級トーナメント");
  assert.equal(titleDisplayName({ title_id: "max-bout-middle", promotion_id: "max_bout", division: "ミドル級" }, "MAXバウト"), "MAXバウト ミドル級");
  assert.equal(titleDisplayName({ title_id: "x", promotion_id: "emperor" }, "エンペラー"), "エンペラー 階級未設定王座");
});
