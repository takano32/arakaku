#!/usr/bin/env node
// 読み込んだファイルの解析 (data/loader.js の applyLoadedText) と、段階読み込みでの失敗の封じ込めを確かめる
// (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { PRIMARY_DATA_KEYS } from "../../docs/assets/js/config.js";
import { DataLoader, applyLoadedText } from "../../docs/assets/js/data/loader.js";

test("配列のキーは配列 JSON を受け取る", () => {
  assert.deepEqual(applyLoadedText("bouts", '[{"bout_id":"b1"}]'), { value: [{ bout_id: "b1" }], error: null });
});

test("空のテキストは空のフォールバック (エラーにしない)", () => {
  assert.deepEqual(applyLoadedText("bouts", ""), { value: [], error: null });
  assert.deepEqual(applyLoadedText("metadata", null), { value: {}, error: null });
});

test("配列のキーに配列以外が来たら、フォールバックと理由を返す", () => {
  assert.deepEqual(applyLoadedText("bouts", "{}"), { value: [], error: "配列 JSON ではありません" });
});

test("オブジェクトのキー (metadata・aliases) はオブジェクトを受け取る", () => {
  assert.deepEqual(applyLoadedText("metadata", '{"a":1}'), { value: { a: 1 }, error: null });
});

test("壊れた JSON はフォールバックと JSON.parse の理由", () => {
  const result = applyLoadedText("bouts", "[");
  assert.deepEqual(result.value, []);
  assert.equal(typeof result.error, "string");
  assert.notEqual(result.error, "");
});

test("段階読み込みでは、壊れたファイル・取得の失敗をキーごとに記録して読み込み済みにする", async () => {
  const state = { data: null, repository: null, patch() {} };
  const files = Object.fromEntries(PRIMARY_DATA_KEYS.map((key) => [key, key]));
  const fetchText = async (key) => {
    if (key === "bouts") return "{}";
    if (key === "fighters") throw new Error("HTTP 404");
    return "[]";
  };
  await new DataLoader(state, { dataFiles: files, fetchText }).load();
  assert.deepEqual(state.dataLoadErrors, { bouts: "配列 JSON ではありません", fighters: "HTTP 404" });
  assert.deepEqual(state.data.bouts, []);
  assert.deepEqual(state.data.fighters, []);
  for (const key of PRIMARY_DATA_KEYS) assert.ok(state.loadedDataKeys.has(key), key);
  assert.equal(state.loadingDataKeys.size, 0);
});
