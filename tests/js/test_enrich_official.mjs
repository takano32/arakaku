#!/usr/bin/env node
// 公式サイトデータの突合規則 (enrich/official.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildOfficialPlayerIndexes,
  buildOfficialTournamentIndex,
  findOfficialPlayer,
  normalizeTournamentId,
  tournamentKeyForEvent,
} from "../../docs/assets/js/data/enrich/official.js";

const players = [
  { id: "p1", name: "ローリングJr." },
  { id: "p2", name: "山田 太郎" },
  { id: "p3", name: "山田太郎" }, // p2 と正規化キーが同じ → 曖昧
  { id: "p4", name: "" },
];

test("完全一致を優先し、無ければ表記ゆれを吸収して引く", () => {
  const indexes = buildOfficialPlayerIndexes(players);
  assert.equal(findOfficialPlayer(indexes, "ローリングJr.")?.id, "p1");
  assert.equal(findOfficialPlayer(indexes, "ローリングＪｒ")?.id, "p1");
  assert.equal(findOfficialPlayer(indexes, "山田 太郎")?.id, "p2");
  assert.equal(findOfficialPlayer(indexes, "山田太郎")?.id, "p3");
});

test("同じ正規化キーに別名の公式選手が複数いると、表記ゆれでは引かない", () => {
  const indexes = buildOfficialPlayerIndexes(players);
  assert.equal(findOfficialPlayer(indexes, "山田　太郎"), undefined);
  assert.equal(indexes.normalized.has("山田太郎"), false);
});

test("名前が無い選手は索引に入らず、空の名前では引かない", () => {
  const indexes = buildOfficialPlayerIndexes(players);
  assert.equal(indexes.exact.size, 3);
  assert.equal(findOfficialPlayer(indexes, ""), undefined);
  assert.equal(findOfficialPlayer(indexes, undefined), undefined);
  assert.equal(buildOfficialPlayerIndexes(undefined).exact.size, 0);
});

test("公式トーナメント id は events.csv の event_id の形に揃える", () => {
  assert.equal(normalizeTournamentId("maxbout-6-middle"), "max-bout-6-middleweight");
  assert.equal(normalizeTournamentId("maxbout-5-light"), "max-bout-5-lightweight");
  assert.equal(normalizeTournamentId("maxbout-4-heavy"), "max-bout-4-heavyweight");
  assert.equal(normalizeTournamentId("target-cup"), "target-cup");
  const index = buildOfficialTournamentIndex([{ id: "maxbout-6-middle", name: "第6回" }]);
  assert.equal(index.get("max-bout-6-middleweight")?.name, "第6回");
});

test("大会の event_id からは形式の接尾辞 (-gp / -tournament) を外して引く", () => {
  assert.equal(tournamentKeyForEvent("max-bout-6-middleweight-gp"), "max-bout-6-middleweight");
  assert.equal(tournamentKeyForEvent("max-bout-6-middleweight-tournament"), "max-bout-6-middleweight");
  assert.equal(tournamentKeyForEvent("target-10"), "target-10");
});
