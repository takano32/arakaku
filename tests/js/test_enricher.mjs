#!/usr/bin/env node
// DataEnricher (data/enricher.js) の配線のユニットテスト。リポジトリの代わりに手書きの lookups を渡す
// (DOM 不要・依存ゼロ、node:test)。重ね方の規則そのものは test_enrich_*.mjs が確かめる。
import test from "node:test";
import assert from "node:assert/strict";

import { DataEnricher } from "../../docs/assets/js/data/enricher.js";

function fakeLookups(overrides = {}) {
  return {
    findEvent: () => undefined,
    findBout: () => undefined,
    numbersFighterById: () => undefined,
    promotionIdByName: () => undefined,
    findYoutubeArchive: () => undefined,
    findNoteArchive: () => undefined,
    videoLinksForVideo: () => [],
    numbersNameMatches: () => [],
    numbersFightRecords: () => [],
    officialPlayers: () => [],
    officialTournaments: () => [],
    ...overrides,
  };
}

test("大会には、形式の接尾辞を外した ID の公式トーナメントを official_data として重ねる", () => {
  const ot = { id: "max-bout-6-middleweight" };
  const enricher = new DataEnricher(fakeLookups({ officialTournaments: () => [ot] }));
  const event = { event_id: "max-bout-6-middleweight-gp" };
  assert.deepEqual(enricher.enrichEvent(event), { ...event, official_data: ot });
  const other = { event_id: "target-1" };
  assert.equal(enricher.enrichEvent(other), other);
});

test("記事には note アーカイブを URL で引いて重ねる", () => {
  const seen = [];
  const enricher = new DataEnricher(fakeLookups({
    findNoteArchive: (url) => { seen.push(url); return { title: "新しい題", description: "説明" }; },
  }));
  const rich = enricher.enrichArticle({ article_id: "a1", url: "https://note.com/x", title: "古い題" });
  assert.deepEqual(seen, ["https://note.com/x"]);
  assert.equal(rich.title, "新しい題");
  assert.equal(rich.archive_description, "説明");
  assert.equal(enricher.enrichArticle(null), null);
});

test("動画のアーカイブは platform_video_id で、リンクは video_id で引く", () => {
  const calls = [];
  const enricher = new DataEnricher(fakeLookups({
    findYoutubeArchive: (id) => { calls.push(["archive", id]); return undefined; },
    videoLinksForVideo: (id) => { calls.push(["links", id]); return []; },
  }));
  enricher.enrichVideo({ video_id: "v1", platform_video_id: "yt1" });
  assert.deepEqual(calls, [["archive", "yt1"], ["links", "v1"]]);
  assert.equal(enricher.enrichVideo(undefined), undefined);
});

test("大会が引けない試合はコピーを返す", () => {
  const enricher = new DataEnricher(fakeLookups());
  const bout = { bout_id: "b1", event_id: "none" };
  const rich = enricher.enrichBout(bout);
  assert.deepEqual(rich, bout);
  assert.notEqual(rich, bout);
});

test("索引は一度だけ作り、reset の後は今のデータで作り直す", () => {
  let tournaments = [{ id: "t-1" }];
  let reads = 0;
  const enricher = new DataEnricher(fakeLookups({ officialTournaments: () => { reads += 1; return tournaments; } }));
  assert.ok(enricher.enrichEvent({ event_id: "t-1" }).official_data);
  assert.ok(enricher.enrichEvent({ event_id: "t-1" }).official_data);
  assert.equal(reads, 1);
  tournaments = [];
  assert.ok(enricher.enrichEvent({ event_id: "t-1" }).official_data); // まだ古い索引
  enricher.reset();
  assert.equal(enricher.enrichEvent({ event_id: "t-1" }).official_data, undefined);
  assert.equal(reads, 2);
});
