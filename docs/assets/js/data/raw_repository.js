import { IndexCache } from "./indexes.js";

/**
 * RawRepository — 生 JSON (state.data) への素のアクセサ。整形も enrich もしない配列と、
 * それを主キー・列で引く索引 (indexes.js の遅延キャッシュ) だけを持つ。
 * 加工済みのコレクション・関係の解決は、これを継承する DataRepository (repository.js) にある。
 *
 * - data の中身を差し替えたら invalidate() で索引を捨てる (DataRepository は自分のキャッシュも捨てる)。
 * - findById / findManyByField はコレクションのゲッター (this[collectionName]) を引く。
 *   events / sourceMentions は降順。sourceDocuments は DataRepository の本文結合済みの配列が対象になる
 *   (sourceDocumentById が content_text 付きの文書を返す契約)。
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

export class RawRepository {
  #indexes = new IndexCache();

  constructor(data) {
    this.data = data;
  }

  /** this.data の中身が更新された後に索引を捨てる。 */
  invalidate() {
    this.#indexes.clear();
  }

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

  /**
   * 記事 1 本から出ているリンク (article_links.json)。getter を文字列 ("articleLinks") でしか参照しないと
   * 使われていないように見えて消されかけたので、名前つきのメソッドにする (T.112.4.26)。
   */
  articleLinksForArticle(articleId) { return this.findManyByField("articleLinks", "article_id", articleId); }

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
  numbersFighterById(id) { return this.findById("numbersFighters", id); }

  findYoutubeArchive(displayId) { return this.#indexes.unique("youtubeArchives:display_id", this.youtubeArchives, (r) => r.display_id).get(displayId); }
  findNoteArchive(url) { return this.#indexes.unique("noteArchives:webpage_url", this.noteArchives, (r) => r.webpage_url).get(url); }

  // 団体名 → promotion_id (中黒・空白を無視した正規化照合)
  promotionIdByName(name) {
    if (!name) return undefined;
    const norm = (s) => String(s).replace(/[・·\s]/g, "");
    const index = this.#indexes.unique("promotions:normName", this.promotions, (p) => norm(p.name));
    return index.get(norm(name))?.promotion_id;
  }
}
