#!/usr/bin/env node
// 基本の HTML 部品 (ui/parts/basic.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { badge, badges, details, dl, fold, grid, item, section, textFold } from "../../docs/assets/js/ui/parts/basic.js";

test("badge は空値で何も出さず、ラベルと種別をエスケープする", () => {
  assert.equal(badge(""), "");
  assert.equal(badge(null), "");
  assert.equal(badge(0), '<span class="badge">0</span>');
  assert.equal(badge("<b>", "so\"ft"), '<span class="badge badge-so&quot;ft">&lt;b&gt;</span>');
  assert.equal(badges(["", badge("a"), null]), '<div class="badges"><span class="badge">a</span></div>');
  assert.equal(badges(["", null]), "");
});

test("dl は空の値の行を省き、値は組み立て済み HTML として埋め込む", () => {
  assert.equal(dl([["a", ""], ["b", null], ["c", undefined]]), "");
  assert.equal(dl([["ラベル<", "<code>v</code>"], ["x", 0]], "dl-inline"), '<dl class="dl dl-inline"><div class="dl-row"><dt>ラベル&lt;</dt><dd><code>v</code></dd></div><div class="dl-row"><dt>x</dt><dd>0</dd></div></dl>');
});

test("details は定義リストが空なら出さず、open を反映する", () => {
  assert.equal(details([["a", ""]]), "");
  assert.equal(details([["a", "v"]]), '<details class="fold fold-details"><summary>詳細</summary><dl class="dl"><div class="dl-row"><dt>a</dt><dd>v</dd></div></dl></details>');
  assert.match(details([["a", "v"]], "メモ", { open: true }), /^<details class="fold fold-details" open><summary>メモ<\/summary>/);
});

test("fold / textFold / section / grid / item", () => {
  assert.equal(fold("本文", ""), "");
  assert.equal(fold("本文", "<p>x</p>", { className: "fold-inline", count: "3件", open: true }), '<details class="fold fold-inline" open><summary>本文 <span class="fold-count">3件</span></summary><div class="fold-body"><p>x</p></div></details>');
  assert.equal(textFold("本文", ""), "");
  assert.equal(textFold("本文", "a<b\n2行目"), '<details class="fold"><summary>本文</summary><div class="fold-body"><pre class="pre">a&lt;b\n2行目</pre></div></details>');
  assert.equal(section("題", ""), "");
  assert.equal(section("題&", "<p>x</p>", "sec-x"), '<section class="sec sec-x"><h3 class="sec-title">題&amp;</h3><p>x</p></section>');
  assert.equal(grid(""), "");
  assert.equal(grid("<i></i>"), '<div class="grid"><i></i></div>');
  assert.equal(item("<p>x</p>"), '<div class="item"><p>x</p></div>');
  assert.equal(item("<p>x</p>", "item-bout"), '<div class="item item-bout"><p>x</p></div>');
});
