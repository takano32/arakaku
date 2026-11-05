#!/usr/bin/env node
// 段階描画の件数と状態行 (ui/list/paging.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { initialCount, keysUnchanged, moreLabel, nextEnd, refreshTarget, statusText } from "../../docs/assets/js/ui/list/paging.js";

test("最初は chunk 件、一覧が短ければ全件", () => {
  assert.equal(initialCount(100, 30), 30);
  assert.equal(initialCount(5, 30), 5);
  assert.equal(initialCount(0, 30), 0);
});

test("refresh は描画済み件数 (最低 chunk) を保ち、一覧の件数を超えない", () => {
  assert.equal(refreshTarget(90, 30, 200), 90);
  assert.equal(refreshTarget(0, 30, 200), 30);
  assert.equal(refreshTarget(90, 30, 40), 40);
  assert.equal(refreshTarget(0, 30, 0), 0);
});

test("キー列が同じかどうかは、描画済みの行数と先頭 target 件のキーで決まる", () => {
  const keyOf = (x) => x.id;
  const rows = [{ key: "a" }, { key: "b" }];
  assert.equal(keysUnchanged(rows, [{ id: "a" }, { id: "b" }, { id: "c" }], keyOf, 2), true);
  assert.equal(keysUnchanged(rows, [{ id: "a" }, { id: "x" }], keyOf, 2), false);
  assert.equal(keysUnchanged(rows, [{ id: "a" }, { id: "b" }, { id: "c" }], keyOf, 3), false); // 行が足りない
  assert.equal(keysUnchanged([], [], keyOf, 0), true);
});

test("さらに表示の終わりは一覧の件数で止まる", () => {
  assert.equal(nextEnd(30, 30, 100), 60);
  assert.equal(nextEnd(90, 30, 100), 100);
  assert.equal(nextEnd(100, 30, 100), 100);
});

test("状態行は 0 件のときだけ出し、読み込み中かどうかで文言を変える", () => {
  assert.deepEqual(statusText({ count: 3, loading: true, emptyMessage: "なし" }), { hidden: true });
  assert.deepEqual(statusText({ count: 0, loading: true, emptyMessage: "なし" }), { hidden: false, text: "読み込み中…", isLoading: true });
  assert.deepEqual(statusText({ count: 0, loading: false, emptyMessage: "なし" }), { hidden: false, text: "なし", isLoading: false });
});

test("さらに表示ボタンの文言は残りの件数を含む", () => {
  assert.equal(moreLabel(12), "さらに表示（残り 12 件）");
});
