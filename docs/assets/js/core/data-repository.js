/** Repository: JSON データへの参照・検索を集約 */
export class DataRepository {
  /** @param {Record<string, unknown>} data */
  constructor(data) {
    this.data = data;
    this.#indexes = new Map();
  }

  #indexes;

  #index(name, records, keyForRecord) {
    if (this.#indexes.has(name)) return this.#indexes.get(name);
    const index = new Map();
    for (const record of records) {
      const key = keyForRecord(record);
      if (key) index.set(key, record);
    }
    this.#indexes.set(name, index);
    return index;
  }

  #findById(collectionName, idField, id) {
    return this.#index(`${collectionName}:${idField}`, this[collectionName], (r) => r[idField]).get(id);
  }

  #groupIndex(name, records, keyForRecord) {
    if (this.#indexes.has(name)) return this.#indexes.get(name);
    const index = new Map();
    for (const record of records) {
      const key = keyForRecord(record);
      if (!key) continue;
      const group = index.get(key) ?? [];
      group.push(record);
      index.set(key, group);
    }
    this.#indexes.set(name, index);
    return index;
  }

  #findManyByField(collectionName, fieldName, value) {
    return this.#groupIndex(`${collectionName}:${fieldName}:many`, this[collectionName], (r) => r[fieldName]).get(value) ?? [];
  }

  // Collection Accessors
  get events() { return this.data.events ?? []; }
  get promotions() { return this.data.promotions ?? []; }
  get fighters() { return this.data.fighters ?? []; }
  get bouts() { return this.data.bouts ?? []; }
  get titles() { return this.data.titles ?? []; }
  get videos() { return this.data.videos ?? []; }
  get videoLinks() { return this.data.videoLinks ?? []; }
  get articles() { return this.data.articles ?? []; }
  get fighterSnapshots() { return this.data.fighterSnapshots ?? []; }
  get sourceDocuments() { return this.data.sourceDocuments ?? []; }
  get sourceMentions() { return this.data.sourceMentions ?? []; }
  get sourceEventReferences() { return this.data.sourceEventReferences ?? []; }
  get sourceBoutReferences() { return this.data.sourceBoutReferences ?? []; }
  get sourceVideoReferences() { return this.data.sourceVideoReferences ?? []; }

  // Finder Methods
  findEvent(id) { return this.#findById("events", "event_id", id); }
  findPromotion(id) { return this.#findById("promotions", "promotion_id", id); }
  findBout(id) { return this.#findById("bouts", "bout_id", id); }
  findFighter(id) { return this.#findById("fighters", "fighter_id", id); }
  findArticle(id) { return this.#findById("articles", "article_id", id); }
  videoById(id) { return this.#findById("videos", "video_id", id); }
  sourceDocumentById(id) { return this.#findById("sourceDocuments", "source_id", id); }

  // Label Methods
  eventName(id) { return this.findEvent(id)?.name ?? id; }
  promotionName(id) { return this.findPromotion(id)?.name ?? id; }
  fighterName(id) { return this.findFighter(id)?.display_name ?? id; }

  // Source Document Resolution
  sourceDocumentForArticle(articleId) {
    return this.sourceDocuments.find(d => 
      d.source_type === "note_article" && (d.source_ref_id === articleId || d.source_id === `note:${articleId}`)
    );
  }

  sourceDocumentForVideo(video) {
    return this.sourceDocuments.find(d => 
      d.source_type === "youtube_description" && 
      (d.source_ref_id === video.video_id || d.source_id === `youtube_description:${video.video_id}` || d.url === video.url)
    );
  }

  // Relationship Methods
  videosForEntity(type, id) {
    return this.videoLinks
      .filter(l => l.entity_type === type && l.entity_id === id)
      .map(l => ({ link: l, video: this.videoById(l.video_id) }))
      .filter(i => i.video);
  }

  videoIdsLinkedToEventBouts(eventId) {
    const boutIds = new Set(this.bouts.filter(b => b.event_id === eventId).map(b => b.bout_id));
    return new Set(this.videoLinks.filter(l => l.entity_type === "bout" && boutIds.has(l.entity_id)).map(l => l.video_id));
  }

  eventSourceVideoIdsWithoutBoutCoverage(event) {
    const covered = this.videoIdsLinkedToEventBouts(event.event_id);
    return (event.source_video_ids ?? []).filter(vid => vid && !covered.has(vid));
  }

  sourceReferencesForBout(bout) { return this.#findManyByField("sourceBoutReferences", "bout_id", bout.bout_id); }
  sourceReferencesForEvent(event) { return this.#findManyByField("sourceEventReferences", "event_id", event.event_id); }
  sourceReferenceForVideo(video) {
    return this.sourceVideoReferences.find(r => r.video_id === video.video_id);
  }

  fighterSnapshotsForFighter(fighterId) {
    return [...this.#findManyByField("fighterSnapshots", "fighter_id", fighterId)]
      .sort((a, b) => String(b.event_id ?? "").localeCompare(String(a.event_id ?? ""), "ja"));
  }

  eventsForPromotion(promotionId) {
    return [...this.#findManyByField("events", "promotion_id", promotionId)]
      .sort((a, b) => String(b.published_at ?? b.event_date ?? "").localeCompare(String(a.published_at ?? a.event_date ?? ""), "ja"));
  }

  titlesForPromotion(promotionId) { return this.#findManyByField("titles", "promotion_id", promotionId); }
  videoLinksForVideo(videoId) { return this.#findManyByField("videoLinks", "video_id", videoId); }

  // Statistics Methods
  countSourceReferences(sourceId) {
    const count = (list) => list.filter(r => r.source_id === sourceId).length;
    return {
      events: count(this.sourceEventReferences),
      bouts: count(this.sourceBoutReferences),
      videos: count(this.sourceVideoReferences),
    };
  }

  countSourceMentions(sourceId, mentionTypes) {
    const counts = Object.fromEntries(mentionTypes.map(t => [t, 0]));
    for (const m of this.sourceMentions) {
      if (m.source_id === sourceId && m.mention_type in counts) counts[m.mention_type]++;
    }
    return counts;
  }

  relatedBoutsForFighter(fighterId) {
    if (!fighterId) return [];
    return this.bouts
      .filter(b => (b.fighters ?? []).some(f => f.fighter_id === fighterId))
      .sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));
  }

  boutsForEvent(eventId) {
    return this.bouts
      .filter(b => b.event_id === eventId)
      .sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));
  }

  titleDisplayName(title) {
    const p = this.promotionName(title.promotion_id);
    const d = title.division ?? "階級未設定";
    if (title.title_id?.includes("tournament")) return `${p} ${d}トーナメント`;
    if (title.promotion_id === "max_bout") return `${p} ${d}`;
    return `${p} ${d}王座`;
  }
}
