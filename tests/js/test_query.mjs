#!/usr/bin/env node
// フリーテキスト検索 (query.js / search_text.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
// repo は検索テキストが参照するメソッドだけ持つ偽物を渡す。
import test from "node:test";
import assert from "node:assert/strict";

import { QueryMatcher, matchesTerms, normalizeSearchText, queryTerms } from "../../docs/assets/js/data/query.js";
import { boutSearchText, fighterSearchText, sourceReferenceSearchText, videoSearchText } from "../../docs/assets/js/data/search_text.js";

test("正規化: NFKC・小文字化・ひらがな→カタカナ・空白の圧縮", () => {
  assert.equal(normalizeSearchText("ＴＡＲＧＥＴ"), "target");
  assert.equal(normalizeSearchText("ﾀｰｹﾞｯﾄ"), "ターゲット");
  assert.equal(normalizeSearchText("たーげっと"), "ターゲット");
  assert.equal(normalizeSearchText("  a 　 b\n c "), "a b c");
  assert.equal(normalizeSearchText(null), "");
  assert.deepEqual(queryTerms(" ターゲット　らいと "), ["ターゲット", "ライト"]);
  assert.deepEqual(queryTerms(""), []);
  assert.equal(matchesTerms("ターゲット ライト級", ["ターゲット", "ライト"]), true);
  assert.equal(matchesTerms("ターゲット ライト級", ["ターゲット", "ヘビー"]), false);
  assert.equal(matchesTerms("anything", []), true);
});

function fakeRepo(revision = 1) {
  return {
    revision,
    calls: 0,
    promotionName: (id) => ({ target: "ターゲット", emperor: "エンペラー" })[id] ?? id,
    eventName: (id) => ({ "target-10": "ターゲット No.10" })[id] ?? id,
    fighterSnapshotsForFighter() { this.calls++; return [{ snapshot_id: "s1", gym: "道場X", record_text: "3戦2勝" }]; },
    sourceReferencesForBout: () => [{ candidate_id: "c1", source_title: "結果記事", matched_texts: "A def. B" }],
    sourceDocumentById: (id) => (id === "note:a" ? { title: "本文題", url: "https://note.com/a" } : undefined),
    getRichVideoInfo: (v) => ({ ...v, title: "アーカイブ題", archive_metadata: {} }),
    sourceContextForVideo: () => ({ reference: { content_preview: "参照プレビュー" }, document: { content_preview: "文書プレビュー" } }),
  };
}

test("includes は空の検索語で真、語はすべて含む必要がある (AND)、表記ゆれも一致", () => {
  const state = { query: "", mentionType: "" };
  const q = new QueryMatcher(state, () => fakeRepo());
  assert.equal(q.includes(["x"]), true);
  state.query = "ﾀｰｹﾞｯﾄ らいと";
  assert.equal(q.includes(["ターゲット", null, "ライト級"]), true);
  assert.equal(q.includes(["ターゲット", "ヘビー級"]), false);
});

test("選手は団体名・出典別プロフィールでも引け、テキストは revision が進むまで 1 回だけ作る", () => {
  const repo = fakeRepo(1);
  const state = { query: "", mentionType: "" };
  const q = new QueryMatcher(state, () => repo);
  const fighter = { fighter_id: "f1", display_name: "A", main_promotion_id: "target" };
  state.query = "ターゲット";
  assert.equal(q.fighterMatches(fighter), true);
  state.query = "道場x";
  assert.equal(q.fighterMatches(fighter), true);
  state.query = "エンペラー";
  assert.equal(q.fighterMatches(fighter), false);
  assert.equal(repo.calls, 1);
  repo.revision = 2;
  state.query = "ターゲット";
  assert.equal(q.fighterMatches(fighter), true);
  assert.equal(repo.calls, 2);
});

test("試合は大会名・団体名・出典候補のテキストでも引ける", () => {
  const repo = fakeRepo();
  const bout = { bout_id: "target-10-1", event_id: "target-10", promotion_id: "target", fighters: [{ name: "A" }, { name: "B" }], result: { method_raw: "KO" } };
  const text = boutSearchText(repo, bout).filter(Boolean).join(" ");
  assert.match(text, /ターゲット No\.10/);
  assert.match(text, /結果記事/);
  assert.match(text, /A def\. B/);
  const q = new QueryMatcher({ query: "no.10 ko", mentionType: "" }, () => repo);
  assert.equal(q.boutMatches(bout), true);
  assert.equal(sourceReferenceSearchText({ candidate_id: "c", notes: null, confidence: "high" }), "c high");
});

test("動画はアーカイブ未適用なら 1 件だけ補完して検索対象にし、出典の文脈も含める", () => {
  const repo = fakeRepo();
  const values = videoSearchText(repo, { video_id: "v1", title: "元題" });
  assert.ok(values.includes("アーカイブ題"));
  assert.ok(values.includes("参照プレビュー"));
  assert.ok(values.includes("文書プレビュー"));
  assert.equal(fighterSearchText(repo, { fighter_id: "f", main_promotion_id: "emperor" }).includes("エンペラー"), true);
});

test("言及は種別フィルタを先に見て、出典文書の題名・URL でも引ける", () => {
  const state = { query: "", mentionType: "" };
  const q = new QueryMatcher(state, () => fakeRepo());
  const mention = { mention_id: "m1", mention_type: "result", source_id: "note:a", matched_text: "A 勝利" };
  assert.equal(q.mentionMatches(mention), true);
  state.mentionType = "event";
  assert.equal(q.mentionMatches(mention), false);
  state.mentionType = "result";
  state.query = "本文題";
  assert.equal(q.mentionMatches(mention), true);
  state.query = "note.com/a";
  assert.equal(q.mentionMatches(mention), true);
});
