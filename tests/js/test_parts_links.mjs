#!/usr/bin/env node
// 画面内リンク (ui/parts/links.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { boutLink, eventLink, fighterLink } from "../../docs/assets/js/ui/parts/links.js";

const repo = {
  fighterName: (id) => ({ a: "選手A", b: "選手<B>" })[id] ?? id,
  eventName: (id) => ({ "target-10": "ターゲット No.10" })[id] ?? id,
};

test("選手・大会リンクは data-* 属性付きのボタン、ID が無ければ名前だけ", () => {
  assert.equal(fighterLink(repo, "b"), '<button type="button" class="link link-fighter" data-fighter-id="b" data-fighter-name="選手&lt;B&gt;">選手&lt;B&gt;</button>');
  assert.equal(fighterLink(repo, "", "不明"), '<span class="name">不明</span>');
  assert.equal(fighterLink(repo, "zzz", "別名"), '<button type="button" class="link link-fighter" data-fighter-id="zzz" data-fighter-name="zzz">zzz</button>');
  assert.equal(eventLink(repo, "target-10"), '<button type="button" class="link link-event" data-event-id="target-10" data-event-name="ターゲット No.10">ターゲット No.10</button>');
  assert.equal(eventLink(repo, "", "未設定"), '<span class="name">未設定</span>');
  assert.equal(boutLink("b&1", "<i>詳細</i>"), '<button type="button" class="link link-bout" data-bout-id="b&amp;1"><i>詳細</i></button>');
});
