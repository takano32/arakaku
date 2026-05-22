/** Repository: JSON データへの参照・検索を集約 */
export class DataRepository {
  /** @param {Record<string, unknown>} data */
  constructor(data) {
    this.data = data;
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
    return this.events.find((event) => event.event_id === eventId)?.name ?? eventId;
  }

  promotionName(promotionId) {
    return this.promotions.find((promotion) => promotion.promotion_id === promotionId)?.name ?? promotionId;
  }

  fighterName(fighterId) {
    return this.fighters.find((fighter) => fighter.fighter_id === fighterId)?.display_name ?? fighterId;
  }

  findEvent(eventId) {
    return this.events.find((event) => event.event_id === eventId);
  }

  findBout(boutId) {
    return this.bouts.find((bout) => bout.bout_id === boutId);
  }

  findFighter(fighterId) {
    return this.fighters.find((fighter) => fighter.fighter_id === fighterId);
  }

  findArticle(articleId) {
    return this.articles.find((article) => article.article_id === articleId);
  }

  videoById(videoId) {
    return this.videos.find((video) => video.video_id === videoId);
  }

  sourceDocumentById(sourceId) {
    return this.sourceDocuments.find((document) => document.source_id === sourceId);
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
