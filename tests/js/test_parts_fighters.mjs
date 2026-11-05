#!/usr/bin/env node
// 選手プロフィールの HTML 部品 (ui/parts/fighters.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { fighterSnapshots, officialBio, profileBlock, snapshotSource } from "../../docs/assets/js/ui/parts/fighters.js";

const repo = {
  officialNews: [{ slug: "news-1", title: "お知らせ", date: "2025-01-01" }, { slug: "news-2", title: "日付なし" }],
  findRichArticle: () => undefined,
  sourceDocumentForArticle: () => undefined,
  eventName: (id) => (id === "target-10" ? "ターゲット No.10" : id),
  promotionName: (id) => (id === "target" ? "ターゲット" : id),
  fighterSnapshotsForFighter: (id) => (id === "a" ? [{ snapshot_id: "s1", event_id: "target-10", source_id: "note:a1", source_article_id: "a1", gym: "道場", height: "170cm", age: "25", record_text: "3戦2勝", main_promotion_id: "target", titles_text: "王者", catchphrase: "キャッチ" }, { snapshot_id: "s2", source_id: "official_news:news-1" }] : []),
};

test("公式 bio は「／」で分け、summary に既出のものを除く", () => {
  assert.equal(officialBio(undefined, ""), "");
  assert.equal(officialBio({ bio: "初代王者／第2回優勝 / 準優勝" }, "第2回 優勝"), "<ul class=\"bio\"><li>初代王者</li><li>準優勝</li></ul>");
  assert.equal(officialBio({ bio: "初代王者" }, "初代、王者"), "");
});

test("戦績・プロフィールのブロックは戦績チップ・実績・出場・bio をまとめ、何も無ければ出さない", () => {
  assert.equal(profileBlock({}), "");
  const html = profileBlock({
    profile: { record: { fight_count: 5, wins: 3, losses: 2, draws: null, win_rate: "0.6" }, achievements: ["王座 👑"] },
    numbers_data: { achievements: { tournament_entry_raw: "第5回" } },
    official_data: { bio: "初代王者" },
    summary: "",
  });
  assert.equal(html, '<section class="sec sec-profile"><h3 class="sec-title">戦績・プロフィール</h3><div class="stats"><span class="stat">通算 5戦 3勝 2敗 (勝率 60.0%)</span><span class="stat stat-gold">王座 👑</span><span class="stat">出場 第5回</span></div><ul class="bio"><li>初代王者</li></ul></section>');
  assert.equal(profileBlock({ official_data: { bio: "初代王者" }, summary: "初代王者" }), "");
});

test("出典の表記は公式ニュース (題 + 日付) か note 記事", () => {
  assert.equal(snapshotSource(repo, { source_id: "official_news:news-1" }), "公式ニュース「お知らせ」（2025-01-01）");
  assert.equal(snapshotSource(repo, { source_id: "official_news:news-2" }), "公式ニュース「日付なし」");
  assert.equal(snapshotSource(repo, { source_id: "official_news:missing" }), "公式ニュース「missing」");
  assert.equal(snapshotSource(repo, { source_id: "note:a1", source_article_id: "a1" }), '<span class="ref"><code>a1</code></span>');
  assert.equal(snapshotSource(repo, {}), "未入力");
});

test("出典別プロフィールは大会リンク・出典・定義リストのカードを並べる", () => {
  assert.equal(fighterSnapshots(repo, "zzz"), "");
  const html = fighterSnapshots(repo, "a");
  assert.match(html, /^<section class="sec sec-snapshots"><h3 class="sec-title">出典別プロフィール<\/h3><div class="grid"><div class="item item-snapshot">/);
  assert.match(html, /<p class="item-head small"><button type="button" class="link link-event" data-event-id="target-10" data-event-name="ターゲット No.10">ターゲット No.10<\/button> \/ <span class="ref"><code>a1<\/code><\/span><\/p>/);
  assert.match(html, /<dt>身長・年齢<\/dt><dd>170cm \/ 25<\/dd>/);
  assert.match(html, /<dt>主団体<\/dt><dd>ターゲット<\/dd>/);
  assert.match(html, /<p class="item-head small">大会未設定 \/ 公式ニュース「お知らせ」（2025-01-01）<\/p>/);
  assert.match(html, /<dt>snapshot_id<\/dt><dd><code>s2<\/code><\/dd>/);
});
