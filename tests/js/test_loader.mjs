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

test("loadKeys は配列のはずのファイルが配列でなければ読み込みエラーにする (T.112.4.16)", async () => {
  const state = { patch() {} };
  const files = { officialPages: "official_pages.json", officialNews: "official_news.json" };
  const texts = { "official_pages.json": "{}", "official_news.json": "[]" };
  const loader = new DataLoader(state, { dataFiles: files, fetchText: async (path) => texts[path] });
  await loader.loadKeys(["officialPages", "officialNews"]);
  assert.deepEqual(state.data.officialPages, []);
  assert.equal(state.dataLoadErrors.officialPages, "配列 JSON ではありません");
  assert.equal("officialNews" in state.dataLoadErrors, false);
  assert.equal(state.loadedDataKeys.has("officialPages"), true);
});

test("loadKeys(required) は形の壊れたファイルで throw する", async () => {
  const loader = new DataLoader({ patch() {} }, { dataFiles: { officialPages: "official_pages.json" }, fetchText: async () => "{}" });
  await assert.rejects(loader.loadKeys(["officialPages"], { required: true }), /official_pages\.json: 配列 JSON ではありません/);
});

test("loadKeys(required) はすべてを検査してから書くので、壊れたファイルがあれば何も書かない (T.112.6.17)", async () => {
  const state = { patch() {} };
  const files = { officialNews: "official_news.json", officialPages: "official_pages.json" };
  const texts = { "official_news.json": '[{"slug":"a"}]', "official_pages.json": "{}" };
  const loader = new DataLoader(state, { dataFiles: files, fetchText: async (path) => texts[path] });
  await assert.rejects(loader.loadKeys(["officialNews", "officialPages"], { required: true }), /official_pages\.json: 配列 JSON ではありません/);
  assert.deepEqual(state.data.officialNews, []);
  assert.deepEqual(state.data.officialPages, []);
  assert.equal(state.loadedDataKeys.size, 0);
  assert.equal(state.loadingDataKeys.size, 0);
  assert.deepEqual(state.dataLoadErrors, {});
});

test("loadKeys(required) は取得の失敗をそのまま throw し、何も書かず読み込み済みにもしない", async () => {
  const state = { patch() {} };
  const files = { officialNews: "official_news.json", officialPages: "official_pages.json" };
  const fetchText = async (path) => {
    if (path === "official_pages.json") throw new Error("HTTP 500");
    return '[{"slug":"a"}]';
  };
  const loader = new DataLoader(state, { dataFiles: files, fetchText });
  await assert.rejects(loader.loadKeys(["officialNews", "officialPages"], { required: true }), { message: "HTTP 500" });
  assert.deepEqual(state.data.officialNews, []);
  assert.equal(state.loadedDataKeys.size, 0);
  assert.equal(state.loadingDataKeys.size, 0);
  assert.deepEqual(state.dataLoadErrors, {});
});

test("required でない loadKeys は取得の失敗をキーごとに記録し、ほかのキーは読み込む", async () => {
  const state = { patch() {} };
  const files = { officialNews: "official_news.json", officialPages: "official_pages.json" };
  const fetchText = async (path) => {
    if (path === "official_pages.json") throw new Error("HTTP 404");
    return '[{"slug":"a"}]';
  };
  const loader = new DataLoader(state, { dataFiles: files, fetchText });
  await loader.loadKeys(["officialNews", "officialPages"]);
  assert.deepEqual(state.data.officialNews, [{ slug: "a" }]);
  assert.deepEqual(state.data.officialPages, []);
  assert.deepEqual(state.dataLoadErrors, { officialPages: "HTTP 404" });
  assert.deepEqual([...state.loadedDataKeys].sort(), ["officialNews", "officialPages"]);
  assert.equal(state.loadingDataKeys.size, 0);
});

test("loadAll はすべてのキーを required で読み、1 つでも壊れていれば throw する", async () => {
  const files = { officialNews: "official_news.json", officialPages: "official_pages.json", metadata: "metadata.json" };
  const texts = { "official_news.json": '[{"slug":"a"}]', "official_pages.json": '[{"slug":"b"}]', "metadata.json": '{"built":"x"}' };
  const state = { patch() {} };
  const data = await new DataLoader(state, { dataFiles: files, fetchText: async (path) => texts[path] }).loadAll();
  assert.equal(data, state.data);
  assert.deepEqual(state.data, { officialNews: [{ slug: "a" }], officialPages: [{ slug: "b" }], metadata: { built: "x" } });
  assert.deepEqual([...state.loadedDataKeys].sort(), ["metadata", "officialNews", "officialPages"]);
  assert.deepEqual(state.dataLoadErrors, {});

  const broken = { ...texts, "official_pages.json": "{}" };
  const brokenState = { patch() {} };
  await assert.rejects(new DataLoader(brokenState, { dataFiles: files, fetchText: async (path) => broken[path] }).loadAll(), /official_pages\.json/);
  assert.deepEqual(brokenState.data.officialNews, []);
  assert.equal(brokenState.loadedDataKeys.size, 0);
});
