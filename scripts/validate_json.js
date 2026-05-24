#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DATA_FILES } from "../docs/assets/js/config.js";
import { DataLoader } from "../docs/assets/js/data-loader.js";
import { fallbackForDataKey, parseDataFileEntries } from "../docs/assets/js/core/data-parser.js";
import { QueryMatcher } from "../docs/assets/js/core/query-matcher.js";
import { SourceRenderers } from "../docs/assets/js/services/source-renderers.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const DOCS_DIR = resolve(ROOT, "docs");

function localDataFiles() {
  return Object.fromEntries(
    Object.entries(DATA_FILES).map(([key, path]) => [
      key,
      resolve(DOCS_DIR, path.replace(/^\.\//, "")),
    ])
  );
}

async function readTextWithFallback(path, fallback) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateParserFallbacks() {
  assert(Array.isArray(fallbackForDataKey("bouts")), "bouts fallback must be an array");
  assert(Array.isArray(fallbackForDataKey("sourceDocuments")), "sourceDocuments fallback must be an array");
  assert(!Array.isArray(fallbackForDataKey("database")), "database fallback must be an object");
  assert(!Array.isArray(fallbackForDataKey("metadata")), "metadata fallback must be an object");
  assert(!Array.isArray(fallbackForDataKey("aliases")), "aliases fallback must be an object");
}

function validateLoadedData(data, repository) {
  assert(Array.isArray(data.bouts), "bouts must be an array");
  assert(Array.isArray(data.events), "events must be an array");
  assert(Array.isArray(data.fighters), "fighters must be an array");
  assert(Array.isArray(data.promotions), "promotions must be an array");
  assert(Array.isArray(data.articleLinks), "articleLinks must be an array");
  assert(Array.isArray(data.videos), "videos must be an array");
  assert(Array.isArray(data.boutParticipants), "boutParticipants must be an array");
  assert(Array.isArray(data.titleReigns), "titleReigns must be an array");
  assert(Array.isArray(data.videoLinks), "videoLinks must be an array");
  assert(Array.isArray(data.sourceDocuments), "sourceDocuments must be an array");
  assert(typeof data.metadata === "object" && !Array.isArray(data.metadata), "metadata must be an object");
  assert(typeof data.database === "object" && !Array.isArray(data.database), "database must be an object");
  assert(typeof data.aliases === "object" && !Array.isArray(data.aliases), "aliases must be an object");

  for (const bout of data.bouts) {
    assert(repository.findBout(bout.bout_id) === bout, `repository cannot resolve bout: ${bout.bout_id}`);
  }

  for (const event of data.events) {
    assert(repository.findEvent(event.event_id) === event, `repository cannot resolve event: ${event.event_id}`);
  }

  for (const fighter of data.fighters) {
    assert(repository.findFighter(fighter.fighter_id) === fighter, `repository cannot resolve fighter: ${fighter.fighter_id}`);
  }

  for (const promotion of data.promotions) {
    assert(repository.findPromotion(promotion.promotion_id) === promotion, `repository cannot resolve promotion: ${promotion.promotion_id}`);
  }

  for (const video of data.videos) {
    assert(repository.videoById(video.video_id) === video, `repository cannot resolve video: ${video.video_id}`);
    repository.sourceContextForVideo(video);
  }

  for (const link of data.videoLinks) {
    assert(repository.videoById(link.video_id), `video link points to unknown video: ${link.video_id}`);
  }
}

function makeViewerContext(state) {
  const ctx = {
    state,
    get repo() {
      return this.state.repository;
    },
    sources: null,
  };
  ctx.sources = new SourceRenderers(ctx);
  ctx.query = new QueryMatcher(ctx);
  return ctx;
}

function validateViewerSearchPaths(state) {
  const ctx = makeViewerContext(state);

  state.query = "";
  for (const fighter of state.data.fighters) assert(ctx.query.fighterMatches(fighter), `empty query must match fighter: ${fighter.fighter_id}`);
  for (const bout of state.data.bouts) assert(ctx.query.includes(ctx.query.boutSearchText(bout)), `empty query must match bout: ${bout.bout_id}`);
  for (const event of state.data.events) assert(ctx.query.eventMatches(event), `empty query must match event: ${event.event_id}`);
  for (const promotion of state.data.promotions) assert(ctx.query.promotionMatches(promotion), `empty query must match promotion: ${promotion.promotion_id}`);
  for (const video of state.data.videos) assert(ctx.query.videoMatches(video), `empty query must match video: ${video.video_id}`);
  for (const title of state.data.titles) assert(ctx.query.titleMatches(title), `empty query must match title: ${title.title_id}`);
  for (const mention of state.data.sourceMentions) assert(ctx.query.mentionMatches(mention), `empty query must match mention: ${mention.mention_id}`);
  for (const document of state.data.sourceDocuments) assert(ctx.query.sourceDocumentMatches(document), `empty query must match source document: ${document.source_id}`);

  const firstBout = state.data.bouts[0];
  if (firstBout) {
    state.query = firstBout.bout_id;
    assert(ctx.query.includes(ctx.query.boutSearchText(firstBout)), `bout id query must match bout: ${firstBout.bout_id}`);
  }
}

function makeTestState() {
  return {
    data: null,
    repository: null,
    query: "",
    titlePromotion: "",
    titleDivision: "",
    mentionType: "",
    patchCount: 0,
    patch() {
      this.patchCount += 1;
    },
  };
}

async function main() {
  validateParserFallbacks();

  const files = localDataFiles();
  const parserEntries = await Promise.all(
    Object.entries(files).map(async ([key, path]) => [
      key,
      await readTextWithFallback(path, JSON.stringify(fallbackForDataKey(key))),
    ])
  );

  const parsedData = parseDataFileEntries(parserEntries);

  const state = makeTestState();
  await new DataLoader(state, {
    dataFiles: files,
    fetchText: readTextWithFallback,
  }).load();

  assert(JSON.stringify(parsedData) === JSON.stringify(state.data), "parser and loader must produce identical data");
  validateLoadedData(state.data, state.repository);
  validateViewerSearchPaths(state);
  assert(state.patchCount === 1, "DataLoader must notify state exactly once");

  console.log("viewer JSON parser/loader validation passed");
}

main().catch((error) => {
  console.error(`viewer JSON parser/loader validation failed: ${error.message}`);
  process.exit(1);
});
