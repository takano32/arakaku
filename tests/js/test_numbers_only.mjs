#!/usr/bin/env node
// buildNumbersOnly (名鑑にだけある大会・試合の合成) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { buildNumbersOnly } from "../../docs/assets/js/data/numbers_only.js";

const promotionName = (id) => ({ target: "ターゲット", emperor: "エンペラー" })[id] ?? id;
const events = [
  { event_id: "target-10", promotion_id: "target", event_number: 10, name: "ターゲット No.10" },
  { event_id: "max-bout-sp", promotion_id: "max_bout", event_number: 101, numbers_event_number: "SP", name: "MAXバウト SP" },
];
const record = (over) => ({
  record_id: "r", promotion_id: "target", event_number_normalized: "11", fighter_name: "A", opponent_name: "B",
  matched_fighter_id: "a", opponent_matched_fighter_id: "b", result: "win", detail_raw: "1R KO", division: "ライト級", ...over,
});

test("events.csv に無い「団体 + 興行番号」だけを合成し、名前は既存の No.N 大会から作る", () => {
  const out = buildNumbersOnly({ events, fightRecords: [record(), record({ event_number_normalized: "10" })], promotionName });
  assert.deepEqual(out.events.map((e) => [e.event_id, e.name, e.event_number, e.numbers_only]), [["numbers-target-11", "ターゲット No.11", 11, true]]);
  assert.equal(out.eventById.get("numbers-target-11"), out.events[0]);
});

test("No.N 大会が無い団体は団体名 + No.N、数字でない興行番号と既知の numbers_event_number は除く", () => {
  // numbers_event_number が数字の大会: 名鑑の "5" はこの大会に当たり、event_number の "205" では当たらない
  const withNumbersNumber = [...events, { event_id: "max-bout-5", promotion_id: "max_bout", event_number: 205, numbers_event_number: "5", name: "MAXバウト 5" }];
  const out = buildNumbersOnly({
    events: withNumbersNumber,
    fightRecords: [
      record({ promotion_id: "emperor", event_number_normalized: "3" }), record({ promotion_id: "max_bout", event_number_normalized: "SP" }),
      record({ event_number_normalized: "" }), record({ event_number_normalized: undefined }),
      record({ promotion_id: "max_bout", event_number_normalized: "5" }), record({ promotion_id: "max_bout", event_number_normalized: "205" }),
    ],
    promotionName,
  });
  assert.deepEqual(out.events.map((e) => e.name), ["エンペラーNo.3", "max_boutNo.205"]);
});

test("両選手の側の 2 行は 1 試合にまとまり、勝者・敗者・名鑑確認済みになる", () => {
  const out = buildNumbersOnly({
    events,
    fightRecords: [
      record(),
      record({ fighter_name: "B", opponent_name: "A", matched_fighter_id: "b", opponent_matched_fighter_id: "a", result: "loss" }),
    ],
    promotionName,
  });
  assert.equal(out.bouts.length, 1);
  const bout = out.bouts[0];
  assert.equal(bout.bout_id, "numbers-target-11--a--b");
  assert.equal(bout.winner_id, "a");
  assert.equal(bout.loser_id, "b");
  assert.equal(bout.result_status, "numbers_verified");
  assert.equal(bout.numbers_records.length, 2);
  assert.deepEqual(bout.fighters.map((f) => f.result), ["win", "loss"]);
  assert.equal(bout.result.method_raw, "1R KO");
  assert.equal(out.boutById.get(bout.bout_id), bout);
});

test("両側の勝敗が食い違う (両者勝ち) 試合は不明にする (T89)", () => {
  const out = buildNumbersOnly({
    events,
    fightRecords: [
      record(),
      record({ fighter_name: "B", opponent_name: "A", matched_fighter_id: "b", opponent_matched_fighter_id: "a", result: "win" }),
    ],
    promotionName,
  });
  const bout = out.bouts[0];
  assert.equal(bout.result_status, "unknown");
  assert.equal(bout.winner_id, null);
  assert.equal(bout.loser, null);
  assert.deepEqual(bout.fighters.map((f) => f.result), ["unknown", "unknown"]);
  assert.match(bout.notes, /食い違う/);
});

test("選手 ID が無い記録は名前で組を作り、結果が無ければ unknown", () => {
  const out = buildNumbersOnly({
    events,
    fightRecords: [record({ matched_fighter_id: "", opponent_matched_fighter_id: "", candidate_fighter_id: "", result: "" })],
    promotionName,
  });
  const bout = out.bouts[0];
  assert.equal(bout.bout_id, "numbers-target-11--A--B");
  assert.deepEqual(bout.fighters.map((f) => [f.fighter_id, f.result]), [[null, "unknown"], [null, "unknown"]]);
  assert.equal(bout.result_status, "unknown");
});

test("大会は団体 → 興行番号、試合は大会 → 対戦名の順に並ぶ (T90)", () => {
  const out = buildNumbersOnly({
    events,
    fightRecords: [
      record({ event_number_normalized: "12", fighter_name: "Z", opponent_name: "Y", matched_fighter_id: "z", opponent_matched_fighter_id: "y" }),
      record({ promotion_id: "emperor", event_number_normalized: "2" }),
      record({ event_number_normalized: "11", fighter_name: "C", opponent_name: "D", matched_fighter_id: "c", opponent_matched_fighter_id: "d" }),
      record({ event_number_normalized: "11" }),
    ],
    promotionName,
  });
  assert.deepEqual(out.events.map((e) => e.event_id), ["numbers-emperor-2", "numbers-target-11", "numbers-target-12"]);
  assert.deepEqual(out.bouts.map((b) => b.matchup), ["A vs B", "A vs B", "C vs D", "Z vs Y"]);
});
