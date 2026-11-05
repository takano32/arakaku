#!/usr/bin/env node
// 描画層の純粋な HTML ヘルパ (ui/html.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import {
  booleanJa,
  boutResultText,
  codeList,
  escapeHtml,
  externalLink,
  formatDate,
  joinPresent,
  recordText,
  textList,
  uniqueSorted,
  winRatePercent,
} from "../../docs/assets/js/ui/html.js";

test("escapeHtml は & を先に置き換え、5 文字をエスケープし、null は空", () => {
  assert.equal(escapeHtml(`<a href="x">&'</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&#039;&lt;/a&gt;");
  assert.equal(escapeHtml("&lt;"), "&amp;lt;");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml(0), "0");
});

test("空欄を除いて連結し、一覧は重複と空を除いて日本語順", () => {
  assert.equal(joinPresent(["a", "", null, "b"]), "a / b");
  assert.equal(joinPresent(["a", "b"], " - "), "a - b");
  assert.equal(joinPresent(undefined), "");
  assert.deepEqual(uniqueSorted(["い", "あ", "", "い"]), ["あ", "い"]);
});

test("真偽は「あり / なし」、未設定は空", () => {
  assert.equal(booleanJa(true), "あり");
  assert.equal(booleanJa(false), "なし");
  assert.equal(booleanJa(null), "");
  assert.equal(booleanJa(undefined), "");
});

test("code と文字の一覧はエスケープしてカンマで連結し、空なら空", () => {
  assert.equal(codeList(["a<", "", "b"]), "<code>a&lt;</code>, <code>b</code>");
  assert.equal(codeList([]), "");
  assert.equal(codeList(undefined), "");
  assert.equal(textList(["a<", null, "b"]), "a&lt;, b");
  assert.equal(textList([]), "");
});

test("外部リンクは http(s) だけをリンクにし、javascript: などは code で出す", () => {
  assert.equal(externalLink("https://example.com/?a=1&b=2", "例"), '<a href="https://example.com/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">例</a>');
  assert.equal(externalLink("HTTP://example.com", "x", "c"), '<a class="c" href="HTTP://example.com" target="_blank" rel="noopener noreferrer">x</a>');
  assert.equal(externalLink("javascript:alert(1)", "<x>"), "<code>&lt;x&gt;</code>");
  assert.equal(externalLink("", "y"), "<code>y</code>");
  assert.equal(externalLink(undefined, "z"), "<code>z</code>");
});

test("決着はラウンド・時間・決まり手を連結する", () => {
  assert.equal(boutResultText({ result: { round: 3, time: "4:21", method_raw: "KO" } }), "3R 4:21 KO");
  assert.equal(boutResultText({ result: { round: null, time: "", method_raw: "判定" } }), "判定");
  assert.equal(boutResultText({ result: {} }), "");
  assert.equal(boutResultText({}), "");
});

test("決まり手が「1R …」で始まるならラウンドと時間を重ねず、改行は / で 1 行にする", () => {
  assert.equal(boutResultText({ result: { round: 1, time: "1:37", method_raw: "1R 1:37 KO(大外刈り)" } }), "1R 1:37 KO(大外刈り)");
  assert.equal(boutResultText({ result: { method_raw: "2R 判定0-3 \nエンペラーライト級王座陥落" } }), "2R 判定0-3 / エンペラーライト級王座陥落");
  assert.equal(boutResultText({ result: { round: 2, method_raw: "判定\n注記" } }), "2R 判定 / 注記");
  assert.equal(boutResultText({ result: { round: 2, method_raw: "10Rounds" } }), "2R 10Rounds"); // 「数字R」の後が語の続きなら接頭辞ではない
});

test("勝率は 0〜1 の分数をパーセント 1 桁に、数でなければ空", () => {
  assert.equal(winRatePercent("0.833"), "83.3%");
  assert.equal(winRatePercent(1), "100.0%");
  assert.equal(winRatePercent("0"), "0.0%");
  assert.equal(winRatePercent(""), "");
  assert.equal(winRatePercent(null), "");
  assert.equal(winRatePercent("abc"), "");
});

test("戦績は「N戦 X勝 Y敗 Z分 (勝率 R%)」、0 分と無い項目は出さない", () => {
  assert.equal(recordText({ fight_count: 6, wins: 5, losses: 1, draws: 0, win_rate: "0.833" }), "6戦 5勝 1敗 (勝率 83.3%)");
  assert.equal(recordText({ fight_count: null, wins: 45, losses: 14, draws: 2, win_rate: null }), "45勝 14敗 2分");
  assert.equal(recordText({ fight_count: 0, wins: 0, losses: 0 }), "0戦 0勝 0敗");
  assert.equal(recordText({}), "");
});

test("日付は YYYYMMDD だけを YYYY-MM-DD にし、ほかはそのまま", () => {
  assert.equal(formatDate("20250111"), "2025-01-11");
  assert.equal(formatDate(" 2025-01-11 "), "2025-01-11");
  assert.equal(formatDate("2025"), "2025");
  assert.equal(formatDate(null), "");
});
