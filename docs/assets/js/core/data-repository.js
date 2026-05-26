import { BaseRepository } from "./base-repository.js";
import { DataEnricher } from "./data-enricher.js";

/** Repository: JSON データへの参照・検索を集約。Rich Data への変換とキャッシュを管理。 */
export class DataRepository extends BaseRepository {
  constructor(data) {
    super(data);
    this.enricher = new DataEnricher(this);
    this.#richFighters = null;
    this.#richBouts = null;
    this.#richVideos = null;
    this.#richArticles = null;
  }

  #richFighters;
  #richBouts;
  #richVideos;
  #richArticles;

  // Collection Accessors (Overriding with Rich and Sorted logic)
  get events() { return [...super.events].reverse(); }
  get fighters() { return super.fighters; } // Base fighters list

  get richFighters() {
    if (this.#richFighters) return this.#richFighters;
    
    const canonical = this.fighters;
    const fighterIds = new Set(canonical.map(f => f.fighter_id));
    
    // Discover fighters that only exist in Numbers matches
    const discovered = [];
    for (const match of this.numbersNameMatches) {
      const fid = match.matched_fighter_id || match.candidate_fighter_id;
      if (fid && !fighterIds.has(fid)) {
        discovered.push({ fighter_id: fid, display_name: match.numbers_name || fid });
        fighterIds.add(fid);
      }
    }
    
    const raw = [...canonical, ...discovered];
    this.#richFighters = raw.map(f => this.enricher.enrichFighter(f));
    return this.#richFighters;
  }

  get bouts() { return super.bouts; }
  get richBouts() {
    if (this.#richBouts) return this.#richBouts;
    this.#richBouts = super.bouts.map(b => this.enricher.enrichBout(b)).reverse();
    return this.#richBouts;
  }

  get videos() { return super.videos; }
  get richVideos() {
    if (this.#richVideos) return this.#richVideos;
    this.#richVideos = super.videos.map(v => this.enricher.enrichVideo(v)).reverse();
    return this.#richVideos;
  }

  get articles() { return super.articles; }
  get richArticles() {
    if (this.#richArticles) return this.#richArticles;
    this.#richArticles = super.articles.map(a => this.enricher.enrichArticle(a)).reverse();
    return this.#richArticles;
  }

  get sourceDocuments() { return [...super.sourceDocuments].reverse(); }
  get sourceMentions() { return [...super.sourceMentions].reverse(); }

  // Rich Finders
  findRichBout(id) { return this.richBouts.find(b => b.bout_id === id); }
  findRichFighter(id) { return this.richFighters.find(f => f.fighter_id === id); }
  findRichArticle(id) { return this.richArticles.find(a => a.article_id === id); }
  richVideoById(id) { return this.richVideos.find(v => v.video_id === id); }

  // Legacy/Compatibility Wrapper for Enriched Info
  getRichVideoInfo(video) { return this.enricher.enrichVideo(video); }
  getRichArticleInfo(article) { return this.enricher.enrichArticle(article); }

  // Label Methods
  eventName(id) { return this.findEvent(id)?.name ?? id; }
  promotionName(id) { return this.findPromotion(id)?.name ?? id; }
  fighterName(id) { return this.findRichFighter(id)?.display_name ?? id; }

  // Relationship Methods
  sourceDocumentForArticle(articleId) {
    return this.sourceDocuments?.find(d => 
      d.source_type === "note_article" && (d.source_ref_id === articleId || d.source_id === `note:${articleId}`)
    );
  }

  sourceDocumentForVideo(video) {
    return this.sourceDocuments?.find(d => 
      d.source_type === "youtube_description" && 
      (d.source_ref_id === video.video_id || d.source_id === `youtube_description:${video.video_id}` || d.url === video.url)
    );
  }

  videosForEntity(type, id) {
    return this.videoLinks
      .filter(l => l.entity_type === type && l.entity_id === id)
      .map(l => ({ link: l, video: this.richVideoById(l.video_id) }))
      .filter(i => i.video);
  }

  videoIdsLinkedToEventBouts(eventId) {
    const boutIds = new Set(this.richBouts.filter(b => b.event_id === eventId).map(b => b.bout_id));
    return new Set(this.videoLinks.filter(l => l.entity_type === "bout" && boutIds.has(l.entity_id)).map(l => l.video_id));
  }

  eventSourceVideoIdsWithoutBoutCoverage(event) {
    const covered = this.videoIdsLinkedToEventBouts(event.event_id);
    return (event.source_video_ids ?? []).filter(vid => vid && !covered.has(vid));
  }

  sourceReferencesForBout(bout) { return this.findManyByField("sourceBoutReferences", "bout_id", bout.bout_id); }
  sourceReferencesForEvent(event) { return this.findManyByField("sourceEventReferences", "event_id", event.event_id); }
  sourceReferenceForVideo(video) {
    return this.sourceVideoReferences.find(r => r.video_id === video.video_id);
  }

  sourceContextForVideo(video) {
    return {
      reference: this.sourceReferenceForVideo(video),
      document: this.sourceDocumentForVideo(video),
    };
  }

  fighterSnapshotsForFighter(fighterId) {
    return [...this.findManyByField("fighterSnapshots", "fighter_id", fighterId)]
      .sort((a, b) => String(b.event_id ?? "").localeCompare(String(a.event_id ?? ""), "ja"));
  }

  eventsForPromotion(promotionId) {
    return [...this.findManyByField("events", "promotion_id", promotionId)]
      .sort((a, b) => String(b.published_at ?? b.event_date ?? "").localeCompare(String(a.published_at ?? a.event_date ?? ""), "ja"));
  }

  titlesForPromotion(promotionId) { return this.findManyByField("titles", "promotion_id", promotionId); }
  videoLinksForVideo(videoId) { return this.findManyByField("videoLinks", "video_id", videoId); }

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
    return this.richBouts.filter(b => (b.fighters ?? []).some(f => f.fighter_id === fighterId));
  }

  boutsForEvent(eventId) {
    return this.richBouts
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
