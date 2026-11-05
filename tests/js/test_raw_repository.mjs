#!/usr/bin/env node
// 生 JSON の素のアクセサ (data/raw_repository.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { RawRepository } from "../../docs/assets/js/data/raw_repository.js";

test("無いキーは空配列、events と sourceMentions は新しい順", () => {
  const repo = new RawRepository({ events: [{ event_id: "e1" }, { event_id: "e2" }], sourceMentions: [{ mention_id: 1 }, { mention_id: 2 }] });
  assert.deepEqual(repo.raw("bouts"), []);
  assert.deepEqual(repo.fighters, []);
  assert.deepEqual(repo.events.map((e) => e.event_id), ["e2", "e1"]);
  assert.deepEqual(repo.sourceMentions.map((m) => m.mention_id), [2, 1]);
  assert.deepEqual(repo.raw("events").map((e) => e.event_id), ["e1", "e2"]); // 元の配列は変えない
});

test("findById は主キーで、findManyByField は列の値で引く", () => {
  const repo = new RawRepository({
    fighters: [{ fighter_id: "a", name: "A" }],
    videoLinks: [{ video_id: "v1", entity_id: "x" }, { video_id: "v1", entity_id: "y" }, { video_id: "v2", entity_id: "z" }],
  });
  assert.equal(repo.findFighter("a").name, "A");
  assert.equal(repo.findFighter("b"), undefined);
  assert.equal(repo.findById("unknownCollection", "a"), undefined);
  assert.deepEqual(repo.findManyByField("videoLinks", "video_id", "v1").map((l) => l.entity_id), ["x", "y"]);
  assert.deepEqual(repo.findManyByField("videoLinks", "video_id", "none"), []);
});

test("団体名は中黒・空白を無視して promotion_id に引き当てる", () => {
  const repo = new RawRepository({ promotions: [{ promotion_id: "max_bout", name: "マックス・バウト" }] });
  assert.equal(repo.promotionIdByName("マックス バウト"), "max_bout");
  assert.equal(repo.promotionIdByName("マックスバウト"), "max_bout");
  assert.equal(repo.promotionIdByName(""), undefined);
  assert.equal(repo.promotionIdByName("ほか"), undefined);
});

test("アーカイブは display_id と webpage_url で引く", () => {
  const repo = new RawRepository({
    youtubeArchives: [{ display_id: "abc", title: "Y" }],
    noteArchives: [{ webpage_url: "https://note.com/x", title: "N" }],
  });
  assert.equal(repo.findYoutubeArchive("abc").title, "Y");
  assert.equal(repo.findNoteArchive("https://note.com/x").title, "N");
});

test("invalidate するまで索引を使い回し、invalidate の後は新しいデータで引く", () => {
  const data = { fighters: [{ fighter_id: "a" }] };
  const repo = new RawRepository(data);
  assert.ok(repo.findFighter("a"));
  data.fighters = [{ fighter_id: "b" }];
  assert.ok(repo.findFighter("a")); // 古い索引のまま
  repo.invalidate();
  assert.equal(repo.findFighter("a"), undefined);
  assert.ok(repo.findFighter("b"));
});

test("articleLinksForArticle は記事 1 本のリンクを返す (T112.4.26)", () => {
  const repo = new RawRepository({ articleLinks: [{ article_id: "a", entity_id: "x" }, { article_id: "b", entity_id: "y" }, { article_id: "a", entity_id: "z" }] });
  assert.deepEqual(repo.articleLinksForArticle("a").map((l) => l.entity_id), ["x", "z"]);
  assert.deepEqual(repo.articleLinksForArticle("none"), []);
});
