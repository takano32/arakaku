#!/usr/bin/env node
// 表示ラベル (data/labels.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { numbersAchievementLabels } from "../../docs/assets/js/data/labels.js";

test("numbersAchievementLabels は絵文字を二重に付けずラベルを前置する", () => {
  assert.deepEqual(numbersAchievementLabels({ belt_marker: "👑", tournament_win_marker: "🏆x3", white_glove_count: 1 }), ["王座 👑", "優勝 🏆x3", "白グローブ 1回"]);
  assert.deepEqual(numbersAchievementLabels(undefined), []);
  assert.deepEqual(numbersAchievementLabels({ white_glove_count: 0 }), []);
});
