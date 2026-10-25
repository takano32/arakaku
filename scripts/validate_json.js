#!/usr/bin/env node

// 生成 JSON をビューアの実モジュール (パーサ / ローダ / リポジトリ / 検索 / セクション描画) に通して
// 検証する。ブラウザを使わず Node で、実データに対して「読める・引ける・検索できる・描ける」を確かめる。

import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ADMIN_TABS, CORE_DATA_KEYS, DATA_FILES, PUBLIC_TABS } from "../docs/assets/js/config.js";
import { DataLoader } from "../docs/assets/js/data/loader.js";
import { fallbackForDataKey, parseDataFileEntries } from "../docs/assets/js/data/parser.js";
import { QueryMatcher } from "../docs/assets/js/data/query.js";
import { TAB_FILTERS } from "../docs/assets/js/data/filters.js";
import { Parts } from "../docs/assets/js/ui/parts.js";
import { SECTIONS } from "../docs/assets/js/ui/sections/index.js";

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

// DataLoader.fetchText の Node 実装。無いファイルは fallback テキストで補う
// (ブラウザ実装は HTTP エラーで throw し、ローダ側が fallback + dataLoadErrors に倒す)。
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

function validateSectionRegistry() {
  for (const [id] of [...PUBLIC_TABS, ...ADMIN_TABS]) {
    const section = SECTIONS[id];
    assert(section, `SECTIONS must define the tab: ${id}`);
    assert(typeof section.build === "function", `SECTIONS.${id}.build must be a function`);
    assert(section.label, `SECTIONS.${id} must have a label`);
  }
  for (const tabId of Object.keys(TAB_FILTERS)) {
    assert(SECTIONS[tabId], `TAB_FILTERS refers to an unknown tab: ${tabId}`);
  }
}

function validateParserFallbacks() {
  assert(Array.isArray(fallbackForDataKey("bouts")), "bouts fallback must be an array");
  assert(Array.isArray(fallbackForDataKey("sourceDocuments")), "sourceDocuments fallback must be an array");
  assert(Array.isArray(fallbackForDataKey("sourceDocumentBodies")), "sourceDocumentBodies fallback must be an array");
  assert(Array.isArray(fallbackForDataKey("sourceMentions")), "sourceMentions fallback must be an array");
  assert(!Array.isArray(fallbackForDataKey("metadata")), "metadata fallback must be an object");
  assert(!Array.isArray(fallbackForDataKey("aliases")), "aliases fallback must be an object");
  assert(Array.isArray(fallbackForDataKey("youtubeArchives")), "youtubeArchives fallback must be an array");
  assert(Array.isArray(fallbackForDataKey("noteArchives")), "noteArchives fallback must be an array");
}

