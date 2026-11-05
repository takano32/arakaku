#!/usr/bin/env node
// セクション共通のヘルパ (ui/sections/common.js) と、SECTIONS の全タブが手書きデータで描けることを確かめる
// (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { PUBLIC_TABS, ADMIN_TABS } from "../../docs/assets/js/config.js";
import { code, focusedOrFiltered } from "../../docs/assets/js/ui/sections/common.js";
import { SECTIONS } from "../../docs/assets/js/ui/sections/index.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

test("code は値を <code> で囲んでエスケープし、空なら何も出さない", () => {
  assert.equal(code("a<b"), "<code>a&lt;b</code>");
  assert.equal(code(""), "");
  assert.equal(code(null), "");
});

test("focusedOrFiltered はフォーカス中はその 1 件 (無ければ 0 件)、それ以外は絞り込み", () => {
  const records = [{ id: "a" }, { id: "b" }];
  const find = (id) => records.find((r) => r.id === id);
  assert.deepEqual(focusedOrFiltered("b", find, records, () => false), [{ id: "b" }]);
  assert.deepEqual(focusedOrFiltered("x", find, records, () => true), []);
  assert.deepEqual(focusedOrFiltered("", find, records, (r) => r.id === "a"), [{ id: "a" }]);
});

test("SECTIONS のキーはタブの ID と一致し、各タブの行は一意のキーで例外なく描ける", (t) => {
  assert.deepEqual(Object.keys(SECTIONS).sort(), [...PUBLIC_TABS, ...ADMIN_TABS].map(([id]) => id).sort());
  const errors = [];
  t.mock.method(console, "error", (...args) => errors.push(args));
  for (const [id, section] of Object.entries(SECTIONS)) {
    assert.equal(section.id, id);
    const desc = section.build(sectionCtx());
    const keys = keysOf(desc);
    assert.ok(keys.length > 0, `${id}: rows`);
    assert.equal(new Set(keys).size, keys.length, `${id}: unique keys`);
    for (const item of desc.items) {
      assert.equal(typeof desc.renderHead(item), "string");
      if (!desc.isHeader?.(item)) assert.equal(typeof desc.renderBody(item), "string");
    }
  }
  assert.deepEqual(errors, []);
});
