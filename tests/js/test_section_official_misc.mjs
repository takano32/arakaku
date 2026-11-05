#!/usr/bin/env node
// 管理ビュー「公式」(ui/sections/official_misc.js) の build() を確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { officialMiscSection } from "../../docs/assets/js/ui/sections/official_misc.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => officialMiscSection.build(sectionCtx(state));

test("トーナメント・試合・沿革を種類ごとのキーで出し、文字列と数値の項目で検索する", () => {
  const desc = build();
  assert.deepEqual(keysOf(desc), ["t:emperor-light", "m:match-001", "h:0"]);
  assert.ok(desc.items.every((item) => desc.rowClass(item) === "rec-src-official"));
  assert.deepEqual(keysOf(build({ query: "1995" })), ["m:match-001", "h:0"]); // 数値の year にも当たる
  assert.deepEqual(keysOf(build({ query: "準優勝" })), []); // ラベルは検索しない
});

test("トーナメントの head に優勝・準優勝", () => {
  const desc = build({ query: "エンペラー" });
  assert.match(desc.renderHead(desc.items[0]), /2024-06-01 \/ 優勝: アイス・トロン \/ 準優勝: コルト・アプロー/);
  assert.match(desc.renderBody(desc.items[0]), /<code>BBB<\/code>/);
});

test("試合と沿革は「note と合わない」と注記する", () => {
  const desc = build({ query: "1995" });
  for (const item of desc.items) {
    assert.match(desc.renderHead(item), /note と合わない/);
    assert.match(desc.renderBody(item), /仮のデータの可能性があります/);
  }
  assert.match(desc.renderHead(desc.items[1]), /1995 \/ 創世期 \/ 春</);
});

test("足した種類名とキー (_type・_key) では検索しない", () => {
  for (const query of ["tournament", "history", "h:0", "t:emperor"]) {
    assert.equal(build({ query }).items.length, 0, query);
  }
});
