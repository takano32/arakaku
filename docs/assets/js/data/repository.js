import { DataEnricher } from "./enricher.js";
import { eventSortDate } from "./event_dates.js";
import { discoverFighters, numbersOrder, sortByNumbersOrder } from "./fighter_catalog.js";
import { mergeDuplicateFighters } from "./fighter_merge.js";
import { IndexCache } from "./indexes.js";
import { buildNumbersOnly } from "./numbers_only.js";
import { SourceDocumentLookup } from "./source_lookup.js";
import { enrichTitle, titleDisplayName } from "./title_lineage.js";
import {
  boutReliability,
  eventReliability,
  fighterReliability,
  lowReliabilityLast,
  videoReliability,
} from "./reliability.js";

/**
 * DataRepository — ビューアのデータアクセス中枢。生 JSON (state.data) への素のアクセサの上に
 * 「Rich 変換 (enrich) + 信頼性ソート + 関係解決 + 重複選手統合」を載せた読み取り専用ファサード。
 *
 * - data/loader.js が state.data を共有しつつ 1 インスタンスを生成し、ロードのたびに invalidate() を呼ぶ。
 * - rich* ゲッターは遅延構築 + キャッシュ。data 差し替え後は必ず invalidate() を通すこと
 *   (キャッシュ・indexes・enricher を一括破棄し revision を進める)。
 * - 一覧系ゲッターは CSV 昇順 (古い順) を .reverse() で降順 (新しい順) にして返す。
 *   さらに lowReliabilityLast で低信頼を末尾へ寄せる。
 * - findRichFighter / 関連解決は fighter_merge.js の統合が作る merged_fighter_ids と
 *   #fighterAliasIndex に依存する。
 */

// findById が使う「コレクション名 → 主キー列名」対応表。
const COLLECTION_FIELDS = {
  events: "event_id",
  promotions: "promotion_id",
  bouts: "bout_id",
  fighters: "fighter_id",
  articles: "article_id",
  videos: "video_id",
  sourceDocuments: "source_id",
  numbersFighters: "numbers_fighter_id",
};

// invalidate() のたびに進む世代番号。インスタンスを作り直しても重複しないようモジュールレベルで
// 単調増加させる。外部キャッシュ (query / 一覧) は repo の同一性ではなく revision の変化で更新を検知する。
let nextRevision = 1;

export class DataRepository {
  constructor(data) {
    this.data = data;
    this.enricher = new DataEnricher(this);
    this.revision = nextRevision++;
    this.#indexes = new IndexCache();
    this.#memo = new Map();
    this.#resetCaches();
  }

  #richEvents;
  #richPromotions;
  #richFighters;
  #fighterAliasIndex;
  #richBouts;
  #richVideos;
  #richArticles;
  #richTitles;
  #sourceDocuments;
  #richSourceMentions;
  #sourceDocLookup;
  #numbersOnly;
  #indexes;
  #memo;

