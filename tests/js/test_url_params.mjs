#!/usr/bin/env node
// 状態 ⇔ URL クエリ文字列 (app/url_params.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { PARAM_MAP, placeOf, readFromURL, searchStringFor, stateFromSearch } from "../../docs/assets/js/app/url_params.js";
import { FILTER_STATE_KEYS } from "../../docs/assets/js/data/filters.js";
import { Store } from "../../docs/assets/js/app/state.js";

test("readFromURL は知っているパラメータだけを状態名に写し、不正なタブ・絞り込み値は捨てる", () => {
  assert.deepEqual(readFromURL(""), {});
  assert.deepEqual(readFromURL("?tab=bouts&q=%E3%83%86%E3%82%B9%E3%83%88&bout=b1"), { tab: "bouts", query: "テスト", focusBoutId: "b1" });
  assert.deepEqual(readFromURL("?tab=nope&bout_div=zzz&bout_promo=target&unknown=1"), { boutPromotion: "target" });
  assert.deepEqual(readFromURL("?tab=sources&src_type=note_article&mention=event"), { tab: "sources", sourceType: "note_article", mentionType: "event" });
  // 検索語・飛び先 ID は値を検証しない (任意の文字列)
  assert.deepEqual(readFromURL("?fighter=anything%20goes&q="), { query: "", focusFighterId: "anything goes" });
});

test("searchStringFor は既定値 (official タブ・空文字) を省き、PARAM_MAP の順に並べる", () => {
  assert.equal(searchStringFor({ tab: "official", query: "" }), "");
  assert.equal(searchStringFor({ tab: "bouts" }), "?tab=bouts");
  assert.equal(searchStringFor({ boutDivision: "other", query: "x y", tab: "bouts", focusBoutId: "b 1" }), "?tab=bouts&q=x+y&bout=b+1&bout_div=other");
  assert.equal(searchStringFor({ tab: "", query: "", titlePromotion: "" }), "");
});

test("読み書きは往復する", () => {
  for (const search of ["?tab=fighters&q=a+b&fighter=abc", "?tab=mentions&mention=event&src_type=note_article", "?fighter_div=other&event_type=tournament&nr_promo=max_bout"]) {
    assert.equal(searchStringFor({ tab: "official", ...readFromURL(search) }), search);
  }
});

test("placeOf はタブと飛び先だけを見る (検索語・絞り込みは含めない)", () => {
  const base = { tab: "bouts", focusFighterId: "", focusEventId: "", focusBoutId: "", query: "a", boutDivision: "lightweight" };
  assert.equal(placeOf(base), placeOf({ ...base, query: "b", boutDivision: "" }));
  assert.notEqual(placeOf(base), placeOf({ ...base, focusBoutId: "b1" }));
  assert.notEqual(placeOf(base), placeOf({ ...base, tab: "events" }));
});

test("stateFromSearch はすべての状態キーを既定値で埋めてから URL の値を重ねる", () => {
  const patch = stateFromSearch("?tab=titles&title_div=lightweight");
  assert.equal(patch.tab, "titles");
  assert.equal(patch.titleDivision, "lightweight");
  for (const key of ["query", "focusFighterId", "focusEventId", "focusBoutId", "mentionType", ...FILTER_STATE_KEYS]) {
    assert.ok(key in patch, key);
  }
  assert.equal(patch.boutDivision, "");
  assert.equal(stateFromSearch("").tab, "official");
  // 既定値は Store の初期値と同じで、PARAM_MAP の値 (状態名) はすべて Store に存在する名前
  const store = new Store();
  for (const [key, value] of Object.entries(stateFromSearch(""))) assert.equal(value, store[key], key);
  for (const stateKey of Object.values(PARAM_MAP)) assert.ok(stateKey in store, stateKey);
});

test("知らない言及の種別は捨てる (T.112.4.21)", () => {
  assert.deepEqual(readFromURL("?tab=mentions&mention=bogus"), { tab: "mentions" });
  assert.deepEqual(readFromURL("?tab=mentions&mention=result"), { tab: "mentions", mentionType: "result" });
});
