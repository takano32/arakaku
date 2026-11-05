#!/usr/bin/env node
// 行カーソルの移動先 (ui/list/cursor.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { clampIndex, edgeCursor, nextCursor } from "../../docs/assets/js/ui/list/cursor.js";

const all = () => true;
// 0 と 3 が見出し行
const noHeaders = (i) => i !== 0 && i !== 3;

test("カーソルが無い (-1) とき、下へは先頭、上へは末尾から", () => {
  assert.equal(nextCursor(-1, 1, 5, all), 0);
  assert.equal(nextCursor(-1, -1, 5, all), 4);
});

test("1 行ずつ動き、端では動かない (null)", () => {
  assert.equal(nextCursor(2, 1, 5, all), 3);
  assert.equal(nextCursor(2, -1, 5, all), 1);
  assert.equal(nextCursor(4, 1, 5, all), null);
  assert.equal(nextCursor(0, -1, 5, all), null);
});

test("見出し行は飛ばす", () => {
  assert.equal(nextCursor(-1, 1, 5, noHeaders), 1);
  assert.equal(nextCursor(2, 1, 5, noHeaders), 4);
  assert.equal(nextCursor(4, -1, 5, noHeaders), 2);
  assert.equal(nextCursor(1, -1, 5, noHeaders), null); // 上は見出し行だけ
});

test("空の一覧では動かない", () => {
  assert.equal(nextCursor(-1, 1, 0, all), null);
  assert.equal(nextCursor(-1, -1, 0, all), null);
});

test("g/G は先頭・末尾のカーソルを置ける行", () => {
  assert.equal(edgeCursor("first", 5, all), 0);
  assert.equal(edgeCursor("last", 5, all), 4);
  assert.equal(edgeCursor("first", 5, noHeaders), 1);
  assert.equal(edgeCursor("last", 4, noHeaders), 2);
});

test("置ける行が無いと範囲外の添字を返し、clampIndex で丸める", () => {
  const none = () => false;
  assert.equal(edgeCursor("first", 3, none), 3);
  assert.equal(edgeCursor("last", 3, none), -1);
  assert.equal(clampIndex(3, 3), 2);
  assert.equal(clampIndex(-1, 3), 0);
  assert.equal(clampIndex(1, 3), 1);
});
