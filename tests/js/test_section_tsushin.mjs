#!/usr/bin/env node
// 通信タブ (ui/sections/tsushin.js) の build() と note 本文の取り出しを確かめる (DOM 不要・依存ゼロ、node:test)。
import test from "node:test";
import assert from "node:assert/strict";

import { cleanNoteBody, noteDate, tsushinSection } from "../../docs/assets/js/ui/sections/tsushin.js";
import { fakeData, fakeRepo, keysOf, sectionCtx } from "./fixtures/fake_repo.mjs";

const build = (state, repo) => tsushinSection.build(sectionCtx(state, repo));

test("note の本文だけを出す (YouTube 概要欄は出さない)", () => {
  const keys = keysOf(build());
  assert.deepEqual([...keys].sort(), ["note:note-emperor", "note:note-target-1"]);
});

test("検索・団体・階級 (記事の紐づけ先の試合から) で選ぶ", () => {
  assert.deepEqual(keysOf(build({ query: "KO で勝利" })), ["note:note-target-1"]);
  assert.deepEqual(keysOf(build({ tsushinPromotion: "emperor" })), ["note:note-emperor"]);
  assert.deepEqual(keysOf(build({ tsushinDivision: "lightweight" })), ["note:note-target-1"]);
});

test("head に日付・団体・階級と本文の冒頭、記事の種別", () => {
  const desc = build({ tsushinPromotion: "target" });
  const [doc] = desc.items;
  assert.equal(desc.rowClass(doc), "rec-article");
  const head = desc.renderHead(doc);
  assert.match(head, /2025-01-10 \/ ターゲット \/ ライト級/);
  assert.match(head, /<p class="rec-preview">かべいが 1R KO で勝利。<\/p>/);
  assert.match(head, /試合結果/);
});

test("body は本文、無ければアーカイブの説明、本文が届く前は「読み込み中」", () => {
  const desc = build({ tsushinPromotion: "target" });
  assert.match(desc.renderBody(desc.items[0]), /<div class="note-body">かべいが 1R KO で勝利。<\/div>/);

  const data = fakeData();
  data.sourceDocumentBodies = [];
  const waiting = build({ tsushinPromotion: "target", loadedDataKeys: new Set() }, fakeRepo(data));
  const body = waiting.renderBody(waiting.items[0]);
  assert.match(body, /<p class="pre-line">アーカイブの説明<\/p>/);
  assert.match(body, /本文を読み込み中…/);
});

test("note 本文は日付行の後からフッタの前まで、見出しと同じ先頭行を落とす", () => {
  const text = "タイトル\n2025年4月29日 11:08\n\nタイトル\n本文1\n本文2\nいいなと思ったら応援しよう！\nフッタ";
  assert.equal(cleanNoteBody(text, "タイトル"), "本文1\n本文2");
  assert.equal(cleanNoteBody("日付行なし", "x"), "");
  assert.equal(cleanNoteBody("", "x"), "");
});

test("本文の日付行から日付を拾う", () => {
  assert.equal(noteDate("見出し\n2025年4月29日 11:08\n本文"), "2025年4月29日");
  assert.equal(noteDate("日付なし"), "");
  assert.equal(noteDate(undefined), "");
});
