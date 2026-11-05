#!/usr/bin/env node
// 選手の発掘 (discoverFighters) と名鑑掲載順 (numbersOrder / sortByNumbersOrder) のユニットテスト
// (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { discoverFighters, numbersOrder, sortByNumbersOrder } from "../../docs/assets/js/data/fighter_catalog.js";
import { normalizeFighterName } from "../../docs/assets/js/data/names.js";

test("normalizeFighterName は中黒・空白・ピリオド・全半角・大小文字の差を吸収する", () => {
  assert.equal(normalizeFighterName("ローリングJr."), normalizeFighterName("ローリングＪｒ"));
  assert.equal(normalizeFighterName("ビル・ジャガー"), "ビルジャガー");
  assert.equal(normalizeFighterName(" Ｂｉｌｌ 　Jaguar "), "billjaguar");
  assert.equal(normalizeFighterName(undefined), "");
});

test("名鑑の対応表にだけある fighter_id を発掘し、名前は numbers_name (無ければ ID)", () => {
  const canonical = [{ fighter_id: "a", display_name: "A" }];
  const matches = [
    { numbers_fighter_id: "n1", matched_fighter_id: "a" },
    { numbers_fighter_id: "n2", matched_fighter_id: "b", numbers_name: "B" },
    { numbers_fighter_id: "n3", candidate_fighter_id: "c" },
    { numbers_fighter_id: "n4", matched_fighter_id: "b", numbers_name: "B2" }, // 重複は 1 回だけ
  ];
  assert.deepEqual(discoverFighters(canonical, matches, []), [
    { fighter_id: "b", display_name: "B" },
    { fighter_id: "c", display_name: "c" },
  ]);
});

test("公式サイトにだけいる選手を発掘し、名前の表記ゆれ・ID の衝突を避ける", () => {
  const canonical = [{ fighter_id: "a", display_name: "ローリングJr." }, { fighter_id: "p2", display_name: "別人" }];
  const players = [
    { id: "p1", name: "ローリングＪｒ" }, // 表記ゆれ → 既知
    { id: "p2", name: "新顔" },          // ID が既存の fighter_id と衝突 → official_ 接頭辞
    { id: "p3", name: "" },              // 名前なし → 除外
    { id: "p4", name: "新顔" },          // 同名の 2 人目 → 除外
  ];
  assert.deepEqual(discoverFighters(canonical, [], players), [{ fighter_id: "official_p2", display_name: "新顔" }]);
});

test("名鑑掲載順は numbers_fighters の並びで fighter_id に rank を振る (matched → candidate)", () => {
  const order = numbersOrder(
    [{ numbers_fighter_id: "n1" }, { numbers_fighter_id: "n2" }, { numbers_fighter_id: "n3" }, { numbers_fighter_id: "n4" }],
    [
      { numbers_fighter_id: "n1", matched_fighter_id: "b" },
      { numbers_fighter_id: "n2", candidate_fighter_id: "a" },
      { numbers_fighter_id: "n3" },
      { numbers_fighter_id: "n4", matched_fighter_id: "b" },
    ],
  );
  assert.deepEqual([...order], [["b", 0], ["a", 1]]);
});

test("並べ替えは名鑑順を先に、名鑑に無い選手は元の順のまま末尾に置き、入力は変更しない", () => {
  const fighters = [{ fighter_id: "x" }, { fighter_id: "a" }, { fighter_id: "y" }, { fighter_id: "b" }];
  const sorted = sortByNumbersOrder(fighters, new Map([["b", 0], ["a", 1]]));
  assert.deepEqual(sorted.map((f) => f.fighter_id), ["b", "a", "x", "y"]);
  assert.deepEqual(fighters.map((f) => f.fighter_id), ["x", "a", "y", "b"]);
});
