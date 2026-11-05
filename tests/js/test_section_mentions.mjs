#!/usr/bin/env node
// 管理ビュー「出典言及」(ui/sections/mentions.js) の build() を確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { mentionsSection } from "../../docs/assets/js/ui/sections/mentions.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => mentionsSection.build(sectionCtx(state));

test("言及を新しい順で出し、種別と検索で選ぶ", () => {
  assert.deepEqual(keysOf(build()), ["m4", "m3", "m2", "m1"]);
  assert.deepEqual(keysOf(build({ mentionType: "matchup" })), ["m3"]);
  assert.deepEqual(keysOf(build({ query: "1R KO" })), ["m2"]);
  assert.deepEqual(keysOf(build({ mentionType: "bogus" })), []);
});

test("head に種別のラベルと手がかり、確度", () => {
  const desc = build({ mentionType: "matchup" });
  const [mention] = desc.items;
  assert.equal(desc.rowClass(mention), "rec-mention");
  const head = desc.renderHead(mention);
  assert.match(head, /対戦カード<\/span> アイス・トロン vs コルト・アプロー/);
  assert.match(head, /候補 low/);
});

test("body に本文と ID", () => {
  const desc = build({ mentionType: "matchup" });
  const body = desc.renderBody(desc.items[0]);
  assert.match(body, /<code>m3<\/code>/);
  assert.match(body, /<code>note:note-emperor<\/code>/);
});
