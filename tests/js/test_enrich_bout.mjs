#!/usr/bin/env node
// 試合への名鑑記録の重ね方 (enrich/bout.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import {
  applyFightRecords,
  buildFightRecordIndex,
  fightRecordKeyForBout,
  fightRecordsForBout,
} from "../../docs/assets/js/data/enrich/bout.js";

const bout = {
  bout_id: "target-10-3", promotion_id: "target", event_id: "target-10", result_status: "known",
  fighters: [{ fighter_id: "a", name: "A", result: "win" }, { fighter_id: "b", name: "B", result: "loss" }],
  winner_id: "a", winner: "A", loser_id: "b", loser: "B", result: { round: 2 },
};
const rec = (over) => ({ promotion_id: "target", event_number_normalized: "10", matched_fighter_id: "a", opponent_matched_fighter_id: "b", result: "win", ...over });

test("個人成績は「団体:興行番号」で索引し、大会の numbers_event_number を優先して引く", () => {
  const index = buildFightRecordIndex([rec(), rec({ event_number_normalized: "SP" }), rec({ promotion_id: "emperor" })]);
  assert.deepEqual([...index.keys()], ["target:10", "target:SP", "emperor:10"]);
  assert.equal(fightRecordKeyForBout(bout, { event_number: 10 }), "target:10");
  assert.equal(fightRecordKeyForBout(bout, { event_number: 101, numbers_event_number: "SP" }), "target:SP");
});

test("選手と対戦相手の両方が一致する記録だけを使う (候補側の ID は matched → candidate)", () => {
  const records = fightRecordsForBout(bout, [
    rec(),
    rec({ matched_fighter_id: "", candidate_fighter_id: "b", opponent_matched_fighter_id: "a", result: "loss" }),
    rec({ opponent_matched_fighter_id: "c" }), // 別の回戦
    rec({ matched_fighter_id: "c", opponent_matched_fighter_id: "a" }),
  ]);
  assert.equal(records.length, 2);
  assert.deepEqual(fightRecordsForBout({ fighters: [{ fighter_id: "a" }] }, [rec()]), []); // 2 選手そろっていない
  assert.deepEqual(fightRecordsForBout({ fighters: [{ fighter_id: "a" }, { name: "不明" }] }, [rec()]), []);
});

test("記録が無ければ浅いコピーだけ返す", () => {
  const rich = applyFightRecords(bout, []);
  assert.notEqual(rich, bout);
  assert.deepEqual(rich, bout);
  assert.equal(rich.numbers_records, undefined);
});

test("矛盾しない記録は勝敗・決まり手・階級・形式を重ね、名鑑確認済みにする (相手側の行は反転)", () => {
  const base = { ...bout, fighters: [{ fighter_id: "a", name: "A", result: "unknown" }, { fighter_id: "b", name: "B", result: "unknown" }], winner_id: null, winner: null, loser_id: null, loser: null, result_status: "unknown" };
  const records = [rec({ matched_fighter_id: "b", opponent_matched_fighter_id: "a", result: "loss", detail_raw: "1R KO", division: "ライト級", bout_format: "ワンマッチ" })];
  const rich = applyFightRecords(base, records);
  assert.deepEqual(rich.fighters.map((f) => f.result), ["win", "loss"]);
  assert.equal(rich.winner_id, "a");
  assert.equal(rich.loser, "B");
  assert.deepEqual(rich.result, { round: 2, method_raw: "1R KO" });
  assert.equal(rich.division, "ライト級");
  assert.equal(rich.bout_type, "ワンマッチ");
  assert.equal(rich.result_status, "numbers_verified");
  assert.equal(rich.numbers_records, records);
  // 入力は変更しない
  assert.equal(base.fighters[0].result, "unknown");
  assert.equal(base.result_status, "unknown");
});

test("両側の記録が矛盾する (両者勝ち) ときは勝敗を上書きせず、名鑑確認済みにもしない (T89)", () => {
  const records = [rec({ detail_raw: "判定" }), rec({ matched_fighter_id: "b", opponent_matched_fighter_id: "a", result: "win" })];
  const rich = applyFightRecords(bout, records);
  assert.deepEqual(rich.fighters.map((f) => f.result), ["win", "loss"]); // CSV の勝敗のまま
  assert.equal(rich.winner_id, "a");
  assert.equal(rich.result.method_raw, "判定"); // 決まり手などのメタは補う
  assert.equal(rich.result_status, "known");
  assert.equal(rich.numbers_records.length, 2);
});

test("結果の無い記録は勝敗を変えず、メタも無ければ result_status もそのまま", () => {
  const rich = applyFightRecords(bout, [rec({ result: "" })]);
  assert.deepEqual(rich.fighters.map((f) => f.result), ["win", "loss"]);
  assert.equal(rich.result_status, "known");
  assert.equal(rich.bout_type, undefined);
});
