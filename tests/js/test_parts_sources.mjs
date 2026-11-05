#!/usr/bin/env node
// 出典の HTML 部品 (ui/parts/sources.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import {
  articleRef,
  articleRefList,
  articleRefs,
  referenceMentionBadges,
  referenceSortValue,
  sourceBody,
  sourceDocumentDetail,
  sourceDocumentLink,
  sourceMentionLink,
  sourceReferenceCounts,
  sourceReferenceSummary,
  sourceReferences,
  splitTokens,
  uniqueSourceReferences,
} from "../../docs/assets/js/ui/parts/sources.js";

const repo = {
  findRichArticle: (id) => (id === "a1" ? { url: "https://note.com/x/n/a1", title: "記事題" } : undefined),
  sourceDocumentForArticle: (id) => (id === "a1" ? { content_text: "本文" } : undefined),
  countSourceReferences: (sid) => (sid === "s1" ? { events: 1, bouts: 2, videos: 0 } : { events: 0, bouts: 0, videos: 0 }),
  sourceDocumentById: (id) => (id === "s1" ? { source_type: "note_article", url: "https://note.com/x/n/a1", title: "文書題", source_ref_id: "a1", content_text: "本文" } : undefined),
};

test("記事参照はアーカイブ題のリンクと本文の折りたたみ、未知 ID は code", () => {
  assert.equal(articleRef(repo, "a1"), '<span class="ref"><a href="https://note.com/x/n/a1" target="_blank" rel="noopener noreferrer">記事題</a><details class="fold fold-inline"><summary>本文を表示</summary><div class="fold-body"><pre class="pre">本文</pre></div></details></span>');
  assert.equal(articleRef(repo, "zz"), '<span class="ref"><code>zz</code></span>');
  assert.equal(articleRefs(repo, []), "未入力");
  assert.equal(articleRefs(repo, "zz"), '<span class="ref"><code>zz</code></span>');
  assert.equal(articleRefList(repo, [""]), "");
  assert.match(articleRefList(repo, ["a1", "zz"], "出典"), /^<section class="sec sec-articles"><h3 class="sec-title">出典<\/h3><ul class="ref-list"><li><span class="ref">/);
});

test("出典文書のリンク・本文・候補件数・言及リンク", () => {
  const d = repo.sourceDocumentById("s1");
  assert.match(sourceDocumentLink(d), /^<span class="ref"><a href="https:\/\/note\.com\/x\/n\/a1"[^>]*>文書題<\/a><details class="fold fold-inline">/);
  assert.equal(sourceDocumentLink(undefined, "", "https://x.example/"), '<span class="ref"><a href="https://x.example/" target="_blank" rel="noopener noreferrer">出典</a></span>');
  assert.equal(sourceDocumentLink({ source_type: "youtube_description", content_text: "x", url: "https://y.example/" }, "題"), '<span class="ref"><a href="https://y.example/" target="_blank" rel="noopener noreferrer">題</a></span>');
  assert.equal(sourceBody({ content_text: "" }), '<p class="muted">本文は空です。</p>');
  assert.match(sourceBody({ content_text: "本文" }), /^<details class="fold"><summary>本文を表示<\/summary>/);
  assert.equal(sourceReferenceCounts(repo, "none"), "");
  assert.equal(sourceReferenceCounts(repo, "s1"), '<div class="badges"><span class="badge">大会候補 1</span><span class="badge">試合候補 2</span><span class="badge">動画候補 0</span></div>');
  assert.equal(sourceMentionLink(repo, { source_id: "zz" }), '<span class="muted">zz</span>');
  assert.equal(sourceMentionLink(repo, { source_id: "s1", line_number: 12 }), '<span class="muted">note本文 / <a href="https://note.com/x/n/a1" target="_blank" rel="noopener noreferrer">文書題</a> / line 12</span>');
});

