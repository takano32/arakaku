#!/usr/bin/env node
// 重複選手の統合 (mergeDuplicateFighters) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { mergeDuplicateFighters } from "../../docs/assets/js/data/fighter_merge.js";

test("表記ゆれだけの重複は canonical 行を survivor にして 1 人にまとめる", () => {
  const canonical = { fighter_id: "a", display_name: "ビル・ジャガー", main_promotion_id: "target", inferred_from_video_ids: ["v1"], profile: { gym: "G" } };
  const dup = { fighter_id: "b", display_name: "ビルジャガー", main_promotion_id: "target", numbers_data: { x: 1 }, summary: "名鑑", aliases: ["BJ"], source_article_ids: ["n1"], profile: { gym: "別", age: "30" } };
  const { survivors, aliasIndex } = mergeDuplicateFighters([canonical, dup], new Set(["a"]));
  assert.equal(survivors.length, 1);
  const s = survivors[0];
  assert.equal(s.fighter_id, "a");
  assert.deepEqual(s.merged_fighter_ids, ["a", "b"]);
  assert.deepEqual(s.numbers_data, { x: 1 });
  assert.equal(s.summary, "名鑑");
  assert.deepEqual(s.inferred_from_video_ids, ["v1"]);
  assert.deepEqual(s.source_article_ids, ["n1"]);
  assert.deepEqual(s.aliases, ["BJ", "ビルジャガー"]);
  assert.deepEqual(s.profile, { gym: "G", age: "30" }); // survivor の値を優先し、無い項目だけ吸収
  assert.equal(aliasIndex.get("a"), s);
  assert.equal(aliasIndex.get("b"), s);
  // 入力は変更しない (コピーに統合する)
  assert.equal(canonical.merged_fighter_ids, undefined);
  assert.equal(canonical.profile.age, undefined);
});

test("団体が矛盾する組は統合せず、それぞれ merged_fighter_ids = [自分] になる", () => {
  const a = { fighter_id: "a", display_name: "同名", main_promotion_id: "target" };
  const b = { fighter_id: "b", display_name: "同名", main_promotion_id: "emperor" };
  const { survivors, aliasIndex } = mergeDuplicateFighters([a, b], new Set(["a", "b"]));
  assert.deepEqual(survivors.map((f) => f.fighter_id), ["a", "b"]);
  assert.deepEqual(survivors[0].merged_fighter_ids, ["a"]);
  assert.equal(aliasIndex.get("b"), survivors[1]);
  // 入力 (生の行のことがある) は変更しない (T112.4.19)
  assert.equal("merged_fighter_ids" in a, false);
  assert.equal("merged_fighter_ids" in b, false);
});

test("survivor は canonical 優先、次に関連 (動画 + 記事) の多さ、次に名鑑ありで決める", () => {
  const x = { fighter_id: "x", display_name: "N", inferred_from_video_ids: ["v1", "v2"] };
  const y = { fighter_id: "y", display_name: "N", numbers_data: {} };
  const z = { fighter_id: "z", display_name: "N", source_article_ids: ["a1", "a2", "a3"] };
  assert.equal(mergeDuplicateFighters([x, y, z], new Set()).survivors[0].fighter_id, "z");
  assert.equal(mergeDuplicateFighters([x, y, z], new Set(["y"])).survivors[0].fighter_id, "y");
  const w = { fighter_id: "w", display_name: "N" };
  assert.equal(mergeDuplicateFighters([w, y], new Set()).survivors[0].fighter_id, "y");
});

test("団体が片方だけにある組は統合し、survivor に無い団体・階級を吸収する", () => {
  const a = { fighter_id: "a", display_name: "A" };
  const b = { fighter_id: "b", display_name: "Ａ", main_promotion_id: "target", main_division: "ライト級" };
  const { survivors } = mergeDuplicateFighters([a, b], new Set(["a"]));
  assert.equal(survivors[0].main_promotion_id, "target");
  assert.equal(survivors[0].main_division, "ライト級");
  assert.deepEqual(survivors[0].aliases, ["Ａ"]);
});

test("別名から survivor 自身の表示名と空値は除く", () => {
  const a = { fighter_id: "a", display_name: "A", aliases: ["A", "", "A2"] };
  const b = { fighter_id: "b", display_name: "A", aliases: ["A3"] };
  const { survivors } = mergeDuplicateFighters([a, b], new Set(["a"]));
  assert.deepEqual(survivors[0].aliases, ["A2", "A3"]);
});
