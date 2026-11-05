#!/usr/bin/env node
// UI 状態 (app/state.js の Store) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { ADMIN_TABS, DEFAULT_TAB } from "../../docs/assets/js/config.js";
import { FILTER_STATE_KEYS } from "../../docs/assets/js/data/filters.js";
import { Store } from "../../docs/assets/js/app/state.js";

test("初期値: 既定のタブ、検索語・フォーカス・すべての絞り込みは空", () => {
  const s = new Store();
  assert.equal(s.tab, DEFAULT_TAB);
  assert.equal(s.query, "");
  assert.equal(s.mentionType, "");
  for (const key of FILTER_STATE_KEYS) assert.equal(s[key], "", key);
  assert.ok(s.loadedDataKeys instanceof Set);
});

test("patch は値を反映して購読者に通知し、空の patch でも通知する", () => {
  const s = new Store();
  const seen = [];
  const unsubscribe = s.subscribe((state) => seen.push(state.query));
  s.patch({ query: "かべい" });
  s.patch({});
  assert.deepEqual(seen, ["かべい", "かべい"]);
  unsubscribe();
  s.patch({ query: "x" });
  assert.equal(seen.length, 2);
});

test("viewMode はタブから導く (管理タブなら admin)", () => {
  const s = new Store();
  assert.equal(s.viewMode, "public");
  s.patch({ tab: ADMIN_TABS[0][0] });
  assert.equal(s.viewMode, "admin");
  s.patch({ tab: "bogus" });
  assert.equal(s.viewMode, "public");
});

test("hasFocus はどれかの飛び先があるとき真で、clearFocus で消える", () => {
  const s = new Store();
  assert.equal(s.hasFocus, false);
  for (const key of ["focusFighterId", "focusEventId", "focusBoutId"]) {
    s.patch({ [key]: "x" });
    assert.equal(s.hasFocus, true, key);
    s.clearFocus();
    assert.equal(s.hasFocus, false, key);
  }
});
