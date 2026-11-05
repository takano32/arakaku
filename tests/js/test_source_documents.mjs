#!/usr/bin/env node
// 出典本文と本文の結合 (data/source_documents.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { withBodies } from "../../docs/assets/js/data/source_documents.js";

test("本文のある文書にだけ content_text を足し、並びと元の行は変えない", () => {
  const a = { source_id: "a", title: "A" };
  const b = { source_id: "b", title: "B" };
  const out = withBodies([b, a], new Map([["a", { source_id: "a", content_text: "本文" }]]));
  assert.deepEqual(out, [b, { source_id: "a", title: "A", content_text: "本文" }]);
  assert.equal(out[0], b); // 本文の無い文書はそのまま
  assert.equal("content_text" in a, false);
});
