#!/usr/bin/env node
// データ信頼性ティア (data/reliability.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import {
  RELIABILITY,
  boutReliability,
  eventReliability,
  fighterReliability,
  isMinimalFighter,
  lowReliabilityLast,
  videoReliability,
} from "../../docs/assets/js/data/reliability.js";

test("ティアは 名鑑 > 公式 > 通信 > YouTube > 未登録", () => {
  assert.ok(RELIABILITY.numbers > RELIABILITY.official);
  assert.ok(RELIABILITY.official > RELIABILITY.note);
  assert.ok(RELIABILITY.note > RELIABILITY.youtube);
  assert.ok(RELIABILITY.youtube > RELIABILITY.none);
});

test("最小登録の選手: 名鑑・公式・動画が無く、記事も無いか「最小登録」の印がある", () => {
  assert.equal(isMinimalFighter({}), true);
  assert.equal(isMinimalFighter({ numbers_data: {} }), false);
  assert.equal(isMinimalFighter({ official_data: {} }), false);
  assert.equal(isMinimalFighter({ inferred_from_video_ids: ["v"] }), false);
  assert.equal(isMinimalFighter({ inferred_from_video_ids: [] }), true);
  assert.equal(isMinimalFighter({ source_article_ids: ["a"] }), false);
  assert.equal(isMinimalFighter({ source_article_ids: ["a"], summary: "履歴のための最小登録" }), true);
});

test("選手のティア", () => {
  assert.equal(fighterReliability({ numbers_data: {}, official_data: {} }), RELIABILITY.numbers);
  assert.equal(fighterReliability({ official_data: {} }), RELIABILITY.official);
  assert.equal(fighterReliability({ source_article_ids: ["a"], inferred_from_video_ids: ["v"] }), RELIABILITY.note);
  assert.equal(fighterReliability({ inferred_from_video_ids: ["v"] }), RELIABILITY.youtube);
  assert.equal(fighterReliability({ source_article_ids: ["a"], summary: "最小登録" }), RELIABILITY.none);
  assert.equal(fighterReliability({}), RELIABILITY.none);
});

test("試合のティア", () => {
  assert.equal(boutReliability({ result_status: "numbers_verified" }), RELIABILITY.numbers);
  assert.equal(boutReliability({ numbers_records: [{}] }), RELIABILITY.numbers);
  assert.equal(boutReliability({ numbers_records: [], source_article_id: "a" }), RELIABILITY.note);
  assert.equal(boutReliability({ source_article_id: "", inferred_from_video_id: "v" }), RELIABILITY.youtube);
  assert.equal(boutReliability({}), RELIABILITY.none);
});

test("大会のティア", () => {
  assert.equal(eventReliability({ numbers_only: true, official_data: {} }), RELIABILITY.numbers);
  assert.equal(eventReliability({ official_data: {} }), RELIABILITY.official);
  assert.equal(eventReliability({ source_article_id: "a" }), RELIABILITY.note);
  assert.equal(eventReliability({ inferred_from: "official_youtube_title" }), RELIABILITY.youtube);
  assert.equal(eventReliability({ source_video_ids: ["v"] }), RELIABILITY.youtube);
  assert.equal(eventReliability({ source_video_ids: [] }), RELIABILITY.none);
});

test("動画のティア: 公式チャンネル > 記事あり > それ以外は YouTube", () => {
  assert.equal(videoReliability({ official_status: "official" }), RELIABILITY.official);
  assert.equal(videoReliability({ source_article_ids: ["a"] }), RELIABILITY.note);
  assert.equal(videoReliability({}), RELIABILITY.youtube);
});

test("lowReliabilityLast は順序を保ったまま YouTube 以下だけを末尾へ寄せる (安定)", () => {
  const items = [
    { id: 1, r: RELIABILITY.youtube },
    { id: 2, r: RELIABILITY.note },
    { id: 3, r: RELIABILITY.none },
    { id: 4, r: RELIABILITY.numbers },
    { id: 5, r: RELIABILITY.youtube },
  ];
  assert.deepEqual(lowReliabilityLast(items, (x) => x.r).map((x) => x.id), [2, 4, 1, 3, 5]);
  assert.deepEqual(items.map((x) => x.id), [1, 2, 3, 4, 5]); // 入力は変えない
  assert.deepEqual(lowReliabilityLast([], (x) => x.r), []);
});
