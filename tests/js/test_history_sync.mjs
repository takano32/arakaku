#!/usr/bin/env node
// 履歴同期 (app/history_sync.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
// history / location を偽物に差し替え、pushState / replaceState の使い分けを確かめる。
import test from "node:test";
import assert from "node:assert/strict";

import { HistorySync } from "../../docs/assets/js/app/history_sync.js";

function fakeBrowser(search = "") {
  const calls = [];
  const history = {
    state: null,
    pushState(state, title, url) { calls.push(["push", state, url]); this.state = state; },
    replaceState(state, title, url) { calls.push(["replace", state, url]); this.state = state; },
  };
  const location = { pathname: "/arakaku/", search };
  let scrollY = 0;
  const sync = new HistorySync({ history, location, scrollY: () => scrollY });
  return { calls, history, sync, setScroll: (y) => { scrollY = y; } };
}
const state = (over) => ({ tab: "official", query: "", focusFighterId: "", focusEventId: "", focusBoutId: "", mentionType: "", ...over });

test("最初の書き込みと検索語・絞り込みの変更は replaceState、同じ URL なら書かない", () => {
  const { calls, sync } = fakeBrowser();
  sync.write(state({ tab: "bouts" }));
  assert.deepEqual(calls, [["replace", null, "?tab=bouts"]]);
  sync.write(state({ tab: "bouts" }));
  assert.equal(calls.length, 1);
  sync.write(state({ tab: "bouts", query: "a", boutDivision: "lightweight" }));
  assert.deepEqual(calls[1], ["replace", null, "?tab=bouts&q=a&bout_div=lightweight"]);
  sync.write(state({ tab: "bouts" }));
  assert.deepEqual(calls[2], ["replace", null, "?tab=bouts"]);
  // 既定値だけなら pathname に戻す
  const first = fakeBrowser();
  first.sync.write(state({}));
  assert.deepEqual(first.calls, [["replace", null, "/arakaku/"]]);
});

test("タブ・飛び先が変わるとスクロール位置を残してから pushState する (T.80 / T.102)", () => {
  const { calls, history, sync, setScroll } = fakeBrowser();
  sync.write(state({ tab: "fighters" }));
  setScroll(320);
  sync.write(state({ tab: "fighters", focusFighterId: "f1" }));
  assert.deepEqual(calls.slice(1), [
    ["replace", { scrollY: 320 }, undefined],
    ["push", null, "?tab=fighters&fighter=f1"],
  ]);
  assert.equal(history.state, null);
  // 絞り込みだけの変更は、いまの履歴項目の state (スクロール位置など) を保ったまま置き換える
  history.state = { scrollY: 10 };
  sync.write(state({ tab: "fighters", focusFighterId: "f1", query: "x" }));
  assert.deepEqual(calls.at(-1), ["replace", { scrollY: 10 }, "?tab=fighters&q=x&fighter=f1"]);
});

test("restore は URL の状態を既定値で埋めて返し、その直後の同じ状態の書き込みを抑える", () => {
  const { calls, sync } = fakeBrowser("?tab=events&event=e1");
  const patch = sync.restore();
  assert.equal(patch.tab, "events");
  assert.equal(patch.focusEventId, "e1");
  assert.equal(patch.query, "");
  assert.equal(patch.boutDivision, "");
  sync.write(state(patch));
  assert.deepEqual(calls, []);
  // 復元後に別の場所へ移れば履歴を積む
  sync.write(state({ tab: "bouts" }));
  assert.deepEqual(calls.map((c) => c[0]), ["replace", "push"]);
  assert.equal(sync.restore("?tab=titles").tab, "titles");
});
