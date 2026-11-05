#!/usr/bin/env node
// eventSortDate / eventDateLabel のユニットテスト (DOM 不要・依存ゼロ、node:test)。
// 大会の日付は 結果 note の投稿日 → note の最初の投稿日 → 公開日 の優先順 (reorder_data.py と同じ規則)。
import test from "node:test";
import assert from "node:assert/strict";

import { eventDateLabel, eventSortDate } from "../../docs/assets/js/data/event_dates.js";

test("並び替え用の日付は 結果 → カード → 公開日 の順に採る", () => {
  assert.equal(eventSortDate({ result_published_at: "2025-04-29", note_published_at: "2025-04-20", published_at: "2025-04-01" }), "2025-04-29");
  assert.equal(eventSortDate({ note_published_at: "2025-04-20", published_at: "2025-04-01" }), "2025-04-20");
  assert.equal(eventSortDate({ published_at: "2025-04-01" }), "2025-04-01");
});

test("日付が無い大会・大会そのものが無いときは空文字", () => {
  assert.equal(eventSortDate({ numbers_only: true }), "");
  assert.equal(eventSortDate(undefined), "");
  assert.equal(eventSortDate(null), "");
  assert.equal(eventDateLabel({}), "");
  assert.equal(eventDateLabel(undefined), "");
});

test("一覧の表記は「結果 日付」「カード 日付」、公開日だけならそのまま", () => {
  assert.equal(eventDateLabel({ result_published_at: "2025-04-29", note_published_at: "2025-04-20" }), "結果 2025-04-29");
  assert.equal(eventDateLabel({ note_published_at: "2025-04-20", published_at: "2025-04-01" }), "カード 2025-04-20");
  assert.equal(eventDateLabel({ published_at: "2025-04-01" }), "2025-04-01");
});

test("空文字の日付は無いものとして次の候補へ落ちる", () => {
  assert.equal(eventSortDate({ result_published_at: "", note_published_at: "2025-04-20" }), "2025-04-20");
  assert.equal(eventDateLabel({ result_published_at: "", note_published_at: "", published_at: "2025-04-01" }), "2025-04-01");
});
