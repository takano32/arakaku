#!/usr/bin/env node
// 行の開閉の記憶 (ui/list/open_state.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { OpenState } from "../../docs/assets/js/ui/list/open_state.js";

test("覚えていない行は fallback の値で、覚えた行はその値", () => {
  const s = new OpenState();
  assert.equal(s.isOpen("a", () => true), true);
  assert.equal(s.isOpen("a", () => false), false);
  s.set("a", false);
  assert.equal(s.isOpen("a", () => true), false);
});

test("fallback は覚えていないときだけ呼ぶ", () => {
  const s = new OpenState();
  let calls = 0;
  const fallback = () => { calls += 1; return false; };
  s.isOpen("a", fallback);
  s.set("a", true);
  s.isOpen("a", fallback);
  assert.equal(calls, 1);
});

test("toggle は今の値を反転して覚え、force があればその値にする", () => {
  const s = new OpenState();
  assert.equal(s.toggle("a", () => true), false); // 既定で開いている行を閉じる
  assert.equal(s.isOpen("a", () => true), false);
  assert.equal(s.toggle("a", () => true), true);
  assert.equal(s.toggle("a", () => false, true), true);
  assert.equal(s.toggle("a", () => false, false), false);
});
