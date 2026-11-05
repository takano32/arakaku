#!/usr/bin/env node
// 絞り込み欄の描画 (ui/render/filter_chips.js FiltersRenderer) を、DOM の代わりの小さいオブジェクトで確かめる
// (依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { FiltersRenderer } from "../../docs/assets/js/ui/render/filter_chips.js";

function fakeRepo(revision, mentions, counter) {
  return {
    revision,
    get richSourceMentions() { counter.reads += 1; return mentions; },
  };
}

test("言及の種別の一覧は revision が変わったときだけ作り直す (T.112.4.22)", () => {
  const el = { hidden: false, innerHTML: "" };
  const renderer = new FiltersRenderer(el);
  const counter = { reads: 0 };
  const mentions = [{ mention_type: "result" }, { mention_type: "event" }, { mention_type: "result" }];
  const repo = fakeRepo(1, mentions, counter);
  renderer.render({ tab: "mentions", mentionType: "", query: "a" }, repo);
  renderer.render({ tab: "mentions", mentionType: "", query: "ab" }, repo);
  assert.equal(counter.reads, 1);
  assert.match(el.innerHTML, /value="event"[\s\S]*value="result"/);
  renderer.render({ tab: "mentions", mentionType: "", query: "ab" }, fakeRepo(2, mentions, counter));
  assert.equal(counter.reads, 2);
});
