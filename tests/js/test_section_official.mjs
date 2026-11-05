#!/usr/bin/env node
// 公式タブ (ui/sections/official.js) の build() と本文 HTML の整形を確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { OFFICIAL_SITE_URL } from "../../docs/assets/js/config.js";
import { officialBodyHtml, officialSection } from "../../docs/assets/js/ui/sections/official.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => officialSection.build(sectionCtx(state));

test("固定ページのあとにニュースを日付の新しい順で出す", () => {
  assert.deepEqual(keysOf(build()), ["page:about", "news:new-news", "news:old-news"]);
});

test("ニュースだけ既定で開き、行のクラスは種類ごと", () => {
  const desc = build();
  assert.deepEqual(desc.items.map((item) => desc.defaultOpen(item)), [false, true, true]);
  assert.equal(desc.rowClass(desc.items[0]), "rec-official rec-official-page");
  assert.equal(desc.rowClass(desc.items[1]), "rec-official rec-official-news");
});

test("検索はページの説明やニュースの本文にも当たる", () => {
  assert.deepEqual(keysOf(build({ query: "世界観" })), ["page:about"]);
  assert.deepEqual(keysOf(build({ query: "新しい本文" })), ["news:new-news"]);
  assert.deepEqual(keysOf(build({ query: "zzzz" })), []);
});

test("head にバッジ、body にページの HTML とニュースの Markdown", () => {
  const desc = build();
  const [page, news] = desc.items;
  assert.match(desc.renderHead(page), /公式ページ/);
  assert.match(desc.renderHead(news), /2026-05-29 \/ ライブ情報/);
  assert.match(desc.renderBody(page), new RegExp(`<img src="${OFFICIAL_SITE_URL}logos/logo.png">`));
  assert.match(desc.renderBody(news), /<h2>告知<\/h2>/);
});

test("公式ページの本文: 「/」始まりは公式サイト基準、リンクは別タブ、web-share は外す", () => {
  assert.equal(
    officialBodyHtml('<a href="/x">x</a><img src="/a.png"><a href="//cdn/y" target="_self">y</a>'),
    `<a target="_blank" rel="noopener noreferrer" href="${OFFICIAL_SITE_URL}x">x</a><img src="${OFFICIAL_SITE_URL}a.png"><a href="//cdn/y" target="_self">y</a>`,
  );
  assert.equal(officialBodyHtml('<iframe allow="autoplay; web-share"></iframe>'), '<iframe allow="autoplay"></iframe>');
  assert.equal(officialBodyHtml(undefined), "");
});
