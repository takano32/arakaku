#!/usr/bin/env node
// 画面の枠の HTML (ui/render/*.js の純関数: ナビ・件数・エラー・絞り込み・見出し) のユニットテスト
// (DOM 不要・依存ゼロ、node:test)。DOM に当てる Renderer クラスはブラウザで確認する。
import test from "node:test";
import assert from "node:assert/strict";

import { ADMIN_TABS, PUBLIC_TABS } from "../../docs/assets/js/config.js";
import { TAB_FILTERS } from "../../docs/assets/js/data/filters.js";
import { alertsHtml, fatalErrorHtml, showFatalError } from "../../docs/assets/js/ui/render/alerts.js";
import { filterRowHtml, filterRows, mentionTypeRowHtml, sortMentionTypes } from "../../docs/assets/js/ui/render/filters.js";
import { navHtml, navItemHtml, pageTitle } from "../../docs/assets/js/ui/render/nav.js";
import { dataCounts, statsHtml } from "../../docs/assets/js/ui/render/stats.js";
import { focusChipHtml, focusChipLabel, toolbarMainHtml } from "../../docs/assets/js/ui/render/toolbar.js";

test("ナビは公開タブと管理タブを並べ、現在のタブにだけ aria-current、管理タブなら details を開く", () => {
  assert.equal(navItemHtml("bouts", "試合", "bouts"), '<li><a class="nav-link" href="?tab=bouts" data-tab="bouts" aria-current="page">試合</a></li>');
  assert.equal(navItemHtml("bouts", "試合", "events"), '<li><a class="nav-link" href="?tab=bouts" data-tab="bouts">試合</a></li>');
  const html = navHtml("sources", true);
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  assert.equal((html.match(/<li>/g) ?? []).length, PUBLIC_TABS.length + ADMIN_TABS.length);
  assert.match(html, /<details class="nav-admin" open>/);
  assert.match(navHtml("official", false), /<details class="nav-admin">/);
  assert.equal(pageTitle("bouts"), "試合 | Unofficial ARAKAKU Database");
  assert.equal(pageTitle("nope"), "Unofficial ARAKAKU Database | Unofficial ARAKAKU Database");
});

test("件数は未ロードのものを「…」にし、選手は関係キーが揃ってから rich の件数を使う", () => {
  const data = { promotions: [1], events: [1, 2], bouts: [1, 2, 3], fighters: [1, 2], titles: [], videos: [1], sourceDocuments: [1, 2, 3, 4], sourceEventReferences: [1], sourceBoutReferences: [1, 1], sourceVideoReferences: [] };
  const repo = { numbersOnlyEvents: [1], numbersOnlyBouts: [1, 1], richFighters: [1, 2, 3] };
  const partial = dataCounts({ data, loadedDataKeys: new Set(["fighters"]) }, repo);
  assert.deepEqual(partial.map((c) => c[1]), [1, 2, 3, 2, 0, 1, "…", "…"]);
  const full = dataCounts({ data, loadedDataKeys: new Set(["fighters", "numbersFighters", "numbersNameMatches", "officialPlayers", "numbersFightRecords", "sourceDocuments", "sourceEventReferences", "sourceBoutReferences", "sourceVideoReferences"]) }, repo);
  assert.deepEqual(full.map((c) => c[1]), [1, 3, 5, 3, 0, 1, 4, 3]);
  assert.deepEqual(full.map((c) => c[2]), ["promotions", "events", "bouts", "fighters", "titles", "videos", "sources", "sources"]);
  assert.equal(statsHtml([["出典候補", "…", "sources"]]), '<a class="stat-cell" href="?tab=sources" data-tab="sources" title="出典本文を表示"><span class="stat-num">…</span><span class="stat-label">出典候補</span></a>');
});

test("読み込み失敗は DATA_FILES のファイル名で一覧にし、無ければ空", () => {
  assert.equal(alertsHtml({}), "");
  assert.equal(alertsHtml(undefined), "");
  const html = alertsHtml({ fighters: "HTTP 404", mystery: "x<y" });
  assert.match(html, /^<div class="alert" role="alert"><p class="alert-title">データ読み込み失敗<\/p><ul><li><code>fighters\.json<\/code> HTTP 404<\/li><li><code>mystery<\/code> x&lt;y<\/li><\/ul>/);
});