  #resetCaches() {
    this.#richEvents = null;
    this.#richPromotions = null;
    this.#richFighters = null;
    this.#fighterAliasIndex = null;
    this.#richBouts = null;
    this.#richVideos = null;
    this.#richArticles = null;
    this.#richTitles = null;
    this.#sourceDocuments = null;
    this.#richSourceMentions = null;
    this.#sourceDocLookup = null;
    this.#numbersOnly = null;
  }

  /**
   * this.data の中身が更新された後に全キャッシュを破棄する。data オブジェクトの同一性は
   * 維持されるため、Repository を作り直さずに Rich 変換・インデックス・enricher のキャッシュだけを無効化できる。
   */
  invalidate() {
    this.revision = nextRevision++;
    this.#resetCaches();
    this.#memo.clear();
    this.#indexes.clear();
    this.enricher.reset();
  }

  // ── 低レベル: 素のコレクションとインデックス (indexes.js の遅延キャッシュ) ──

  // findById / findManyByField はコレクションのゲッター (this[collectionName]) を引く。
  // events / sourceMentions は降順、sourceDocuments は本文結合済みの配列が対象になる
  // (sourceDocumentById が content_text 付きの文書を返す契約)。
  findById(collectionName, id) {
    const idField = COLLECTION_FIELDS[collectionName];
    const records = this[collectionName];
    if (!records) return undefined;
    return this.#indexes.unique(`${collectionName}:${idField}`, records, (record) => record[idField]).get(id);
  }

  findManyByField(collectionName, fieldName, value) {
    const records = this[collectionName] ?? [];
    return this.#indexes.group(`${collectionName}:${fieldName}:many`, records, (r) => r[fieldName]).get(value) ?? [];
  }

  /** 生 JSON の配列をそのまま (整形・enrich せず) 返す */
  raw(key) { return this.data[key] ?? []; }

  get promotions() { return this.raw("promotions"); }
  get fighters() { return this.raw("fighters"); }
  get bouts() { return this.raw("bouts"); }
  get videos() { return this.raw("videos"); }
  get articles() { return this.raw("articles"); }
  get articleLinks() { return this.raw("articleLinks"); }
  get titles() { return this.raw("titles"); }
  get videoLinks() { return this.raw("videoLinks"); }
  get fighterSnapshots() { return this.raw("fighterSnapshots"); }
  get numbersFighters() { return this.raw("numbersFighters"); }
  get numbersNameMatches() { return this.raw("numbersNameMatches"); }
  get numbersFightRecords() { return this.raw("numbersFightRecords"); }
  get sourceEventReferences() { return this.raw("sourceEventReferences"); }
  get sourceBoutReferences() { return this.raw("sourceBoutReferences"); }
  get sourceVideoReferences() { return this.raw("sourceVideoReferences"); }
  get youtubeArchives() { return this.raw("youtubeArchives"); }
  get noteArchives() { return this.raw("noteArchives"); }
  get officialPlayers() { return this.raw("officialPlayers"); }
  get officialTournaments() { return this.raw("officialTournaments"); }
  get officialMatches() { return this.raw("officialMatches"); }
  get officialHistory() { return this.raw("officialHistory"); }
  get officialPages() { return this.raw("officialPages"); }
  get officialNews() { return this.raw("officialNews"); }

  // CSV は昇順 (古い順)。ビューアは降順表示なので .reverse() で新しい順にする。
  get events() { return [...this.raw("events")].reverse(); }
  get sourceMentions() { return [...this.raw("sourceMentions")].reverse(); }

  findPromotion(id) { return this.findById("promotions", id); }
  findFighter(id) { return this.findById("fighters", id); }
  findArticle(id) { return this.findById("articles", id); }
  videoById(id) { return this.findById("videos", id); }
  sourceDocumentById(id) { return this.findById("sourceDocuments", id); }
  numbersFighterById(id) { return this.findById("numbersFighters", id); }
  // 名鑑のみの大会・試合も ID で引けるようにする (enrichBout の大会解決やリンクが使う)
  findEvent(id) { return this.findById("events", id) ?? this.#numbersOnlyData().eventById.get(id); }
  findBout(id) { return this.findById("bouts", id) ?? this.#numbersOnlyData().boutById.get(id); }

  findYoutubeArchive(displayId) { return this.#indexes.unique("youtubeArchives:display_id", this.youtubeArchives, (r) => r.display_id).get(displayId); }
  findNoteArchive(url) { return this.#indexes.unique("noteArchives:webpage_url", this.noteArchives, (r) => r.webpage_url).get(url); }

  // ── Rich コレクション ───────────────────────────────────────────────

  get richEvents() {
    if (this.#richEvents) return this.#richEvents;
    // 名鑑のみの大会は開催日が分からないので、昇順リストの先頭に置いて reverse で同じ信頼度の末尾に回す
    const enriched = [...this.numbersOnlyEvents, ...this.raw("events")].map(e => this.enricher.enrichEvent(e)).reverse();
    this.#richEvents = lowReliabilityLast(enriched, eventReliability);
    return this.#richEvents;
  }

  get richPromotions() {
    if (this.#richPromotions) return this.#richPromotions;
    this.#richPromotions = this.promotions.slice();
    return this.#richPromotions;
  }

  get richFighters() {
    if (this.#richFighters) return this.#richFighters;

    const canonical = this.fighters;
    const discovered = discoverFighters(canonical, this.numbersNameMatches, this.officialPlayers);
    const ordered = sortByNumbersOrder([...canonical, ...discovered], numbersOrder(this.numbersFighters, this.numbersNameMatches));
    const enriched = ordered.map(f => this.enricher.enrichFighter(f));
    const { survivors, aliasIndex } = mergeDuplicateFighters(enriched, new Set(canonical.map(f => f.fighter_id)));
    this.#fighterAliasIndex = aliasIndex;
    this.#richFighters = lowReliabilityLast(survivors, fighterReliability);
    return this.#richFighters;
  }

  get richBouts() {
    if (this.#richBouts) return this.#richBouts;
    const enriched = [...this.numbersOnlyBouts, ...this.raw("bouts")].map(b => this.enricher.enrichBout(b)).reverse();
    this.#richBouts = lowReliabilityLast(enriched, boutReliability);
    return this.#richBouts;
  }

  get richVideos() {
    if (this.#richVideos) return this.#richVideos;
    const enriched = this.raw("videos").map(v => this.enricher.enrichVideo(v)).reverse();
    this.#richVideos = lowReliabilityLast(enriched, videoReliability);
    return this.#richVideos;
  }

  get richArticles() {
    if (this.#richArticles) return this.#richArticles;
    this.#richArticles = this.raw("articles").map(a => this.enricher.enrichArticle(a)).reverse();
    return this.#richArticles;
  }

  // 出典本文は降順にし、本文 (source_document_bodies) が届いていれば content_text を結合する。
  get sourceDocuments() {
    if (this.#sourceDocuments) return this.#sourceDocuments;
    const docs = [...this.raw("sourceDocuments")].reverse();
    const bodies = this.data.sourceDocumentBodies;
    if (!bodies?.length) {
      this.#sourceDocuments = docs;
      return docs;
    }
    const bodyMap = this.#indexes.unique("sourceDocumentBodies:source_id", bodies, b => b.source_id);
    this.#sourceDocuments = docs.map(d => {
      const body = bodyMap.get(d.source_id);
      return body ? { ...d, content_text: body.content_text } : d;
    });
    return this.#sourceDocuments;
  }

  get richSourceMentions() {
    if (this.#richSourceMentions) return this.#richSourceMentions;
    this.#richSourceMentions = this.raw("sourceMentions").slice().reverse();
    return this.#richSourceMentions;
  }

  get numbersOnlyEvents() { return this.#numbersOnlyData().events; }
  get numbersOnlyBouts() { return this.#numbersOnlyData().bouts; }

  // 名鑑にだけある大会・試合の合成は numbers_only.js。ここでは revision ごとに 1 回だけ組み立てる。
  #numbersOnlyData() {
    this.#numbersOnly ??= buildNumbersOnly({
      events: this.raw("events"),
      fightRecords: this.numbersFightRecords,
      promotionName: (id) => this.promotionName(id),
    });
    return this.#numbersOnly;
  }

  // ── Rich finders ──────────────────────────────────────────────────

  findRichEvent(id) { return this.#indexes.unique("richEvents:event_id", this.richEvents, e => e.event_id).get(id); }
  findRichBout(id) { return this.#indexes.unique("richBouts:bout_id", this.richBouts, b => b.bout_id).get(id); }
  findRichFighter(id) {
    if (!id) return undefined;
    void this.richFighters; // alias index を構築させる
    return this.#fighterAliasIndex.get(id);
  }
  findRichArticle(id) { return this.#indexes.unique("richArticles:article_id", this.richArticles, a => a.article_id).get(id); }
  richVideoById(id) { return this.#indexes.unique("richVideos:video_id", this.richVideos, v => v.video_id).get(id); }

  // 単発の enrich (一覧キャッシュを作らずに 1 件だけ補完する)
  getRichVideoInfo(video) { return this.enricher.enrichVideo(video); }
  getRichArticleInfo(article) { return this.enricher.enrichArticle(article); }

  // ── 名前解決 ────────────────────────────────────────────────────────

  eventName(id) { return this.findEvent(id)?.name ?? id; }
  promotionName(id) { return this.findPromotion(id)?.name ?? id; }
  fighterName(id) { return this.findRichFighter(id)?.display_name ?? id; }

  // 団体名 → promotion_id (中黒・空白を無視した正規化照合)
  promotionIdByName(name) {
    if (!name) return undefined;
    const norm = (s) => String(s).replace(/[・·\s]/g, "");
    const index = this.#indexes.unique("promotions:normName", this.promotions, (p) => norm(p.name));
    return index.get(norm(name))?.promotion_id;
  }

  titleDisplayName(title) { return titleDisplayName(title, this.promotionName(title.promotion_id)); }

  // ── 出典本文の引き当て (source_lookup.js) ──────────────────────────

  #sourceDocumentLookup() {
    this.#sourceDocLookup ??= new SourceDocumentLookup(this.sourceDocuments);
    return this.#sourceDocLookup;
  }

  sourceDocumentForArticle(articleId) { return this.#sourceDocumentLookup().forArticle(articleId); }
  sourceDocumentForVideo(video) { return this.#sourceDocumentLookup().forVideo(video); }

  // ── 関係ヘルパ ─────────────────────────────────────────────────────

  videosForEntity(type, id) {
    return (this.#indexes.group("videoLinks:entity", this.videoLinks, l => `${l.entity_type}\0${l.entity_id}`).get(`${type}\0${id}`) ?? [])
      .map(l => ({ link: l, video: this.richVideoById(l.video_id) }))
      .filter(i => i.video);
  }

  videoIdsLinkedToEventBouts(eventId) {
    const boutIds = new Set(this.richBouts.filter(b => b.event_id === eventId).map(b => b.bout_id));
    return new Set(this.videoLinks.filter(l => l.entity_type === "bout" && boutIds.has(l.entity_id)).map(l => l.video_id));
  }

  sourceReferencesForBout(bout) { return this.findManyByField("sourceBoutReferences", "bout_id", bout.bout_id); }
  sourceReferencesForEvent(event) { return this.findManyByField("sourceEventReferences", "event_id", event.event_id); }
  sourceReferenceForVideo(video) {
    return this.findManyByField("sourceVideoReferences", "video_id", video.video_id)[0];
  }

  sourceContextForVideo(video) {
    return {
      reference: this.sourceReferenceForVideo(video),
      document: this.sourceDocumentForVideo(video),
    };
  }

  // 同じ引数の結果を invalidate() まで使い回す (検索のキー入力ごとの再フィルタ・再ソートを避ける)
  #memoized(key, compute) {
    if (!this.#memo.has(key)) this.#memo.set(key, compute());
    return this.#memo.get(key);
  }

  fighterSnapshotsForFighter(fighterId) {
    return this.#memoized(`fighterSnapshots:${fighterId}`, () => {
      const ids = new Set(this.findRichFighter(fighterId)?.merged_fighter_ids ?? [fighterId]);
      return this.fighterSnapshots
        .filter(s => ids.has(s.fighter_id))
        .sort((a, b) => eventSortDate(this.findEvent(b.event_id)).localeCompare(eventSortDate(this.findEvent(a.event_id)))
          || String(b.event_id ?? "").localeCompare(String(a.event_id ?? ""), "ja"));
    });
  }

  eventsForPromotion(promotionId) {
    return this.#memoized(`eventsForPromotion:${promotionId}`, () =>
      [...this.findManyByField("events", "promotion_id", promotionId), ...this.numbersOnlyEvents.filter(e => e.promotion_id === promotionId)]
        .sort((a, b) => eventSortDate(b).localeCompare(eventSortDate(a)) || (b.event_number ?? 0) - (a.event_number ?? 0)));
  }

  titlesForPromotion(promotionId) { return this.richTitles.filter(t => t.promotion_id === promotionId); }
  videoLinksForVideo(videoId) { return this.findManyByField("videoLinks", "video_id", videoId); }

  countSourceReferences(sourceId) {
    const count = (name, records) =>
      (this.#indexes.group(`${name}:source_id`, records, r => r.source_id).get(sourceId)?.length ?? 0);
    return {
      events: count("sourceEventReferences", this.sourceEventReferences),
      bouts: count("sourceBoutReferences", this.sourceBoutReferences),
      videos: count("sourceVideoReferences", this.sourceVideoReferences),
    };
  }

  countSourceMentions(sourceId, mentionTypes) {
    const counts = Object.fromEntries(mentionTypes.map(t => [t, 0]));
    const mentions = this.#indexes.group("sourceMentions:source_id", this.sourceMentions, m => m.source_id).get(sourceId) ?? [];
    for (const m of mentions) {
      if (m.mention_type in counts) counts[m.mention_type]++;
    }
    return counts;
  }

  relatedBoutsForFighter(fighterId) {
    if (!fighterId) return [];
    return this.#memoized(`relatedBouts:${fighterId}`, () => {
      const ids = new Set(this.findRichFighter(fighterId)?.merged_fighter_ids ?? [fighterId]);
      return this.richBouts.filter(b => (b.fighters ?? []).some(f => ids.has(f.fighter_id)));
    });
  }

  // 大会内の試合は試合順の昇順 (第1試合 → メインイベント) のまま返す
  boutsForEvent(eventId) {
    // 大会の行ごとに呼ばれるので、全試合の走査ではなく event_id の索引から引く (T.85)。
    return [...(this.#indexes.group("richBouts:event_id", this.richBouts, b => b.event_id).get(eventId) ?? [])]
      .sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));
  }

  // ── 王座 ───────────────────────────────────────────────────────────

  // 歴代の獲得・喪失大会の補完は title_lineage.js (獲得大会は title_reigns.csv に明示されたものだけ。T.89)
  get richTitles() {
    if (this.#richTitles) return this.#richTitles;
    this.#richTitles = this.titles.map(enrichTitle);
    return this.#richTitles;
  }
}
