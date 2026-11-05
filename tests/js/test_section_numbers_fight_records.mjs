#!/usr/bin/env node
// 管理ビュー「名鑑記録」(ui/sections/numbers_fight_records.js) の build() を確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { numbersFightRecordsSection } from "../../docs/assets/js/ui/sections/numbers_fight_records.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => numbersFightRecordsSection.build(sectionCtx(state));

test("個人成績を出し、検索と団体で選ぶ", () => {
  assert.deepEqual(keysOf(build()), ["nr_001", "nr_002"]);
  assert.deepEqual(keysOf(build({ query: "nr_002" })), ["nr_002"]);
  assert.deepEqual(keysOf(build({ nrPromotion: "emperor" })), []);
  assert.deepEqual(keysOf(build({ nrPromotion: "target" })), ["nr_001", "nr_002"]);
});

test("head に対戦・回数・結果、body に原文と ID", () => {
  const desc = build({ query: "nr_001" });
  const [record] = desc.items;
  assert.equal(desc.rowClass(record), "rec-src-numbers");
  const head = desc.renderHead(record);
  assert.match(head, /かべい <span class="vs">vs<\/span> コルト・アプロー/);
  assert.match(head, /ライト級 \/ target \/ 第2回 \/ ワンマッチ/);
  assert.match(head, /○ win/);
  const body = desc.renderBody(record);
  assert.match(body, /<p class="pre-line">1R KO<\/p>/);
  assert.match(body, /<code>nf_002<\/code>/);
});