test("出典候補のトークン・バッジ・ソートキー・重複除去", () => {
  assert.deepEqual(splitTokens(" a | b|| c "), ["a", "b", "c"]);
  assert.deepEqual(splitTokens(undefined), []);
  assert.equal(referenceMentionBadges({ mention_types: "matchup:2|result|zzz:1" }), '<span class="badge">対戦カード 2</span><span class="badge">結果</span><span class="badge">zzz 1</span>');
  assert.equal(referenceSortValue({ confidence: "high", source_title: "T", candidate_id: "c" }), "0:T:c");
  assert.equal(referenceSortValue({ confidence: "weird" }), "3::");
  assert.deepEqual(uniqueSourceReferences([{ candidate_id: "c1", n: 1 }, { candidate_id: "c2" }, { candidate_id: "c1", n: 2 }]).map((r) => [r.candidate_id, r.n]), [["c1", 2], ["c2", undefined]]);
});

test("出典候補の折りたたみは確度順の上位 5 件だけ出し、件数を見出しに添える", () => {
  const refs = ["low", "high", "medium", undefined, "high", "low", "medium"].map((confidence, i) => ({ candidate_id: `c${i}`, confidence, source_id: "s1", source_type: "note_article", source_title: `T${i}`, matched_texts: "a|b|c|d", line_numbers: "3" }));
  assert.equal(sourceReferences(repo, []), "");
  const html = sourceReferences(repo, refs);
  assert.match(html, /^<details class="fold fold-references"><summary>出典候補 <span class="fold-count">上位5件<\/span><\/summary><div class="fold-body"><div class="grid">/);
  assert.equal((html.match(/item item-reference/g) ?? []).length, 5);
  assert.ok(html.indexOf("候補 high") < html.indexOf("候補 medium") && html.indexOf("候補 medium") < html.indexOf("候補 low"));
  assert.match(html, /<p class="small">a \/ b \/ c<\/p>/);
  assert.match(html, /<p class="muted small">line 3<\/p>/);
  assert.match(sourceReferences(repo, refs.slice(0, 2), "候補"), /<summary>候補 <span class="fold-count">2件<\/span>/);
  assert.match(sourceReferences(repo, [{ candidate_id: "x", source_id: "zz" }]), /候補 unknown/);
});

test("文書の本文の折りたたみは note 本文で本文があるときだけ", () => {
  assert.equal(sourceDocumentDetail({ source_type: "note_article", content_text: "a<b" }), '<details class="fold fold-inline"><summary>本文を表示</summary><div class="fold-body"><pre class="pre">a&lt;b</pre></div></details>');
  assert.equal(sourceDocumentDetail({ source_type: "youtube_description", content_text: "x" }), "");
  assert.equal(sourceDocumentDetail({ source_type: "note_article", content_text: "" }), "");
  assert.equal(sourceDocumentDetail(undefined), "");
});

test("出典候補 1 件の要約: 文書へのリンク・確度・種別・一致テキストの先頭 3 件・行番号", () => {
  const html = sourceReferenceSummary(repo, {
    source_id: "s1", source_type: "note_article", source_title: "候補題", source_url: "https://note.com/x/n/a1",
    confidence: "", mention_types: "event:2", matched_texts: "一 | 二 | 三 | 四", line_numbers: "7 | 14",
  });
  assert.match(html, /^<div class="item item-reference">/);
  assert.match(html, /note本文 \/ <span class="ref"><a href="https:\/\/note\.com\/x\/n\/a1"[^>]*>候補題<\/a><details class="fold fold-inline">/);
  assert.match(html, /<span class="badge badge-soft">候補 unknown<\/span><span class="badge">大会 2<\/span>/);
  assert.match(html, /<p class="small">一 \/ 二 \/ 三<\/p>/);
  assert.match(html, /<p class="muted small">line 7 \| 14<\/p>/);
  assert.doesNotMatch(sourceReferenceSummary(repo, { source_id: "none", source_type: "note_article" }), /line |<p class="small">/);
});
