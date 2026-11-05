#!/usr/bin/env node
// キーから操作を決める表 (ui/keyboard.js の keyToAction) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { PUBLIC_TABS } from "../../docs/assets/js/config.js";
import { keyToAction } from "../../docs/assets/js/ui/keyboard.js";

const name = (input) => keyToAction(input)?.name ?? null;

test("行カーソル・開閉・タブ移動・再読み込みなどは既定動作を止めて呼ぶ", () => {
  const expected = {
    j: "cursorDown", ArrowDown: "cursorDown", k: "cursorUp", ArrowUp: "cursorUp",
    g: "cursorFirst", G: "cursorLast", Enter: "toggleRow", o: "toggleDetails",
    h: "prevTab", ArrowLeft: "prevTab", l: "nextTab", ArrowRight: "nextTab",
    c: "copyUrl", r: "reload", "/": "focusSearch", "?": "toggleHelp",
  };
  for (const [key, action] of Object.entries(expected)) {
    assert.deepEqual(keyToAction({ key }), { name: action, preventDefault: true }, key);
  }
});

test("Space は半ページ、Shift+Space は上へ", () => {
  assert.deepEqual(keyToAction({ key: " " }), { name: "scrollDown", preventDefault: true });
  assert.deepEqual(keyToAction({ key: " ", shiftKey: true }), { name: "scrollUp", preventDefault: true });
});

test("1〜8 は公開タブへ直接 (既定動作は止めない)、範囲外の数字と知らないキーは何もしない", () => {
  assert.deepEqual(keyToAction({ key: "1" }), { name: "tab", preventDefault: false, tabIndex: 0 });
  assert.deepEqual(keyToAction({ key: String(PUBLIC_TABS.length) }), { name: "tab", preventDefault: false, tabIndex: PUBLIC_TABS.length - 1 });
  assert.equal(keyToAction({ key: String(PUBLIC_TABS.length + 1) }), null);
  assert.equal(keyToAction({ key: "0" }), null);
  assert.equal(keyToAction({ key: "x" }), null);
  assert.equal(keyToAction({ key: "constructor" }), null);
});

test("入力欄にフォーカス中は Esc で抜けるだけで、ほかのキーは奪わない", () => {
  assert.deepEqual(keyToAction({ key: "Escape", inInput: true }), { name: "blurInput", preventDefault: false });
  assert.equal(name({ key: "j", inInput: true }), null);
  assert.equal(name({ key: "?", inInput: true }), null);
});

test("Esc はヘルプを閉じ、ヘルプが無ければ検索語があるときだけ検索を消す", () => {
  assert.deepEqual(keyToAction({ key: "Escape", dialogOpen: true, hasQuery: true }), { name: "closeHelp", preventDefault: false });
  assert.deepEqual(keyToAction({ key: "Escape", hasQuery: true }), { name: "clearSearch", preventDefault: false });
  assert.equal(keyToAction({ key: "Escape" }), null);
});

test("ヘルプが開いている間は ? (閉じる) と Esc 以外を無視する", () => {
  assert.equal(name({ key: "?", dialogOpen: true }), "toggleHelp");
  assert.equal(name({ key: "j", dialogOpen: true }), null);
  assert.equal(name({ key: "1", dialogOpen: true }), null);
});

test("修飾キー付きは無視する (? は除く)", () => {
  assert.equal(name({ key: "r", ctrlKey: true }), null);
  assert.equal(name({ key: "c", metaKey: true }), null);
  assert.equal(name({ key: "1", altKey: true }), null);
  assert.equal(name({ key: "?", ctrlKey: true }), "toggleHelp");
});

test("ボタン・リンク・summary の上の Enter と Space はブラウザに任せる", () => {
  assert.equal(name({ key: "Enter", onControl: true }), null);
  assert.equal(name({ key: " ", onControl: true }), null);
  assert.equal(name({ key: "j", onControl: true }), "cursorDown");
});
