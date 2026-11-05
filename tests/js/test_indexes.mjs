#!/usr/bin/env node
// buildIndex / buildGroupIndex / IndexCache のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { IndexCache, buildGroupIndex, buildIndex } from "../../docs/assets/js/data/indexes.js";

const records = [
  { id: "a", group: "x" },
  { id: "b", group: "y" },
  { id: "", group: "x" },
  { id: "a", group: "z" },
  { id: "c" },
];

test("buildIndex は空キーを飛ばし、同じキーは後勝ち", () => {
  const index = buildIndex(records, (r) => r.id);
  assert.deepEqual([...index.keys()], ["a", "b", "c"]);
  assert.equal(index.get("a").group, "z");
  assert.equal(buildIndex(undefined, (r) => r.id).size, 0);
});

test("buildGroupIndex は同じキーの行を配列順にまとめ、空キーは飛ばす", () => {
  const index = buildGroupIndex(records, (r) => r.group);
  assert.deepEqual([...index.keys()], ["x", "y", "z"]);
  assert.deepEqual(index.get("x").map((r) => r.id), ["a", ""]);
  assert.equal(buildGroupIndex(null, (r) => r.group).size, 0);
});

test("IndexCache は名前ごとに 1 回だけ構築し、clear() で作り直す", () => {
  const cache = new IndexCache();
  let builds = 0;
  const keyOf = (r) => { builds++; return r.id; };
  const first = cache.unique("byId", records, keyOf);
  const again = cache.unique("byId", [], keyOf);
  assert.equal(first, again);
  assert.equal(builds, records.length);
  assert.equal(cache.group("byGroup", records, (r) => r.group).get("y").length, 1);
  cache.clear();
  const rebuilt = cache.unique("byId", records, keyOf);
  assert.notEqual(rebuilt, first);
  assert.equal(builds, records.length * 2);
});
