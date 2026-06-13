#!/usr/bin/env node
// itemPassesFilters のユニットテスト (DOM 不要・依存ゼロ、Node 標準の node:test を使用)。
// クライアント側フィルタの中核ロジック (単一/配列フィールド・「その他」・forceOther) を検証する。
import test from "node:test";
import assert from "node:assert/strict";

import { itemPassesFilters, OTHER_VALUE } from "../docs/assets/js/filters.js";

const divisionGroup = {
  type: "division",
  stateKey: "div",
  field: "division",
  otherLabel: "その他",
  options: [
    { value: "lightweight", match: "ライト級" },
    { value: "middleweight", match: "ミドル級" },
  ],
};

const pass = (item, state, groups = [divisionGroup]) => itemPassesFilters(item, groups, state);

test("選択なしは常に通過する", () => {
  assert.equal(pass({ division: "ライト級" }, {}), true);
  assert.equal(pass({ division: "ヘビー級" }, { div: "" }), true);
});

test("一致する option を選ぶと通過、不一致だと除外", () => {
  assert.equal(pass({ division: "ライト級" }, { div: "lightweight" }), true);
  assert.equal(pass({ division: "ミドル級" }, { div: "lightweight" }), false);
});

test("空・未設定フィールドはどの具体 option にも一致しない", () => {
  assert.equal(pass({ division: "" }, { div: "lightweight" }), false);
  assert.equal(pass({}, { div: "lightweight" }), false);
});

test("「その他」は既知値を除外し、未知値を通過させる", () => {
  assert.equal(pass({ division: "ヘビー級" }, { div: OTHER_VALUE }), true); // 未知 → その他
  assert.equal(pass({ division: "ライト級" }, { div: OTHER_VALUE }), false); // 既知 → 除外
  assert.equal(pass({ division: "" }, { div: OTHER_VALUE }), true); // 値なし → 既知に無い扱い
});

test("配列フィールドはいずれかの要素が一致すれば通過する", () => {
  const arrayGroup = { ...divisionGroup, field: "divisions" };
  assert.equal(pass({ divisions: ["ライト級", "ミドル級"] }, { div: "middleweight" }, [arrayGroup]), true);
  assert.equal(pass({ divisions: ["ヘビー級"] }, { div: "lightweight" }, [arrayGroup]), false);
  assert.equal(pass({ divisions: ["ヘビー級", "ライト級"] }, { div: OTHER_VALUE }, [arrayGroup]), false); // 既知を含む
});

test("forceOther の項目は実値に関わらず『その他』に振り分けられる", () => {
  const forced = { ...divisionGroup, forceOther: (item) => item.minimal === true };
  // 具体 option を選んでいても forceOther 項目は除外される
  assert.equal(pass({ division: "ライト級", minimal: true }, { div: "lightweight" }, [forced]), false);
  // 「その他」では forceOther 項目が通過する
  assert.equal(pass({ division: "ライト級", minimal: true }, { div: OTHER_VALUE }, [forced]), true);
  // forceOther でない通常項目は従来どおり
  assert.equal(pass({ division: "ライト級", minimal: false }, { div: "lightweight" }, [forced]), true);
});

test("複数グループは全グループを通過する必要がある (every)", () => {
  const promoGroup = {
    type: "promotion",
    stateKey: "promo",
    field: "promotion_id",
    options: [{ value: "target", match: "target" }],
  };
  const item = { division: "ライト級", promotion_id: "target" };
  assert.equal(pass(item, { div: "lightweight", promo: "target" }, [divisionGroup, promoGroup]), true);
  assert.equal(pass(item, { div: "lightweight", promo: "emperor" }, [divisionGroup, promoGroup]), false);
});

test("match を持たない option は value で照合する", () => {
  const valueGroup = {
    type: "category",
    stateKey: "cat",
    field: "category",
    options: [{ value: "major", label: "主要" }],
  };
  assert.equal(pass({ category: "major" }, { cat: "major" }, [valueGroup]), true);
  assert.equal(pass({ category: "minor" }, { cat: "major" }, [valueGroup]), false);
});
