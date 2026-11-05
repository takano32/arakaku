#!/usr/bin/env node
// 管理ビュー「出典本文」(ui/sections/sources.js) の build() を確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { sourcesSection } from "../../docs/assets/js/ui/sections/sources.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => sourcesSection.build(sectionCtx(state));

test("全文書を新しい順で出し、検索と種別で選ぶ", () => {
  assert.deepEqual(keysOf(build()), ["youtube_description:youtube_a", "note:note-emperor", "note:note-target-1"]);
  assert.deepEqual(keysOf(build({ sourceType: "youtube_description" })), ["youtube_description:youtube_a"]);
  assert.deepEqual(keysOf(build({ query: "KO で勝利" })), ["note:note-target-1"]);
});

test("行の色帯は出所ごと", () => {
  const desc = build();
  assert.deepEqual(desc.items.map((d) => desc.rowClass(d)), ["rec-source rec-src-youtube", "rec-source rec-src-note", "rec-source rec-src-note"]);
});

test("head に日付と出典候補の件数、body に本文と URL", () => {
  const desc = build({ query: "KO で勝利" });
  const [doc] = desc.items;
  const head = desc.renderHead(doc);
  assert.match(head, /2025-01-10 \/ note-target-1/);
  assert.match(head, /note本文/);
  const body = desc.renderBody(doc);
  assert.match(body, /<code>note:note-target-1<\/code>/);
  assert.match(body, /href="https:\/\/note\.com\/example\/n\/target1"/);
});

test("日付の無い文書は「日付未入力」", () => {
  const desc = build({ query: "エンペラーの紹介" });
  assert.match(desc.renderHead(desc.items[0]), /日付未入力/);
});
