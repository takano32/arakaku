#!/usr/bin/env node
// 一覧の行の HTML の部品 (ui/list/row_html.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { renderErrorHtml, rowShellHtml, safeRender, toggleLabel } from "../../docs/assets/js/ui/list/row_html.js";

test("行の枠のテンプレート", () => {
  assert.equal(rowShellHtml(), `
      <div class="rec-head">
        <div class="rec-main"></div>
        <button type="button" class="rec-toggle" aria-expanded="false" aria-label="詳細を開く"><span class="chev" aria-hidden="true"></span></button>
      </div>
      <div class="rec-body" hidden></div>
    `);
});

test("開閉ボタンのラベルは、見出しがあれば含める", () => {
  assert.equal(toggleLabel(false, "A vs B"), "詳細を開く: A vs B");
  assert.equal(toggleLabel(true, "A vs B"), "詳細を閉じる: A vs B");
  assert.equal(toggleLabel(false, ""), "詳細を開く");
  assert.equal(toggleLabel(true, undefined), "詳細を閉じる");
});

test("描画エラーの HTML はメッセージをエスケープする", () => {
  assert.equal(renderErrorHtml("<b>&"), '<p class="render-error">描画エラー: &lt;b&gt;&amp;</p>');
});

test("safeRender は成功すればそのまま、例外ならエラーの HTML を返してコンソールに出す", (t) => {
  assert.equal(safeRender((x) => `<i>${x}</i>`, "a", "renderHead"), "<i>a</i>");
  const logged = [];
  t.mock.method(console, "error", (...args) => logged.push(args));
  const html = safeRender(() => { throw new Error("x < y"); }, { id: 1 }, "renderBody");
  assert.equal(html, '<p class="render-error">描画エラー: x &lt; y</p>');
  assert.equal(logged.length, 1);
  assert.equal(logged[0][0], "RecordList: renderBody failed");
});
