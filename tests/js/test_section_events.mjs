#!/usr/bin/env node
// 大会タブ (ui/sections/events.js) の build() を手書きデータで確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { eventsSection } from "../../docs/assets/js/ui/sections/events.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => eventsSection.build(sectionCtx(state));

test("名鑑だけの大会を含めて一意のキーで出す", () => {
  const keys = keysOf(build());
  assert.deepEqual([...keys].sort(), ["emperor-lightweight-gp", "numbers-target-2", "target-1"]);
  assert.equal(new Set(keys).size, keys.length);
});

test("検索・絞り込み・フォーカスで選ぶ", () => {
  assert.deepEqual(keysOf(build({ query: "GP" })), ["emperor-lightweight-gp"]);
  assert.deepEqual(keysOf(build({ eventType: "tournament" })), ["emperor-lightweight-gp"]);
  assert.deepEqual(keysOf(build({ focusEventId: "numbers-target-2" })), ["numbers-target-2"]);
  assert.deepEqual(keysOf(build({ focusEventId: "bogus" })), []);
});

test("head に団体・日付・種別と試合数、公式の優勝者", () => {
  const desc = build({ focusEventId: "emperor-lightweight-gp" });
  const [event] = desc.items;
  assert.equal(desc.rowClass(event), "rec-event");
  const head = desc.renderHead(event);
  assert.match(head, /エンペラー \/ 2024-06-01 \/ トーナメント/);
  assert.match(head, /優勝 アイス・トロン/);
  assert.match(head, /1試合/);
});

test("body に試合・動画・出典候補", () => {
  const desc = build({ focusEventId: "target-1" });
  const body = desc.renderBody(desc.items[0]);
  assert.match(body, /試合（2）/);
  assert.match(body, /data-yt-id="AAA"/); // 大会の試合に紐づく動画
  assert.match(body, /出典候補/);
});
