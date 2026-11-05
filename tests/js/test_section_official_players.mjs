#!/usr/bin/env node
// 管理ビュー「公式選手」(ui/sections/official_players.js) の build() を確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { officialPlayersSection } from "../../docs/assets/js/ui/sections/official_players.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => officialPlayersSection.build(sectionCtx(state));

test("公式選手を出し、検索と (団体名から引いた) 団体で選ぶ", () => {
  assert.deepEqual(keysOf(build()), ["aisu-toron", "kabei"]);
  assert.deepEqual(keysOf(build({ query: "ミスター" })), ["aisu-toron"]);
  assert.deepEqual(keysOf(build({ opPromotion: "target" })), ["kabei"]);
  assert.deepEqual(keysOf(build({ opDivision: "heavyweight" })), []);
});

test("head に通り名・階級・戦績、body に詳細", () => {
  const desc = build({ query: "ミスター" });
  const [player] = desc.items;
  assert.equal(desc.rowClass(player), "rec-src-official");
  const head = desc.renderHead(player);
  assert.match(head, /「ミスターエンペラー」/);
  assert.match(head, /ライト級 \/ エンペラー \/ 外国/);
  assert.match(head, /45勝 14敗/);
  const body = desc.renderBody(player);
  assert.match(body, /<p class="summary">エンペラーの王者<\/p>/);
  assert.match(body, /<code>aisu-toron<\/code>/);
});
