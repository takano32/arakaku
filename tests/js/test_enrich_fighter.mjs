#!/usr/bin/env node
// 選手の補完規則 (enrich/fighter.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNameMatchIndex,
  composeFighter,
  mergeRecord,
} from "../../docs/assets/js/data/enrich/fighter.js";

const PLACEHOLDER = "公式YouTube動画タイトルから抽出した選手。詳細未入力。";

test("名鑑も公式も無い選手は同じオブジェクトを返し、仮の要約だけは消す", () => {
  const fighter = { fighter_id: "a", display_name: "A", summary: "通信の紹介" };
  assert.equal(composeFighter(fighter, {}), fighter);
  assert.deepEqual(composeFighter({ fighter_id: "a", summary: PLACEHOLDER }, {}), { fighter_id: "a", summary: "" });
});

test("公式データは階級・団体・所属・年齢・身長 (数字なら cm) と profile を重ね、bio は summary に流用しない", () => {
  const op = { name: "A", nickname: "N", nationality: "日本", name_kana: "えー", weight_class: "ヘビー級101kg", gym: "G", age: 30, height: "180", bio: "公式の紹介", wins: 3, losses: 1, draws: 1 };
  const rich = composeFighter({ fighter_id: "a", display_name: "A", main_division: "ライト級" }, { op, officialPromotionId: "target" });
  assert.equal(rich.main_division, "ヘビー級101kg");
  assert.equal(rich.main_promotion_id, "target");
  assert.deepEqual(rich.profile, { nickname: "N", nationality: "日本", name_kana: "えー", gym: "G", age: 30, height: "180cm", record: { fight_count: null, wins: 3, losses: 1, draws: 1, win_rate: null } });
  // 公式 bio は official_data 経由でカードの専用ブロックに出す。summary は base (無ければ空) のまま
  assert.equal(rich.summary, "");
  assert.equal(rich.official_data, op);
  const kept = composeFighter({ fighter_id: "a", display_name: "A", summary: "通信" }, { op: { name: "A", bio: "公式", height: "180cm", age: "" } });
  assert.equal(kept.summary, "通信");
  assert.equal(kept.profile.height, "180cm");
  assert.equal("age" in kept.profile, false);
});

test("名鑑は公式より優先し、summary は名鑑の catchphrase + notes", () => {
  const op = { name: "A", weight_class: "ミドル級", gym: "公式ジム", wins: 1, losses: 1, draws: 2 };
  const nf = { display_name: "Ａ", main_division: "ライト級", main_promotion_id: "emperor", profile: { height: "175cm", gym: "名鑑ジム" }, catchphrase: "キャッチ", notes: "注記", stats: { fight_count: 5, wins: 4, losses: 1, win_rate: "0.8" }, achievements: { belt_marker: "👑", white_glove_count: 2 } };
  const rich = composeFighter({ fighter_id: "a", display_name: "A", summary: PLACEHOLDER, profile: { nickname: "元" } }, { nf, op, officialPromotionId: "target" });
  assert.equal(rich.display_name, "Ａ");
  assert.equal(rich.main_division, "ライト級");
  assert.equal(rich.main_promotion_id, "emperor");
  assert.equal(rich.summary, "キャッチ\n\n注記");
  assert.equal(rich.profile.gym, "名鑑ジム");
  assert.equal(rich.profile.height, "175cm");
  assert.equal(rich.profile.nickname, "元");
  assert.deepEqual(rich.profile.record, { fight_count: 5, wins: 4, losses: 1, draws: 2, win_rate: "0.8" });
  assert.deepEqual(rich.profile.achievements, ["王座 👑", "白グローブ 2回"]);
  assert.equal(rich.numbers_data, nf);
  assert.equal(rich.official_data, op);
});

test("入力のオブジェクトと profile は変更しない", () => {
  const fighter = { fighter_id: "a", display_name: "A", profile: { gym: "元" } };
  composeFighter(fighter, { nf: { profile: { gym: "新" } } });
  assert.equal(fighter.profile.gym, "元");
  assert.equal(fighter.numbers_data, undefined);
});

test("mergeRecord: 名鑑の勝敗を優先し、無ければ公式。どちらも無ければ null", () => {
  assert.equal(mergeRecord(undefined, undefined), null);
  assert.equal(mergeRecord({ name: "A" }, { stats: {} }), null);
  assert.deepEqual(mergeRecord({ wins: 2, losses: 3, draws: 0 }, undefined), { fight_count: null, wins: 2, losses: 3, draws: 0, win_rate: null });
  assert.deepEqual(mergeRecord({ wins: 2, losses: 3 }, { stats: { fight_count: 6, wins: 4, losses: 2, win_rate: "0.667" } }), { fight_count: 6, wins: 4, losses: 2, draws: null, win_rate: "0.667" });
  assert.deepEqual(mergeRecord(undefined, { stats: { fight_count: 1 } }), { fight_count: 1, wins: null, losses: null, draws: null, win_rate: null });
});

test("buildNameMatchIndex は matched / candidate の両方で引け、同じ ID は最初の対応", () => {
  const index = buildNameMatchIndex([
    { numbers_fighter_id: "n1", matched_fighter_id: "a", candidate_fighter_id: "b" },
    { numbers_fighter_id: "n2", matched_fighter_id: "a" },
    { numbers_fighter_id: "n3", candidate_fighter_id: "c" },
    { numbers_fighter_id: "n4" },
  ]);
  assert.equal(index.get("a").numbers_fighter_id, "n1");
  assert.equal(index.get("b").numbers_fighter_id, "n1");
  assert.equal(index.get("c").numbers_fighter_id, "n3");
  assert.equal(index.size, 3);
});
