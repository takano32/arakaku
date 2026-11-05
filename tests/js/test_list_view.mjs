#!/usr/bin/env node
// 一覧の描画ゲート・指紋 (ui/render/list_view.js の純関数) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { focusKeyOf, listGate, stateFingerprint } from "../../docs/assets/js/ui/render/list_view.js";

test("必須データの無いタブはすぐ描ける", () => {
  assert.deepEqual(listGate("official", new Set(), new Set()), { gateKey: "", sortReady: true, blocked: false, loading: false });
  assert.equal(listGate("bouts", new Set(), new Set()).blocked, false);
});

test("通信・出典本文は source_documents、出典言及は言及も揃うまで待ち、取得中なら「読み込み中」", () => {
  assert.deepEqual(listGate("tsushin", new Set(), new Set()), { gateKey: "sourceDocuments", sortReady: true, blocked: true, loading: false });
  assert.equal(listGate("tsushin", new Set(), new Set(["sourceDocuments"])).loading, true);
  assert.equal(listGate("tsushin", new Set(["sourceDocuments"]), new Set(["sourceDocumentBodies"])).blocked, false); // 本文は待たない
  const mentions = listGate("mentions", new Set(["sourceDocuments"]), new Set());
  assert.equal(mentions.gateKey, "sourceMentions");
  assert.equal(mentions.blocked, true);
  assert.equal(listGate("mentions", new Set(["sourceDocuments", "sourceMentions"]), new Set()).blocked, false);
});

test("選手タブは名鑑順ソートに必要なキーが揃うまで「読み込み中」で待つ", () => {
  const waiting = listGate("fighters", new Set(["fighters"]), new Set());
  assert.deepEqual(waiting, { gateKey: "", sortReady: false, blocked: true, loading: true });
  assert.equal(listGate("fighters", new Set(["numbersFighters", "numbersNameMatches"]), new Set()).blocked, false);
});

test("指紋は検索語・飛び先・言及種別・全フィルタを含み、飛び先の指紋は検索語を含まない", () => {
  const base = { query: "", focusFighterId: "", focusEventId: "", focusBoutId: "", mentionType: "", boutDivision: "" };
  assert.notEqual(stateFingerprint(base), stateFingerprint({ ...base, query: "a" }));
  assert.notEqual(stateFingerprint(base), stateFingerprint({ ...base, boutDivision: "lightweight" }));
  assert.notEqual(stateFingerprint(base), stateFingerprint({ ...base, mentionType: "event" }));
  assert.equal(stateFingerprint(base), stateFingerprint({ ...base, tab: "bouts" })); // タブは別に比べる
  assert.equal(focusKeyOf(base), focusKeyOf({ ...base, query: "a", boutDivision: "x" }));
  assert.notEqual(focusKeyOf(base), focusKeyOf({ ...base, focusBoutId: "b1" }));
});
