#!/usr/bin/env node
// DataRepository.invalidate (data/repository.js) のユニットテスト (DOM 不要・依存ゼロ、node:test)。
// data の中身を差し替えてから invalidate() すると、メモ・名鑑だけの大会と試合・出典本文の引き当てを捨てて
// 今のデータで作り直し、revision が進むことを確かめる。
import test from "node:test";
import assert from "node:assert/strict";

import { fakeData, fakeRepo } from "./fixtures/fake_repo.mjs";

test("invalidate は revision を進める (インスタンスをまたいでも増え続ける)", () => {
  const repo = fakeRepo();
  const first = repo.revision;
  repo.invalidate();
  assert.ok(repo.revision > first);
  assert.ok(fakeRepo().revision > repo.revision);
});

test("メモ (fighterSnapshotsForFighter) は invalidate まで使い回し、その後は今のデータで作り直す", () => {
  const data = fakeData();
  const repo = fakeRepo(data);
  const before = repo.fighterSnapshotsForFighter("kabei");
  assert.deepEqual(before.map((s) => s.snapshot_id), ["kabei-target-1"]);
  data.fighterSnapshots = [];
  assert.equal(repo.fighterSnapshotsForFighter("kabei"), before);
  repo.invalidate();
  assert.deepEqual(repo.fighterSnapshotsForFighter("kabei"), []);
});

test("名鑑だけの大会と試合は invalidate まで使い回し、その後は今の個人成績で作り直す", () => {
  const data = fakeData();
  const repo = fakeRepo(data);
  const before = repo.numbersOnlyEvents;
  assert.deepEqual(before.map((e) => e.event_id), ["numbers-target-2"]);
  assert.ok(repo.findBout(repo.numbersOnlyBouts[0].bout_id));
  data.numbersFightRecords = [];
  assert.equal(repo.numbersOnlyEvents, before);
  repo.invalidate();
  assert.deepEqual(repo.numbersOnlyEvents, []);
  assert.deepEqual(repo.numbersOnlyBouts, []);
  assert.equal(repo.findEvent("numbers-target-2"), undefined);
});

test("出典本文の引き当ては invalidate まで使い回し、その後は今の文書で作り直す", () => {
  const data = fakeData();
  const repo = fakeRepo(data);
  assert.equal(repo.sourceDocumentForArticle("note-emperor")?.source_id, "note:note-emperor");
  data.sourceDocuments = data.sourceDocuments.filter((doc) => doc.source_ref_id !== "note-emperor");
  assert.equal(repo.sourceDocumentForArticle("note-emperor")?.source_id, "note:note-emperor");
  repo.invalidate();
  assert.equal(repo.sourceDocumentForArticle("note-emperor"), undefined);
  assert.equal(repo.sourceDocumentForArticle("note-target-1")?.source_id, "note:note-target-1");
});
