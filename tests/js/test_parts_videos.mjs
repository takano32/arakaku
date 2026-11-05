#!/usr/bin/env node
// 動画の HTML 部品 (ui/parts/videos.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import {
  mentionCountBadges,
  videoBlock,
  videoDescriptionPreview,
  videoFacade,
  videoLinks,
  videoRefs,
} from "../../docs/assets/js/ui/parts/videos.js";

const video = { video_id: "v1", platform: "youtube", platform_video_id: "abc", url: "https://youtu.be/abc", title: "試合動画", channel_name: "ch", published_at: "20240102", thumbnail_sizes: "default standard", archive_metadata: {} };
const repo = {
  getRichVideoInfo: (v) => ({ ...v, title: "補完題", archive_metadata: {} }),
  sourceDocumentForVideo: (v) => (v.video_id === "v1" ? { content_text: "概要欄本文" } : undefined),
  videosForEntity: (type, id) => (id === "b1" ? [{ link: { video_id: "v1", relation_type: "full_fight", notes: "メモ" }, video }, { link: { video_id: "v2" }, video: { ...video, video_id: "v2", video_type: "highlight" } }] : []),
  richVideoById: (id) => (id === "v1" ? video : undefined),
  sourceContextForVideo: (v) => (v.video_id === "v1"
    ? { reference: { content_preview: "参照プレビュー", mention_types: "matchup:2|result:1" }, document: undefined }
    : v.video_id === "v2" ? { reference: undefined, document: { source_id: "yd:v2", content_preview: "文書プレビュー" } } : {}),
  countSourceMentions: () => ({ note_url: 1, matchup: 2, result: 0 }),
};

test("ファサードは YouTube 以外は空、サムネイルは存在するサイズを選ぶ", () => {
  assert.equal(videoFacade({ platform: "vimeo", platform_video_id: "x" }), "");
  assert.equal(videoFacade({ platform: "youtube" }), "");
  assert.match(videoFacade(video), /src="https:\/\/i\.ytimg\.com\/vi\/abc\/sddefault\.jpg"/);
  assert.match(videoFacade({ ...video, thumbnail_sizes: "maxres" }), /maxresdefault\.jpg/);
  assert.match(videoFacade({ ...video, thumbnail_sizes: "" }), /hqdefault\.jpg/);
  assert.match(videoFacade({ ...video, title: 'a"b' }), /aria-label="再生: a&quot;b"/);
  assert.match(videoFacade(video), /^<div class="yt" data-yt-id="abc">/);
});

test("動画ブロックは URL が無ければ code、あればリンク + メタ + ファサード + 概要欄", () => {
  assert.equal(videoBlock(repo, { video_id: "v9", archive_metadata: {} }), "<code>v9</code>");
  const html = videoBlock(repo, video);
  assert.match(html, /<p class="vblock-title"><a href="https:\/\/youtu\.be\/abc" target="_blank" rel="noopener noreferrer">試合動画<\/a><\/p>/);
  assert.match(html, /<p class="muted small">ch \/ 2024-01-02<\/p>/);
  assert.match(html, /概要欄を表示<\/summary><div class="fold-body"><pre class="pre">概要欄本文<\/pre>/);
  // archive_metadata が無ければ 1 件だけ補完する
  assert.match(videoBlock(repo, { ...video, archive_metadata: undefined }), /補完題/);
  assert.match(videoBlock(repo, video, "別ラベル"), />別ラベル<\/a>/);
});

test("関連動画は除外 ID を外し、関係種別バッジとメモを付ける", () => {
  assert.equal(videoLinks(repo, "bout", "none"), "");
  const html = videoLinks(repo, "bout", "b1");
  assert.match(html, /^<section class="sec sec-videos"><h3 class="sec-title">動画<\/h3><div class="grid"><div class="item item-video">/);
  assert.match(html, /<span class="badge">Full Fight<\/span>/);
  assert.match(html, /<span class="badge">ハイライト<\/span>/); // relation_type が無ければ video_type
  assert.match(html, /<p class="muted small">メモ<\/p>/);
  assert.doesNotMatch(videoLinks(repo, "bout", "b1", ["v1"], "関連"), /Full Fight/);
  assert.match(videoLinks(repo, "bout", "b1", new Set(["v2"]), "関連"), /<h3 class="sec-title">関連<\/h3>/);
});

test("動画 ID の参照はインラインリンクか動画ブロック、未知 ID は code", () => {
  assert.equal(videoRefs(repo, []), "未入力");
  assert.equal(videoRefs(repo, ["v1", "zz"], { inline: true }), '<a href="https://youtu.be/abc" target="_blank" rel="noopener noreferrer">試合動画</a>, <code>zz</code>');
  assert.match(videoRefs(repo, ["v1"]), /^<div class="vblock">/);
  assert.equal(videoRefs(repo, ["zz"]), "<code>zz</code>");
});

test("概要欄プレビューは出典参照を優先し、無ければ文書 + (言及ロード済みのときだけ) 件数バッジ", () => {
  assert.equal(videoDescriptionPreview(repo, { video_id: "none" }), "");
  const withRef = videoDescriptionPreview(repo, { video_id: "v1" });
  assert.match(withRef, /^<section class="sec sec-description"><h3 class="sec-title">YouTube概要欄<\/h3><p class="pre-line">参照プレビュー<\/p>/);
  assert.match(withRef, /<span class="badge">対戦カード 2<\/span><span class="badge">結果 1<\/span>/);
  const docOnly = videoDescriptionPreview(repo, { video_id: "v2" });
  assert.match(docOnly, /<p class="pre-line">文書プレビュー<\/p><\/section>$/);
  assert.doesNotMatch(docOnly, /note URL/);
  assert.match(videoDescriptionPreview(repo, { video_id: "v2" }, { mentionsLoaded: true }), /<span class="badge">note URL 1<\/span><span class="badge">対戦カード 2<\/span><span class="badge">結果 0<\/span>/);
  assert.equal(mentionCountBadges({}), '<span class="badge">note URL 0</span><span class="badge">対戦カード 0</span><span class="badge">結果 0</span>');
});