test("読み込み全体の失敗はメッセージをエスケープして host に出し、host が無ければ何もしない", () => {
  const html = '<div class="alert" role="alert"><p class="alert-title">読み込みに失敗しました</p><p>a&lt;b</p></div>';
  assert.equal(fatalErrorHtml("a<b"), html);
  const host = { innerHTML: "" };
  showFatalError(host, new Error("a<b"));
  assert.equal(host.innerHTML, html);
  assert.doesNotThrow(() => showFatalError(null, new Error("x")));
});

test("言及種別は MENTION_TYPE_ORDER の順、知らない種別は後ろに日本語順、空値と重複は除く", () => {
  assert.deepEqual(sortMentionTypes(["result", "zzz", "event", "", "result", "aaa", null, "note_url"]), ["event", "result", "note_url", "aaa", "zzz"]);
});

test("絞り込みのチップは選択値に is-active と aria-pressed を付け、出典言及タブは種別セレクトの行を足す", () => {
  const group = TAB_FILTERS.bouts[0];
  const row = filterRowHtml(group, "middleweight");
  assert.match(row, /^<div class="filter-row"><span class="filter-label">階級<\/span><div class="chips">/);
  assert.match(row, /class="chip is-active" aria-pressed="true"\n\s+data-filter-type="division" data-filter-val="middleweight">ミドル<\/button>/);
  assert.match(row, /class="chip" aria-pressed="false"\n\s+data-filter-type="division" data-filter-val="other">その他<\/button>/);
  assert.equal((row.match(/<button/g) ?? []).length, 4);
  const select = mentionTypeRowHtml(["event", "result"], "result");
  assert.equal(select, '<div class="filter-row"><label class="filter-label" for="mention-type">種別</label><select id="mention-type" class="select"><option value="">すべての言及</option><option value="event">大会 / event</option><option value="result" selected>結果 / result</option></select></div>');
  const state = { boutDivision: "", boutPromotion: "target", mentionType: "" };
  assert.equal(filterRows(state, TAB_FILTERS.bouts).length, 2);
  assert.deepEqual(filterRows(state, []), []);
  assert.equal(filterRows(state, [], []).length, 1); // 出典言及タブは種別が 0 でもセレクトを出す
});

test("見出しは件数が負なら件数を出さず、飛び先のチップは選手 → 大会 → 試合の順に 1 つだけ", () => {
  const repo = { fighterName: (id) => `選手${id}`, eventName: (id) => `大会${id}`, findRichBout: (id) => (id === "b1" ? { matchup: "A vs B" } : undefined) };
  assert.equal(focusChipLabel({ focusFighterId: "", focusEventId: "", focusBoutId: "" }, repo), "");
  assert.equal(focusChipLabel({ focusFighterId: "f", focusEventId: "e", focusBoutId: "b1" }, repo), "選手: 選手f");
  assert.equal(focusChipLabel({ focusFighterId: "", focusEventId: "e", focusBoutId: "b1" }, repo), "大会: 大会e");
  assert.equal(focusChipLabel({ focusFighterId: "", focusEventId: "", focusBoutId: "b1" }, repo), "試合: A vs B");
  assert.equal(focusChipLabel({ focusFighterId: "", focusEventId: "", focusBoutId: "zz" }, repo), "試合: zz");
  assert.equal(focusChipHtml(""), "");
  assert.equal(focusChipHtml("選手: <A>"), '<span class="focus-chip">選手: &lt;A&gt;<button type="button" id="focus-clear" class="focus-clear" aria-label="絞り込みを解除">✕</button></span>');
  assert.equal(toolbarMainHtml("試合", 12, ""), '\n      <h1 class="section-title" tabindex="-1">試合<span class="section-count">12 件</span></h1>\n      \n    ');
  assert.equal(toolbarMainHtml(undefined, -1, "<i></i>"), '\n      <h1 class="section-title" tabindex="-1"><span class="section-count"></span></h1>\n      <i></i>\n    ');
});