function validateLoadedData(data, repository) {
  // 表示用の試合 (CSV + Numbers の補完 + Numbers だけの試合) は、結果がある限り勝ち 1・負け 1。
  // Numbers の矛盾した 2 行で「A def. A」や両者勝ちになっていた (T.89)。
  for (const bout of repository.richBouts) {
    const results = (bout.fighters ?? []).map((f) => f.result).filter((r) => r === "win" || r === "loss").sort().join();
    assert(results === "" || results === "loss,win", `bout ${bout.bout_id} must have one win and one loss, got ${results}`);
    assert(!bout.winner_id || bout.winner_id !== bout.loser_id, `bout ${bout.bout_id} has the same winner and loser`);
  }

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
  assert(Array.isArray(data.sourceDocumentBodies), "sourceDocumentBodies must be an array");
  assert(Array.isArray(data.sourceMentions), "sourceMentions must be an array");
  assert(typeof data.metadata === "object" && !Array.isArray(data.metadata), "metadata must be an object");
  assert(typeof data.aliases === "object" && !Array.isArray(data.aliases), "aliases must be an object");
  assert(Array.isArray(data.youtubeArchives), "youtubeArchives must be an array");
  assert(Array.isArray(data.noteArchives), "noteArchives must be an array");
  assert(Array.isArray(data.officialPages), "officialPages must be an array");
  assert(Array.isArray(data.officialNews), "officialNews must be an array");
  assert(data.officialPages.length > 0, "officialPages must not be empty (initial tab data)");
  assert(data.officialNews.length > 0, "officialNews must not be empty (initial tab data)");

  for (const bout of data.bouts) {
    const found = repository.findBout(bout.bout_id);
    assert(found && found.bout_id === bout.bout_id, `repository cannot resolve bout: ${bout.bout_id}`);
    assert(repository.findRichBout(bout.bout_id), `repository cannot resolve rich bout: ${bout.bout_id}`);
  }

  for (const event of data.events) {
    assert(repository.findEvent(event.event_id) === event, `repository cannot resolve event: ${event.event_id}`);
    assert(repository.findRichEvent(event.event_id), `repository cannot resolve rich event: ${event.event_id}`);
  }

  for (const fighter of data.fighters) {
    const found = repository.findFighter(fighter.fighter_id);
    assert(found && found.fighter_id === fighter.fighter_id, `repository cannot resolve fighter: ${fighter.fighter_id}`);
    assert(repository.findRichFighter(fighter.fighter_id), `repository cannot resolve rich fighter (merge/alias index): ${fighter.fighter_id}`);
  }

  for (const promotion of data.promotions) {
    assert(repository.findPromotion(promotion.promotion_id) === promotion, `repository cannot resolve promotion: ${promotion.promotion_id}`);
  }

  for (const video of data.videos) {
    assert(repository.videoById(video.video_id) === video, `repository cannot resolve video: ${video.video_id}`);
    repository.sourceContextForVideo(video);
    repository.getRichVideoInfo(video);
  }

  for (const article of data.articles) {
    assert(repository.findArticle(article.article_id) === article, `repository cannot resolve article: ${article.article_id}`);
    repository.getRichArticleInfo(article);
  }

  for (const link of data.videoLinks) {
    assert(repository.videoById(link.video_id), `video link points to unknown video: ${link.video_id}`);
  }

  // 名鑑のみの合成行も ID で引けること
  for (const event of repository.numbersOnlyEvents) {
    assert(repository.findEvent(event.event_id) === event, `numbers-only event is not resolvable: ${event.event_id}`);
  }
  for (const bout of repository.numbersOnlyBouts) {
    assert(repository.findBout(bout.bout_id) === bout, `numbers-only bout is not resolvable: ${bout.bout_id}`);
  }
}

function makeViewerContext(state) {
  const ctx = {
    state,
    get repo() {
      return this.state.repository;
    },
  };
  ctx.query = new QueryMatcher(state, () => state.repository);
  ctx.parts = new Parts(ctx);
  return ctx;
}

