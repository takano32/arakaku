#!/usr/bin/env node
// mdToHtml のユニットテスト (DOM 不要・依存ゼロ、Node 標準の node:test を使用)。
// 公式ニュース本文は第三者リポジトリから取り込むので、リンクや iframe から属性・スクリプトを注入できないことを確かめる。
import test from "node:test";
import assert from "node:assert/strict";

import { mdToHtml } from "../docs/assets/js/ui/markdown.js";

test("http(s) のリンクは a 要素になる", () => {
  assert.equal(
    mdToHtml("[公式](https://example.com/a?x=1&y=2)"),
    '<p><a href="https://example.com/a?x=1&amp;y=2" target="_blank" rel="noopener">公式</a></p>',
  );
});

test("javascript: など http(s) 以外のリンクは文字のまま", () => {
  for (const md of ["[a](javascript:alert(1))", "[a](JavaScript:alert(1))", "[a](data:text/html,x)", "[a](//evil.example)"]) {
    const html = mdToHtml(md);
    assert.ok(!html.includes("<a "), `${md} -> ${html}`);
  }
});

test("リンクの URL から属性を注入できない", () => {
  const html = mdToHtml('[a](https://x" onmouseover="alert(1))');
  assert.ok(!html.includes('" onmouseover'), html);
});

test("HTML タグは文字としてエスケープされる", () => {
  assert.equal(mdToHtml("<script>alert(1)</script>"), "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
});

test("箇条書きの後の段落にも p が付く", () => {
  assert.equal(mdToHtml("- x\n- y\n\ntext"), "<ul><li>x</li>\n<li>y</li></ul>\n<p>text</p>");
});

test("許可ホストの iframe 行だけ埋め込み、ほかはリンクか文字", () => {
  const ok = mdToHtml('<iframe src="https://tiget.net/events/1/widgets" width="255" height="470"></iframe>');
  assert.ok(ok.includes('<iframe class="md-embed" src="https://tiget.net/events/1/widgets"'), ok);
  const other = mdToHtml('<iframe src="https://evil.example/x"></iframe>');
  assert.ok(!other.includes("<iframe") && other.includes('<a href="https://evil.example/x"'), other);
  const js = mdToHtml('<iframe src="javascript:alert(1)"></iframe>');
  assert.ok(!js.includes("<iframe") && !js.includes("<a "), js);
});
