#!/usr/bin/env node
// 王座タブ (ui/sections/titles.js) の build() と王者の表記を手書きデータで確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { championLabel, titlesSection } from "../../docs/assets/js/ui/sections/titles.js";
import { keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state) => titlesSection.build(sectionCtx(state));

test("団体名 → 階級の順に、「団体 / 階級」の見出し行を挟む", () => {
  const desc = build();
  assert.deepEqual(keysOf(desc), ["h:エンペラー / ライト級", "emperor-lightweight-tournament", "h:ターゲット / ライト級", "target-lightweight"]);
  assert.deepEqual(desc.items.map((item) => desc.isHeader(item)), [true, false, true, false]);
  assert.equal(desc.renderHead(desc.items[0]), '<h2 class="group-title">エンペラー / ライト級</h2>');
});

test("王座は既定で開き、行のクラスは rec-championship", () => {
  const desc = build();
  assert.ok(desc.items.every((item) => desc.defaultOpen(item)));
  assert.ok(desc.items.every((item) => desc.rowClass(item) === "rec-championship"));
});

test("検索と絞り込みで選ぶ (見出し行も一緒に絞られる)", () => {
  assert.deepEqual(keysOf(build({ query: "かべい" })), ["h:ターゲット / ライト級", "target-lightweight"]);
  assert.deepEqual(keysOf(build({ titlePromotion: "emperor" })), ["h:エンペラー / ライト級", "emperor-lightweight-tournament"]);
  assert.deepEqual(keysOf(build({ query: "zzzz" })), []);
});

test("head に王者、body に歴代と獲得大会", () => {
  const desc = build({ titlePromotion: "target" });
  const title = desc.items[1];
  assert.match(desc.renderHead(title), /現王者: かべい/);
  assert.match(desc.renderHead(title), /1 代の変遷/);
  const body = desc.renderBody(title);
  assert.match(body, /<span class="reign-label">初代<\/span>/);
  assert.match(body, /獲得: <button[^>]*data-event-id="target-1"/);
});

test("トーナメントは開催回数と最新優勝", () => {
  const desc = build({ titlePromotion: "emperor" });
  const head = desc.renderHead(desc.items[1]);
  assert.match(head, /1 回の開催/);
  assert.match(head, /最新優勝: アイス・トロン/);
});

test("王者の表記: トーナメント・返上・喪失・現王者", () => {
  assert.equal(championLabel({ fighter_name: "A" }, true), "最新優勝: A");
  assert.equal(championLabel({ fighter_name: "A", end_reason: "vacated" }, false), "空位（A が返上）");
  assert.equal(championLabel({ fighter_name: "A", lost_at_event_id: "e1" }, false), "空位");
  assert.equal(championLabel({ fighter_name: "<A>" }, false), "現王者: &lt;A&gt;");
});
