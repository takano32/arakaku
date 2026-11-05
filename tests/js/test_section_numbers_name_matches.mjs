#!/usr/bin/env node
// 管理ビュー「名前対応」(ui/sections/numbers_name_matches.js) の build() を確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { numbersNameMatchesSection } from "../../docs/assets/js/ui/sections/numbers_name_matches.js";
import { fakeData, fakeRepo, keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state, repo) => numbersNameMatchesSection.build(sectionCtx(state, repo));

test("対応表を出し、名鑑名・fighter_id で検索する", () => {
  assert.deepEqual(keysOf(build()), ["nf_001", "nf_002"]);
  assert.deepEqual(keysOf(build({ query: "colt_apro" })), ["nf_002"]);
  assert.deepEqual(keysOf(build({ query: "zzzz" })), []);
});

test("head に選手へのリンクと確度、body は開いた詳細", () => {
  const desc = build({ query: "colt_apro" });
  const [match] = desc.items;
  assert.equal(desc.rowClass(match), "rec-src-numbers");
  const head = desc.renderHead(match);
  assert.match(head, /data-fighter-id="colt_apro"/);
  assert.match(head, /badge-numbers">high</);
  assert.match(desc.renderBody(match), /<details class="fold fold-details" open>/);
});

test("対応の無い名前は「未対応」", () => {
  const data = fakeData();
  data.numbersNameMatches.push({ numbers_fighter_id: "nf_003", numbers_name: "だれか", matched_fighter_id: "", candidate_fighter_id: "", match_method: "", match_confidence: "", notes: "" });
  const desc = build({ query: "だれか" }, fakeRepo(data));
  assert.match(desc.renderHead(desc.items[0]), /<span class="muted">未対応<\/span>/);
  assert.match(desc.renderBody(desc.items[0]), /<dd>未対応<\/dd>/);
});
