#!/usr/bin/env node
// ビューアの静的な設定 (config.js) の食い違いを確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_TABS,
  CORE_DATA_KEYS,
  DATA_FILES,
  DEFAULT_ADMIN_TAB,
  DEFAULT_TAB,
  ENRICHMENT_DATA_KEYS,
  INITIAL_TAB_DATA_KEYS,
  MENTION_TYPE_ORDER,
  PRIMARY_DATA_KEYS,
  PUBLIC_REFERENCE_DATA_KEYS,
  PUBLIC_TABS,
  REQUIRED_TAB_DATA_KEYS,
  TAB_DATA_KEYS,
} from "../../docs/assets/js/config.js";
import { TAB_FILTERS } from "../../docs/assets/js/data/filters.js";
import { labels } from "../../docs/assets/js/data/labels.js";
import { SECTIONS } from "../../docs/assets/js/ui/sections/index.js";

test("読み込みフェーズとタブごとのキーはすべて DATA_FILES にある", () => {
  const lists = {
    INITIAL_TAB_DATA_KEYS, PRIMARY_DATA_KEYS, ENRICHMENT_DATA_KEYS, PUBLIC_REFERENCE_DATA_KEYS, CORE_DATA_KEYS,
    ...Object.fromEntries(Object.entries(TAB_DATA_KEYS).map(([tab, keys]) => [`TAB_DATA_KEYS.${tab}`, keys])),
    ...Object.fromEntries(Object.entries(REQUIRED_TAB_DATA_KEYS).map(([tab, keys]) => [`REQUIRED_TAB_DATA_KEYS.${tab}`, keys])),
  };
  for (const [name, keys] of Object.entries(lists)) {
    for (const key of keys) assert.ok(Object.hasOwn(DATA_FILES, key), `${name}: ${key}`);
  }
});

test("タブの ID はすべて SECTIONS にあり、既定のタブはそれぞれの一覧にある", () => {
  const publicIds = PUBLIC_TABS.map(([id]) => id);
  const adminIds = ADMIN_TABS.map(([id]) => id);
  const ids = [...publicIds, ...adminIds, ...Object.keys(TAB_DATA_KEYS), ...Object.keys(REQUIRED_TAB_DATA_KEYS), ...Object.keys(TAB_FILTERS)];
  for (const id of ids) assert.ok(Object.hasOwn(SECTIONS, id), id);
  assert.ok(publicIds.includes(DEFAULT_TAB));
  assert.ok(adminIds.includes(DEFAULT_ADMIN_TAB));
});

test("言及の種別の並びはすべてラベルを持つ", () => {
  for (const type of MENTION_TYPE_ORDER) assert.notEqual(labels.mentionType(type), type, type);
});