function validateViewerSearchPaths(state) {
  const ctx = makeViewerContext(state);
  const repo = state.repository;

  state.query = "";
  for (const fighter of repo.richFighters) assert(ctx.query.fighterMatches(fighter), `empty query must match fighter: ${fighter.fighter_id}`);
  for (const bout of repo.richBouts) assert(ctx.query.includes(ctx.query.boutSearchText(bout)), `empty query must match bout: ${bout.bout_id}`);
  for (const event of repo.richEvents) assert(ctx.query.eventMatches(event), `empty query must match event: ${event.event_id}`);
  for (const promotion of repo.richPromotions) assert(ctx.query.promotionMatches(promotion), `empty query must match promotion: ${promotion.promotion_id}`);
  for (const video of repo.richVideos) assert(ctx.query.videoMatches(video), `empty query must match video: ${video.video_id}`);
  for (const title of repo.richTitles) assert(ctx.query.titleMatches(title), `empty query must match title: ${title.title_id}`);
  for (const mention of repo.richSourceMentions) assert(ctx.query.mentionMatches(mention), `empty query must match mention: ${mention.mention_id}`);
  for (const document of repo.sourceDocuments) assert(ctx.query.sourceDocumentMatches(document), `empty query must match source document: ${document.source_id}`);

  const firstBout = state.data.bouts[0];
  if (firstBout) {
    state.query = firstBout.bout_id;
    assert(ctx.query.includes(ctx.query.boutSearchText(firstBout)), `bout id query must match bout: ${firstBout.bout_id}`);
    assert(ctx.query.boutMatches(firstBout), `bout id query must match bout via boutMatches: ${firstBout.bout_id}`);
  }
  // 全角半角・ひらがなカタカナ・大文字小文字の違いは同じ結果になり、空白区切りは AND で効くこと
  const countBouts = (query) => { state.query = query; return repo.richBouts.filter((b) => ctx.query.boutMatches(b)).length; };
  const katakana = countBouts("ターゲット");
  assert(katakana > 0, "query ターゲット must match some bouts");
  for (const variant of ["ﾀｰｹﾞｯﾄ", "たーげっと", " ターゲット　"]) assert(countBouts(variant) === katakana, `query ${variant} must match the same bouts as ターゲット`);
  assert(countBouts("ＴＡＲＧＥＴ") === countBouts("target"), "full-width TARGET must match the same bouts as target");
  assert(countBouts("ターゲット ミドル級") > 0 && countBouts("ターゲット ミドル級") < katakana, "space-separated terms must narrow the bouts (AND)");
  // 選手は団体名でも引けること
  state.query = "ターゲット";
  const targetFighters = repo.richFighters.filter((f) => f.main_promotion_id === "target");
  assert(targetFighters.every((f) => ctx.query.fighterMatches(f)), "query ターゲット must match every fighter whose main promotion is target");
  state.query = "";
}

// 全セクションを実データで build し、全行の head / body を実際に描画する (DOM 不要の文字列生成)。
// 描画関数が例外を投げる・空文字を返す・キーが重複する、といった壊れた行を Node で検出する。
function validateSectionRendering(state) {
  const ctx = makeViewerContext(state);
  state.query = "";
  state.mentionType = "";
  const summary = [];
  for (const [id, section] of Object.entries(SECTIONS)) {
    const desc = section.build(ctx);
    assert(Array.isArray(desc.items), `section ${id}: items must be an array`);
    assert(typeof desc.keyOf === "function", `section ${id}: keyOf must be a function`);
    assert(typeof desc.renderHead === "function" && typeof desc.renderBody === "function", `section ${id}: renderHead/renderBody must be functions`);
    const keys = new Set();
    for (const item of desc.items) {
      const key = desc.keyOf(item);
      assert(typeof key === "string" && key !== "", `section ${id}: every item needs a non-empty key`);
      assert(!keys.has(key), `section ${id}: duplicate row key ${key}`);
      keys.add(key);
      const head = desc.renderHead(item);
      assert(typeof head === "string" && head.trim() !== "", `section ${id}: renderHead returned nothing for ${key}`);
      assert(!/undefined|\[object Object\]|NaN/.test(head.replace(/<code>[^<]*<\/code>/g, "")), `section ${id}: renderHead leaked an undefined/object value for ${key}`);
      if (!desc.isHeader?.(item)) {
        const body = desc.renderBody(item);
        assert(typeof body === "string", `section ${id}: renderBody must return a string for ${key}`);
        assert(!/undefined|\[object Object\]|NaN/.test(body.replace(/<code>[^<]*<\/code>/g, "")), `section ${id}: renderBody leaked an undefined/object value for ${key}`);
        assert(!body.includes("&lt;iframe"), `section ${id}: renderBody shows a raw <iframe> tag as text for ${key}`);
      }
    }
    summary.push(`${id}=${desc.items.length}`);
  }
  // フォーカス (特定レコードだけの表示) も描けること
  const fighter = state.repository.richFighters[0];
  state.focusFighterId = fighter.fighter_id;
  const focused = SECTIONS.fighters.build(ctx);
  assert(focused.items.length === 1 && focused.items[0].fighter_id === fighter.fighter_id, "fighter focus must narrow the list to that fighter");
  state.focusFighterId = "";
  return summary.join(" ");
}

