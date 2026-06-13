/**
 * BaseRepository — DataRepository の親クラス。生 JSON (state.data) への
 * 「素のアクセサ」と汎用インデックス機構だけを提供する低レベル層。
 *
 * アーキ上の位置 / 関係:
 *   data-loader.js が組み立てた state.data を受け取り、DataRepository が継承する。
 *   ここのゲッターは JSON の配列をそのまま (整形・enrich せず) 返す。
 *   並べ替え・Rich 変換・名鑑/公式の合成は全て子クラス DataRepository 側の責務。
 *
 * 不変条件 / 注意:
 *   - data オブジェクトは同一性を保ったまま中身が差し替えられる (ストリーミング load)。
 *     よってインデックスは DataRepository.invalidate() で indexes.clear() される前提で、
 *     「素の配列」をキャプチャするだけにとどめ、ここに重い派生キャッシュを持たせない。
 *   - findById は COLLECTION_FIELDS の id 列名に依存する。新コレクションを findById で
 *     引くなら必ずここへ登録すること。
 *   関連スキル: .agents/skills/arakaku-viewer-ui
 */

// findById が使う「コレクション名 → 主キー列名」対応表。
// findById に渡すコレクションはここに登録が必要 (子クラスのゲッター名と一致させる)。
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

/** BaseRepository: 生データへのアクセスとインデックス管理 */
export class BaseRepository {
  constructor(data) {
    this.data = data;
    this.indexes = new Map();
  }

  // 1キー1レコードの Map を遅延構築してキャッシュ。同名キーは後勝ち (set で上書き)。
  index(name, records, keyForRecord) {
    if (this.indexes.has(name)) return this.indexes.get(name);
    const index = new Map();
    if (records) {
      for (const record of records) {
        const key = keyForRecord(record);
        if (key) index.set(key, record);
      }
    }
    this.indexes.set(name, index);
    return index;
  }

  findById(collectionName, id) {
    const idField = COLLECTION_FIELDS[collectionName];
    const records = this[collectionName];
    if (!records) return undefined;
    return this.index(`${collectionName}:${idField}`, records, (record) => record[idField]).get(id);
  }

  // index と同様だが 1キー → レコード配列 (1対多) を構築する遅延キャッシュ。
  groupIndex(name, records, keyForRecord) {
    if (this.indexes.has(name)) return this.indexes.get(name);
    const index = new Map();
    if (records) {
      for (const record of records) {
        const key = keyForRecord(record);
        if (!key) continue;
        const group = index.get(key) ?? [];
        group.push(record);
        index.set(key, group);
      }
    }
    this.indexes.set(name, index);
    return index;
  }

  findManyByField(collectionName, fieldName, value) {
    const records = this[collectionName] ?? [];
    return this.groupIndex(`${collectionName}:${fieldName}:many`, records, (r) => r[fieldName]).get(value) ?? [];
  }

  // Collection Accessors (Raw or as-is from JSON)
  get events() { return this.data.events ?? []; }
  get promotions() { return this.data.promotions ?? []; }
  get fighters() { return this.data.fighters ?? []; }
  get bouts() { return this.data.bouts ?? []; }
  get videos() { return this.data.videos ?? []; }
  get articles() { return this.data.articles ?? []; }
  get sourceDocuments() { return this.data.sourceDocuments ?? []; }
  get sourceDocumentBodies() { return this.data.sourceDocumentBodies ?? []; }
  get sourceMentions() { return this.data.sourceMentions ?? []; }

  // Relationship and Metadata tables
  get articleLinks() { return this.data.articleLinks ?? []; }
  get boutParticipants() { return this.data.boutParticipants ?? []; }
  get titles() { return this.data.titles ?? []; }
  get titleReigns() { return this.data.titleReigns ?? []; }
  get videoLinks() { return this.data.videoLinks ?? []; }
  get fighterSnapshots() { return this.data.fighterSnapshots ?? []; }
  get numbersFighters() { return this.data.numbersFighters ?? []; }
  get numbersNameMatches() { return this.data.numbersNameMatches ?? []; }
  get numbersFightRecords() { return this.data.numbersFightRecords ?? []; }
  get sourceEventReferences() { return this.data.sourceEventReferences ?? []; }
  get sourceBoutReferences() { return this.data.sourceBoutReferences ?? []; }
  get sourceVideoReferences() { return this.data.sourceVideoReferences ?? []; }
  get youtubeArchives() { return this.data.youtubeArchives ?? []; }
  get noteArchives() { return this.data.noteArchives ?? []; }
  get officialPlayers() { return this.data.officialPlayers ?? []; }
  get officialTournaments() { return this.data.officialTournaments ?? []; }
  get officialMatches() { return this.data.officialMatches ?? []; }
  get officialHistory() { return this.data.officialHistory ?? []; }
  get officialPages() { return this.data.officialPages ?? []; }
  get officialNews() { return this.data.officialNews ?? []; }

  // Simple Finders
  findEvent(id) { return this.findById("events", id); }
  findPromotion(id) { return this.findById("promotions", id); }
  findBout(id) { return this.findById("bouts", id); }
  findFighter(id) { return this.findById("fighters", id); }
  findArticle(id) { return this.findById("articles", id); }
  videoById(id) { return this.findById("videos", id); }
  sourceDocumentById(id) { return this.findById("sourceDocuments", id); }
  numbersFighterById(id) { return this.findById("numbersFighters", id); }

  // Archive Lookups
  findYoutubeArchive(displayId) { return this.index("youtubeArchives:display_id", this.youtubeArchives, (r) => r.display_id).get(displayId); }
  findNoteArchive(url) { return this.index("noteArchives:webpage_url", this.noteArchives, (r) => r.webpage_url).get(url); }
}
