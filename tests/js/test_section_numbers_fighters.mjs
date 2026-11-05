#!/usr/bin/env node
// 管理ビュー「名鑑選手」(ui/sections/numbers_fighters.js) の build() を確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { numbersFightersSection } from "../../docs/assets/js/ui/sections/numbers_fighters.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => numbersFightersSection.build(sectionCtx(state));

test("名鑑の選手を掲載順で出し、検索と団体で選ぶ", () => {
  assert.deepEqual(keysOf(build()), ["nf_001", "nf_002"]);
  assert.deepEqual(keysOf(build({ query: "申し子" })), ["nf_001"]);
  assert.deepEqual(keysOf(build({ nfPromotion: "emperor" })), ["nf_002"]);
  assert.deepEqual(keysOf(build({ nfDivision: "heavyweight" })), []);
});

test("head に戦績、body に実績と出典の行", () => {
  const desc = build({ query: "申し子" });
  const [fighter] = desc.items;
  assert.equal(desc.rowClass(fighter), "rec-src-numbers");
  assert.match(desc.renderHead(fighter), /6戦 5勝 1敗/);
  const body = desc.renderBody(fighter);
  assert.match(body, /白グローブ 2回/);
  assert.match(body, /出場 第1回/);
  assert.match(body, /全体 \/ 行3/);
});
