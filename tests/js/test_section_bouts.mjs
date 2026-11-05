#!/usr/bin/env node
// 試合タブ (ui/sections/bouts.js) の build() を手書きデータで確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { boutsSection } from "../../docs/assets/js/ui/sections/bouts.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => boutsSection.build(sectionCtx(state));

test("全試合 (名鑑だけの試合を含む) を一意のキーで出す", () => {
  const keys = keysOf(build());
  assert.deepEqual([...keys].sort(), ["emperor-lightweight-gp-01", "numbers-target-2--colt_apro--kabei", "target-1-01", "target-1-02"]);
  assert.equal(new Set(keys).size, keys.length);
});

test("検索・絞り込み・フォーカスで選ぶ", () => {
  assert.deepEqual(keysOf(build({ query: "エンペラーライト級GP" })), ["emperor-lightweight-gp-01"]);
  assert.deepEqual(keysOf(build({ boutPromotion: "emperor" })), ["emperor-lightweight-gp-01"]);
  assert.deepEqual(keysOf(build({ focusBoutId: "target-1-01", query: "エンペラー" })), ["target-1-01"]); // フォーカスは検索より優先
  assert.deepEqual(keysOf(build({ focusBoutId: "bogus" })), []);
});

test("勝敗未入力の行は rec-unknown を足す", () => {
  const desc = build({ focusBoutId: "target-1-02" });
  assert.equal(desc.rowClass(desc.items[0]), "rec-bout rec-unknown");
  const known = build({ focusBoutId: "target-1-01" });
  assert.equal(known.rowClass(known.items[0]), "rec-bout");
});

test("head に大会へのリンクと決着、body に動画と出典候補", () => {
  const desc = build({ focusBoutId: "target-1-01" });
  const [bout] = desc.items;
  const head = desc.renderHead(bout);
  assert.match(head, /data-event-id="target-1"/);
  assert.match(head, /<span class="result-line">1R 1:00 KO<\/span>/);
  const body = desc.renderBody(bout);
  assert.match(body, /data-yt-id="AAA"/);
  assert.match(body, /出典候補 <span class="fold-count">1件<\/span>/);
});

test("王座戦は head に王座戦のバッジ、body に王座へのリンク", () => {
  const desc = build({ focusBoutId: "target-1-02" });
  const [bout] = desc.items;
  assert.match(desc.renderHead(bout), /王座戦/);
  assert.match(desc.renderBody(bout), /<a href="\?tab=titles&title_promo=target">ターゲット ライト級王座<\/a>/);
});

test("名鑑だけの試合は「名鑑のみ」のバッジを出す", () => {
  const desc = build({ focusBoutId: "numbers-target-2--colt_apro--kabei" });
  assert.match(desc.renderHead(desc.items[0]), /名鑑のみ/);
});
