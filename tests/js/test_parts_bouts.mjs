#!/usr/bin/env node
// 試合の表記 (ui/parts/bouts.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import {
  boutDecisionLine,
  boutMatchup,
  boutResultLine,
  boutResultSummary,
  eventBouts,
  fighterRows,
  relatedBout,
  relatedBouts,
} from "../../docs/assets/js/ui/parts/bouts.js";

const repo = {
  fighterName: (id) => ({ a: "選手A", b: "選手<B>" })[id] ?? id,
  eventName: (id) => ({ "target-10": "ターゲット No.10" })[id] ?? id,
  videosForEntity: () => [],
  relatedBoutsForFighter: (id) => (id === "a" ? [bout] : []),
  boutsForEvent: (id) => (id === "target-10" ? [{ ...bout, bout_order: 3 }] : []),
};
const bout = {
  bout_id: "target-10-3", event_id: "target-10", result_status: "known",
  fighters: [{ fighter_id: "a", name: "選手A", side: "red", result: "win" }, { fighter_id: "b", name: "選手<B>", side: "blue", result: "loss" }],
  winner_id: "a", winner: "選手A", loser_id: "b", loser: "選手<B>", result: { round: 2, time: "1:30", method_raw: "KO", method_normalized: "KO", technique: "右フック" },
};

test("対戦カードは fighters[] を最優先し、勝者を winner で囲む (勝敗不明なら囲まない)", () => {
  const html = boutMatchup(repo, bout);
  assert.match(html, /^<span class="winner"><button[^>]*data-fighter-id="a"[^>]*>選手A<\/button><\/span> <span class="vs">vs<\/span> <button[^>]*data-fighter-id="b"/);
  assert.doesNotMatch(boutMatchup(repo, { ...bout, result_status: "unknown" }), /winner/);
  assert.match(boutMatchup(repo, { bout_id: "x", winner: "W", loser: "L", winner_id: "", loser_id: "" }), /^<span class="winner"><span class="name">W<\/span><\/span> <span class="vs">vs<\/span> <span class="name">L<\/span>$/);
  assert.equal(boutMatchup(repo, { bout_id: "x", matchup: "A vs <B>" }), "A vs &lt;B&gt;");
  assert.equal(boutMatchup(repo, { bout_id: "id<1>" }), "id&lt;1&gt;");
});

test("勝敗の要約・決着の 1 行・決まり手", () => {
  assert.match(boutResultSummary(repo, bout), /data-fighter-id="a".*<span class="def">def\.<\/span>.*data-fighter-id="b"/);
  assert.equal(boutResultSummary(repo, { ...bout, result_status: "unknown" }), "");
  assert.equal(boutResultSummary(repo, { bout_id: "x", winner: "", loser: "" }), "");
  assert.equal(boutResultLine(bout), "2R 1:30 KO");
  assert.equal(boutResultLine({ result: { method_raw: "1R 1:37 KO(大外刈り)\nメジャーデビュー戦", round: 1 } }), "1R 1:37 KO(大外刈り) / メジャーデビュー戦");
  assert.equal(boutDecisionLine(bout), "KO 右フック");
  assert.equal(boutDecisionLine({}), "");
  assert.equal(fighterRows(repo, bout).replace(/\s+/g, " ").trim(), '<li><button type="button" class="link link-fighter" data-fighter-id="a" data-fighter-name="選手A">選手A</button> <span class="muted">赤コーナー / 勝ち</span></li> <li><button type="button" class="link link-fighter" data-fighter-id="b" data-fighter-name="選手&lt;B&gt;">選手&lt;B&gt;</button> <span class="muted">青コーナー / 負け</span></li>');
});

test("関連試合カードは選手ページで大会名、大会ページで試合順を見出しにする", () => {
  const forFighter = relatedBout(repo, bout, { showEvent: true });
  assert.match(forFighter, /<p class="item-head"><span class="small"><button[^>]*data-event-id="target-10"/);
  assert.match(forFighter, /<p class="result">.*def\./);
  assert.match(forFighter, /<p class="small">2R 1:30 KO<\/p>/);
  assert.match(forFighter, /data-bout-id="target-10-3">試合の詳細へ<\/button>/);
  const forEvent = relatedBout(repo, { ...bout, bout_order: 3, numbers_records: [{}], numbers_only: true }, { showOrder: true });
  assert.match(forEvent, /<p class="item-head"><span class="muted small">第3試合<\/span><\/p>/);
  assert.match(forEvent, /<span class="badge badge-numbers">名鑑<\/span> <span class="badge badge-numbers">名鑑のみ<\/span>/);
  assert.equal(relatedBouts(repo, "zzz"), '<p class="muted">関連試合はまだ登録されていません。</p>');
  assert.match(relatedBouts(repo, "a"), /^<section class="sec sec-bouts"><h3 class="sec-title">関連試合（1）<\/h3><div class="grid"><div class="item item-bout">/);
  assert.match(eventBouts(repo, "target-10"), /^<section class="sec sec-bouts"><h3 class="sec-title">試合（1）<\/h3>/);
  assert.equal(eventBouts(repo, "none"), '<p class="muted">関連試合はまだ登録されていません。</p>');
});
