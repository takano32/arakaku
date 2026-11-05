#!/usr/bin/env node
// 検索欄の配線 (ui/search_box.js の SearchBox) のユニットテスト。DOM の代わりに小さな偽の入力欄とボタンを渡し、
// タイマーは node:test の mock で進める (依存ゼロ)。
import test from "node:test";
import assert from "node:assert/strict";

import { SearchBox } from "../../docs/assets/js/ui/search_box.js";

function fakeElement(props = {}) {
  const listeners = new Map();
  return {
    ...props,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    fire(type, event = {}) {
      for (const fn of listeners.get(type) ?? []) fn({ target: this, ...event });
    },
  };
}

function setup() {
  const input = fakeElement({ value: "" });
  const clearButton = fakeElement({ hidden: true });
  const searches = [];
  let clears = 0;
  const box = new SearchBox({ input, clearButton });
  box.bind({ onSearch: (value) => searches.push(value), onClear: () => { clears += 1; } });
  const type = (value, event = {}) => {
    input.value = value;
    input.fire("input", event);
  };
  return { box, input, clearButton, searches, clears: () => clears, type };
}

test("入力は 150ms 待ってから最後の値で 1 回だけ検索し、✕ は値があるときだけ出す", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { clearButton, searches, type } = setup();
  type("か");
  assert.equal(clearButton.hidden, false);
  t.mock.timers.tick(100);
  type("かべ");
  t.mock.timers.tick(149);
  assert.deepEqual(searches, []);
  t.mock.timers.tick(1);
  assert.deepEqual(searches, ["かべ"]);
  type("");
  assert.equal(clearButton.hidden, true);
  t.mock.timers.tick(150);
  assert.deepEqual(searches, ["かべ", ""]);
});

test("変換中 (isComposing) の入力では検索せず、確定 (compositionend) で検索する", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { input, clearButton, searches, type } = setup();
  type("かべ", { isComposing: true });
  t.mock.timers.tick(500);
  assert.deepEqual(searches, []);
  assert.equal(clearButton.hidden, true);
  input.value = "壁";
  input.fire("compositionend");
  t.mock.timers.tick(150);
  assert.deepEqual(searches, ["壁"]);
});

test("cancelPending は待っている検索を取り消す", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { box, searches, type } = setup();
  type("かべ");
  box.cancelPending();
  t.mock.timers.tick(500);
  assert.deepEqual(searches, []);
});

test("Esc と ✕ は onClear を呼び、setValue はイベントを出さずに欄と ✕ を合わせる", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { box, input, clearButton, searches, clears } = setup();
  input.fire("keydown", { key: "Escape" });
  input.fire("keydown", { key: "a" });
  clearButton.fire("click");
  assert.equal(clears(), 2);
  box.setValue("かべい");
  assert.equal(input.value, "かべい");
  assert.equal(clearButton.hidden, false);
  t.mock.timers.tick(500);
  assert.deepEqual(searches, []);
});
