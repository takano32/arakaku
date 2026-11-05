#!/usr/bin/env node
// Service Worker の通知の受け取り (app/sw_client.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { DATA_UPDATED, dataUpdatedHandler } from "../../docs/assets/js/app/sw_client.js";

test("DATA_UPDATED は最初の 1 回だけ通知し、ほかのメッセージは無視する", () => {
  let calls = 0;
  const handler = dataUpdatedHandler(() => { calls += 1; });
  handler({ data: { type: "OTHER" } });
  handler({ data: null });
  assert.equal(calls, 0);
  handler({ data: { type: DATA_UPDATED } });
  handler({ data: { type: DATA_UPDATED } });
  assert.equal(calls, 1);
});

test("メッセージの型名は docs/sw.js の postMessage と同じ", () => {
  const sw = readFileSync(new URL("../../docs/sw.js", import.meta.url), "utf8");
  assert.ok(sw.includes(`postMessage({ type: "${DATA_UPDATED}" })`));
});
