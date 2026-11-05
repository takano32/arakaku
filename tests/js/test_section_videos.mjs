#!/usr/bin/env node
// 動画タブ (ui/sections/videos.js) の build() を手書きデータで確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { videosSection } from "../../docs/assets/js/ui/sections/videos.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => videosSection.build(sectionCtx(state));

test("動画を一意のキーで出し、検索と紐づけ先から導いた団体で選ぶ", () => {
  const keys = keysOf(build());
  assert.deepEqual([...keys].sort(), ["youtube_a", "youtube_b", "youtube_c"]);
  assert.deepEqual(keysOf(build({ query: "ダイジェスト" })), ["youtube_b"]);
  assert.deepEqual(keysOf(build({ videoPromotion: "emperor" })), ["youtube_b"]);
  assert.deepEqual(keysOf(build({ query: "zzzz" })), []);
});

test("head にサムネイル・チャンネル・再生時間と種別のバッジ", () => {
  const desc = build({ query: "コルト" });
  const [video] = desc.items;
  assert.equal(desc.rowClass(video), "rec-video");
  const head = desc.renderHead(video);
  assert.match(head, /src="https:\/\/i\.ytimg\.com\/vi\/AAA\/mqdefault\.jpg"/);
  assert.match(head, /アラカク通信 \/ 2025-01-11 \/ 10:00/);
  assert.match(head, /Full Fight/);
});

test("body に埋め込み・紐づけ先 (試合と選手へのリンク)", () => {
  const desc = build({ query: "コルト" });
  const body = desc.renderBody(desc.items[0]);
  assert.match(body, /data-yt-id="AAA"/);
  assert.match(body, /紐づけ先/);
  assert.match(body, /data-bout-id="target-1-01"/);
  assert.match(body, /data-fighter-id="kabei"/);
});
