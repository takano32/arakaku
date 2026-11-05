#!/usr/bin/env node
// 団体タブ (ui/sections/promotions.js) の build() を手書きデータで確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { promotionsSection } from "../../docs/assets/js/ui/sections/promotions.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => promotionsSection.build(sectionCtx(state));

test("団体を一意のキーで出し、検索と区分で選ぶ", () => {
  assert.deepEqual(keysOf(build()), ["target", "emperor"]);
  assert.deepEqual(keysOf(build({ query: "TARGET" })), ["target"]);
  assert.deepEqual(keysOf(build({ promotionCategory: "minor" })), ["emperor"]);
  assert.deepEqual(keysOf(build({ query: "zzzz" })), []);
});

test("head に区分のラベルとルール、大会数 (名鑑だけの大会を含む)", () => {
  const desc = build({ query: "TARGET" });
  const [promotion] = desc.items;
  assert.equal(desc.rowClass(promotion), "rec-promotion");
  const head = desc.renderHead(promotion);
  assert.match(head, /<span class="nick">TARGET<\/span>/);
  assert.match(head, /主要 \/ 1R5分3R \/ リング/);
  assert.match(head, /大会 2/);
});

test("body に大会・王座・動画", () => {
  const desc = build({ query: "TARGET" });
  const body = desc.renderBody(desc.items[0]);
  assert.match(body, /大会（2）/);
  assert.match(body, /ターゲット ライト級王座/);
  assert.match(body, /data-yt-id="CCC"/);
});
