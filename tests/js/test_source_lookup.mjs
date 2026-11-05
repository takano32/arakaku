#!/usr/bin/env node
// SourceDocumentLookup のユニットテスト (DOM 不要・依存ゼロ、node:test)。
// 複数キーが別の文書に当たるときは元配列で最初の文書を選ぶ (線形 find と同じ結果) ことを確かめる。
import test from "node:test";
import assert from "node:assert/strict";

import { SourceDocumentLookup } from "../../docs/assets/js/data/source_lookup.js";

const docs = [
  { source_id: "note:a1", source_type: "note_article", source_ref_id: "a1", url: "https://note.com/x/n/a1" },
  { source_id: "youtube_description:v1", source_type: "youtube_description", source_ref_id: "v1", url: "https://youtu.be/v1" },
  { source_id: "youtube_description:v2", source_type: "youtube_description", source_ref_id: "other", url: "https://youtu.be/v2" },
  { source_id: "note:a2-dup", source_type: "note_article", source_ref_id: "a2", url: "https://note.com/x/n/a2" },
  { source_id: "note:a2", source_type: "note_article", source_ref_id: "a2-other", url: "https://note.com/x/n/a2b" },
];

test("記事は source_ref_id か source_id (note:<id>) で引ける", () => {
  const lookup = new SourceDocumentLookup(docs);
  assert.equal(lookup.forArticle("a1")?.source_id, "note:a1");
  assert.equal(lookup.forArticle("a2")?.source_id, "note:a2-dup"); // ref_id 一致 (配列順で先) が source_id 一致より先
  assert.equal(lookup.forArticle("zzz"), undefined);
});

test("動画は source_ref_id / source_id / url のどれでも引け、配列順で最初の文書を選ぶ", () => {
  const lookup = new SourceDocumentLookup(docs);
  assert.equal(lookup.forVideo({ video_id: "v1", url: "https://youtu.be/v1" })?.source_id, "youtube_description:v1");
  assert.equal(lookup.forVideo({ video_id: "v2", url: "" })?.source_id, "youtube_description:v2"); // source_id 一致
  assert.equal(lookup.forVideo({ video_id: "nope", url: "https://youtu.be/v2" })?.source_id, "youtube_description:v2"); // url 一致
  // ref_id は v2 の文書に、url は v1 の文書に当たる → 配列順で先の v1
  assert.equal(lookup.forVideo({ video_id: "other", url: "https://youtu.be/v1" })?.source_id, "youtube_description:v1");
});

test("source_type が違う文書は混ざらない", () => {
  const lookup = new SourceDocumentLookup(docs);
  assert.equal(lookup.forVideo({ video_id: "a1", url: "https://note.com/x/n/a1" }), undefined);
  assert.equal(lookup.forArticle("v1"), undefined);
});

test("文書が無い・空のときは undefined", () => {
  assert.equal(new SourceDocumentLookup([]).forArticle("a1"), undefined);
  assert.equal(new SourceDocumentLookup(undefined).forVideo({ video_id: "v1" }), undefined);
});

test("url が無い動画は url 欄が無い文書 (undefined キー) に当たってしまわない", () => {
  // キーは値そのもので登録するので undefined 同士は一致する (線形 find の === と同じ)。その契約を明示しておく。
  const lookup = new SourceDocumentLookup([{ source_id: "youtube_description:x", source_type: "youtube_description", source_ref_id: "x" }]);
  assert.equal(lookup.forVideo({ video_id: "y" })?.source_id, "youtube_description:x");
  assert.equal(lookup.forVideo({ video_id: "y", url: "" }), undefined);
});
