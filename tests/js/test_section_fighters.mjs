#!/usr/bin/env node
// 選手タブ (ui/sections/fighters.js) の build() を手書きデータで確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { fightersSection } from "../../docs/assets/js/ui/sections/fighters.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => fightersSection.build(sectionCtx(state));

test("表記ゆれの重複は 1 人に統合して出す", () => {
  const keys = keysOf(build());
  assert.deepEqual([...keys].sort(), ["colt_apro", "ice_tron", "kabei"]);
  assert.equal(new Set(keys).size, keys.length);
});

test("検索・絞り込み・フォーカスで選ぶ", () => {
  assert.deepEqual(keysOf(build({ query: "かべい" })), ["kabei"]);
  assert.deepEqual(keysOf(build({ query: "カベイ" })), ["kabei"]); // ひらがな・カタカナを揃える
  assert.deepEqual(keysOf(build({ fighterPromotion: "target" })), ["kabei"]);
  assert.deepEqual(keysOf(build({ focusFighterId: "ice_tron_2" })), ["ice_tron"]); // 統合された ID でも引ける
  assert.deepEqual(keysOf(build({ focusFighterId: "bogus" })), []);
});

test("行のクラス、head の戦績と登録試合数", () => {
  const desc = build({ focusFighterId: "kabei" });
  const [fighter] = desc.items;
  assert.equal(desc.rowClass(fighter), "rec-fighter");
  const head = desc.renderHead(fighter);
  assert.match(head, /<span class="name">かべい<\/span>/);
  assert.match(head, /6戦 5勝 1敗/);
  assert.match(head, /登録試合 3/);
});

test("body に関連試合と統合した ID", () => {
  const desc = build({ focusFighterId: "ice_tron" });
  const body = desc.renderBody(desc.items[0]);
  assert.match(body, /関連試合（2）/);
  assert.match(body, /<code>ice_tron<\/code>, <code>ice_tron_2<\/code>|<code>ice_tron<\/code>.*<code>ice_tron_2<\/code>/s);
});
