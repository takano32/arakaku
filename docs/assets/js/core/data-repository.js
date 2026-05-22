/** Repository: JSON データへの参照・検索を集約 */
export class DataRepository {
  /** @param {Record<string, unknown>} data */
  constructor(data) {
    this.data = data;
  }

  #indexes = new Map();

  #index(name, records, keyForRecord) {
    if (this.#indexes.has(name)) {
      return this.#indexes.get(name);
    }

    const index = new Map();
    for (const record of records) {
      const key = keyForRecord(record);
      if (key) {
        index.set(key, record);
      }
    }
    this.#indexes.set(name, index);
    return index;
  }

  #findById(collectionName, idField, id) {
    return this.#index(`${collectionName}:${idField}`, this[collectionName], (record) => record[idField]).get(id);
  }

  #groupIndex(name, records, keyForRecord) {
    if (this.#indexes.has(name)) {
      return this.#indexes.get(name);
    }

    const index = new Map();
    for (const record of records) {
      const key = keyForRecord(record);
      if (!key) {
        continue;
      }
      const group = index.get(key) ?? [];
      group.push(record);
      index.set(key, group);
    }
    this.#indexes.set(name, index);
    return index;
  }

  #findManyByField(collectionName, fieldName, value) {
    return this.#groupIndex(`${collectionName}:${fieldName}:many`, this[collectionName], (record) => record[fieldName]).get(value) ?? [];
  }

  get events() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.events ?? []);
  }

  get promotions() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.promotions ?? []);
  }

  get fighters() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.fighters ?? []);
  }

  get bouts() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.bouts ?? []);
  }

  get titles() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.titles ?? []);
  }

  get videos() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.videos ?? []);
  }

  get videoLinks() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.videoLinks ?? []);
  }

  get articles() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.articles ?? []);
  }

  get fighterSnapshots() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.fighterSnapshots ?? []);
  }

  get sourceDocuments() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.sourceDocuments ?? []);
  }

  get sourceMentions() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.sourceMentions ?? []);
  }

  get sourceEventReferences() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.sourceEventReferences ?? []);
  }

  get sourceBoutReferences() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.sourceBoutReferences ?? []);
  }

  get sourceVideoReferences() {
    return /** @type {Array<Record<string, unknown>>} */ (this.data.sourceVideoReferences ?? []);
  }

  eventName(eventId) {
    return this.findEvent(eventId)?.name ?? eventId;
  }

  promotionName(promotionId) {
    return this.findPromotion(promotionId)?.name ?? promotionId;
  }

  fighterName(fighterId) {
    return this.findFighter(fighterId)?.display_name ?? fighterId;
  }

  findEvent(eventId) {
    return this.#findById("events", "event_id", eventId);
  }

  findPromotion(promotionId) {
    return this.#findById("promotions", "promotion_id", promotionId);
  }

  findBout(boutId) {
    return this.#findById("bouts", "bout_id", boutId);
  }

  findFighter(fighterId) {
    return this.#findById("fighters", "fighter_id", fighterId);
  }

  findArticle(articleId) {
    return this.#findById("articles", "article_id", articleId);
  }

  videoById(videoId) {
    return this.#findById("videos", "video_id", videoId);
  }

  sourceDocumentById(sourceId) {
    return this.#findById("sourceDocuments", "source_id", sourceId);
  }

  sourceDocumentForArticle(articleId) {
    return this.sourceDocuments.find(
      (document) =>
        document.source_type === "note_article" &&
        (document.source_ref_id === articleId || document.source_id === `note:${articleId}`)
    );
  }

  sourceDocumentForVideo(video) {
    return this.sourceDocuments.find(
      (document) =>
        document.source_type === "youtube_description" &&
        (document.source_ref_id === video.video_id ||
          document.source_id === `youtube_description:${video.video_id}` ||
          document.url === video.url)
    );
  }

  videosForEntity(entityType, entityId) {
    return this.videoLinks
      .filter((link) => link.entity_type === entityType && link.entity_id === entityId)
      .map((link) => ({
        link,
        video: this.videoById(link.video_id),
      }))
      .filter((item) => item.video);
  }

  videoIdsLinkedToEventBouts(eventId) {
    const boutIds = new Set(
      this.bouts.filter((bout) => bout.event_id === eventId).map((bout) => bout.bout_id)
    );
    const videoIds = new Set();

    for (const link of this.videoLinks) {
      if (link.entity_type === "bout" && boutIds.has(link.entity_id) && link.video_id) {
        videoIds.add(link.video_id);
      }
    }

    return videoIds;
  }

  eventSourceVideoIdsWithoutBoutCoverage(event) {
    const covered = this.videoIdsLinkedToEventBouts(event.event_id);
    return (event.source_video_ids ?? []).filter((videoId) => videoId && !covered.has(videoId));
  }

  sourceReferencesForBout(bout) {
    return this.sourceBoutReferences.filter((reference) => reference.bout_id === bout.bout_id);
  }

  sourceReferencesForEvent(event) {
    return this.sourceEventReferences.filter((reference) => reference.event_id === event.event_id);
  }

  sourceReferenceForVideo(video) {
    return this.sourceVideoReferences.find((reference) => reference.video_id === video.video_id);
  }

  sourceContextForVideo(video) {
    return {
      reference: this.sourceReferenceForVideo(video),
      document: this.sourceDocumentForVideo(video),
    };
  }

  fighterSnapshotsForFighter(fighterId) {
    return [...this.#findManyByField("fighterSnapshots", "fighter_id", fighterId)].sort((a, b) =>
      String(b.event_id ?? "").localeCompare(String(a.event_id ?? ""), "ja")
    );
  }

  eventsForPromotion(promotionId) {
    return [...this.#findManyByField("events", "promotion_id", promotionId)].sort((a, b) =>
      String(b.published_at ?? b.event_date ?? "").localeCompare(String(a.published_at ?? a.event_date ?? ""), "ja")
    );
  }

  titlesForPromotion(promotionId) {
    return this.#findManyByField("titles", "promotion_id", promotionId);
  }

  videoLinksForVideo(videoId) {
    return this.#findManyByField("videoLinks", "video_id", videoId);
  }

  countSourceReferences(sourceId) {
    const countBySource = (references) =>
      references.filter((reference) => reference.source_id === sourceId).length;

    return {
      events: countBySource(this.sourceEventReferences),
      bouts: countBySource(this.sourceBoutReferences),
      videos: countBySource(this.sourceVideoReferences),
    };
  }

  countSourceMentions(sourceId, mentionTypes) {
    const counts = Object.fromEntries(mentionTypes.map((mentionType) => [mentionType, 0]));

    for (const mention of this.sourceMentions) {
      if (mention.source_id !== sourceId || !(mention.mention_type in counts)) {
        continue;
      }
      counts[mention.mention_type] += 1;
    }

    return counts;
  }

  relatedBoutsForFighter(fighterId) {
    if (!fighterId) return [];

    return this.bouts
      .filter((bout) => (bout.fighters ?? []).some((fighter) => fighter.fighter_id === fighterId))
      .sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));
  }

  boutsForEvent(eventId) {
    return this.bouts
      .filter((bout) => bout.event_id === eventId)
      .sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));
  }

  titleDisplayName(title) {
    const promotion = this.promotionName(title.promotion_id);
    const division = title.division ?? "階級未設定";
    const id = title.title_id ?? "";

    if (id.includes("tournament")) {
      return `${promotion} ${division}トーナメント`;
    }

    if (title.promotion_id === "max_bout") {
      return `${promotion} ${division}`;
    }

    return `${promotion} ${division}王座`;
  }
}