function makeTestState() {
  const state = {
    data: null,
    repository: null,
    query: "",
    mentionType: "",
    focusFighterId: "",
    focusEventId: "",
    focusBoutId: "",
    patchCount: 0,
    patch() {
      this.patchCount += 1;
    },
  };
  for (const group of Object.values(TAB_FILTERS).flat()) state[group.stateKey] = "";
  return state;
}

async function main() {
  validateSectionRegistry();
  validateParserFallbacks();

  const files = localDataFiles();
  // make build はすべての DATA_FILES を生成する。無いファイルを fallback で黙って通さない。
  for (const [key, path] of Object.entries(files)) {
    await access(path).catch(() => { throw new Error(`generated JSON is missing for ${key}: ${path}`); });
  }
  const parserEntries = await Promise.all(
    Object.entries(files).map(async ([key, path]) => [
      key,
      await readTextWithFallback(path, JSON.stringify(fallbackForDataKey(key))),
    ])
  );

  const parsedData = parseDataFileEntries(parserEntries);

  // 段階ロード (ブラウザと同じ load()) で CORE キーが揃い、ファイル内容と一致すること
  const initialState = makeTestState();
  await new DataLoader(initialState, { dataFiles: files, fetchText: readTextWithFallback }).load();
  for (const key of CORE_DATA_KEYS) {
    assert(initialState.loadedDataKeys.has(key), `initial load must include core key: ${key}`);
    assert(!(key in initialState.dataLoadErrors), `initial load failed for core key ${key}: ${initialState.dataLoadErrors[key]}`);
    assert(
      JSON.stringify(initialState.data[key]) === JSON.stringify(parsedData[key]),
      `initial load must match the parsed file for core key: ${key}`
    );
  }
  assert(!initialState.loadedDataKeys.has("sourceDocumentBodies"), "initial load must not include sourceDocumentBodies (lazy-loaded on the tsushin/sources tabs)");
  assert(!initialState.loadedDataKeys.has("sourceMentions"), "initial load must not include sourceMentions (lazy-loaded on the mentions tab)");
  assert(initialState.loadingDataKeys.size === 0, "no key may be left in the loading state after load()");

  // 失敗したファイルは fallback + dataLoadErrors + loaded 扱いになり、load() 自体は落ちないこと
  const failingState = makeTestState();
  const brokenFiles = { ...files, fighters: resolve(DOCS_DIR, "data/does-not-exist.json") };
  await new DataLoader(failingState, {
    dataFiles: brokenFiles,
    fetchText: async (path) => {
      const text = await readFile(path, "utf8");
      return text;
    },
  }).load();
  assert(failingState.loadedDataKeys.has("fighters"), "a failed key must still be marked loaded");
  assert("fighters" in failingState.dataLoadErrors, "a failed key must be recorded in dataLoadErrors");
  assert(Array.isArray(failingState.data.fighters) && failingState.data.fighters.length === 0, "a failed array key must fall back to []");

  // タブ遅延ロードで本文と言及が届くこと
  await new DataLoader(initialState, { dataFiles: files, fetchText: readTextWithFallback }).loadForTab("mentions");
  assert(initialState.loadedDataKeys.has("sourceMentions"), "loadForTab(mentions) must load sourceMentions");

  // 一括ロードがパーサと同一で、Repository / 検索 / セクション描画が実データで通ること
  const state = makeTestState();
  await new DataLoader(state, { dataFiles: files, fetchText: readTextWithFallback }).loadAll();

  assert(Object.keys(state.dataLoadErrors).length === 0, `real data must load without errors: ${JSON.stringify(state.dataLoadErrors)}`);
  assert(JSON.stringify(parsedData) === JSON.stringify(state.data), "parser and loader must produce identical data");
  validateLoadedData(state.data, state.repository);
  validateViewerSearchPaths(state);
  const rendered = validateSectionRendering(state);
  assert(state.patchCount >= 1, "DataLoader must notify state after loading data");

  console.log(`viewer JSON parser/loader validation passed (${rendered})`);
}

main().catch((error) => {
  console.error(`viewer JSON parser/loader validation failed: ${error.message}`);
  process.exit(1);
});
