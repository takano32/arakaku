#!/usr/bin/env node
// 動画・記事へのアーカイブの重ね方 (enrich/media.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { applyArticleArchive, applyVideoArchive, deriveVideoFilterFields } from "../../docs/assets/js/data/enrich/media.js";

test("YouTube アーカイブの題名・チャンネル・投稿日を優先し、無い項目は動画の値を残す", () => {
  const video = { video_id: "v1", title: "元題", channel_name: "元ch", published_at: "2024-01-01" };
  const archive = { fulltitle: "新題", upload_date: "20240102", description: "概要" };
  assert.deepEqual(applyVideoArchive(video, archive), {
    video_id: "v1", title: "新題", channel_name: "元ch", published_at: "20240102", archive_description: "概要", archive_metadata: archive,
  });
  const plain = applyVideoArchive(video, undefined);
  assert.equal(plain.title, "元題");
  assert.equal("archive_metadata" in plain, true);
  assert.equal(plain.archive_metadata, undefined);
  assert.equal(video.archive_metadata, undefined); // 入力は変更しない
});

test("絞り込み用の団体・階級は関連 bout / event から最初に見つかった値を採り、既にある値は保つ", () => {
  const bouts = { b1: { promotion_id: "target", division: "ライト級" }, b2: { promotion_id: "emperor", division: "ミドル級" } };
  const events = { e1: { promotion_id: "mh" } };
  const resolvers = { findBout: (id) => bouts[id], findEvent: (id) => events[id] };
  const rich = deriveVideoFilterFields({ video_id: "v" }, [
    { entity_type: "fighter", entity_id: "x" },
    { entity_type: "bout", entity_id: "missing" },
    { entity_type: "bout", entity_id: "b1" },
    { entity_type: "bout", entity_id: "b2" },
    { entity_type: "event", entity_id: "e1" },
  ], resolvers);
  assert.equal(rich.promotion_id, "target");
  assert.equal(rich.division, "ライト級");
  const viaEvent = deriveVideoFilterFields({ video_id: "v" }, [{ entity_type: "event", entity_id: "e1" }], resolvers);
  assert.equal(viaEvent.promotion_id, "mh");
  assert.equal(viaEvent.division, undefined);
  const kept = deriveVideoFilterFields({ video_id: "v", promotion_id: "max_bout" }, [{ entity_type: "bout", entity_id: "b1" }], resolvers);
  assert.equal(kept.promotion_id, "max_bout");
  assert.equal(kept.division, "ライト級");
});

test("note アーカイブの題名・説明を記事に重ねる", () => {
  const article = { article_id: "a1", title: "元題" };
  assert.deepEqual(applyArticleArchive(article, { title: "新題", description: "説明" }), { article_id: "a1", title: "新題", archive_description: "説明" });
  assert.deepEqual(applyArticleArchive(article, undefined), { article_id: "a1", title: "元題", archive_description: undefined });
});
