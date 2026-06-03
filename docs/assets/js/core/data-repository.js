import { BaseRepository } from "./base-repository.js";
import { DataEnricher } from "./data-enricher.js";
import {
  boutReliability,
  eventReliability,
  fighterReliability,
  lowReliabilityLast,
  videoReliability,
} from "./reliability.js";

/** Repository: JSON データへの参照・検索を集約。Rich Data への変換とキャッシュを管理。 */
export class DataRepository extends BaseRepository {
  constructor(data) {
    super(data);
    this.enricher = new DataEnricher(this);
    this.#richEvents = null;
    this.#richPromotions = null;
    this.#richFighters = null;
    this.#richBouts = null;
    this.#richVideos = null;
    this.#richArticles = null;
    this.#richTitles = null;
    this.#sourceDocuments = null;
    this.#richFighterSnapshots = null;
    this.#richBoutParticipants = null;
    this.#richVideoLinks = null;
    this.#richArticleLinks = null;
    this.#richSourceMentions = null;
    this.#richSourceEventReferences = null;
    this.#richSourceBoutReferences = null;
    this.#richSourceVideoReferences = null;
  }

  #richEvents;
  #richPromotions;
  #richFighters;
  #richBouts;
  #richVideos;
  #richArticles;
  #richTitles;
  #sourceDocuments;
  #richFighterSnapshots;
  #richBoutParticipants;
  #richVideoLinks;
  #richArticleLinks;
  #richSourceMentions;
  #richSourceEventReferences;
  #richSourceBoutReferences;
  #richSourceVideoReferences;

  // Collection Accessors (Overriding with Rich and Sorted logic)
  get events() { return [...super.events].reverse(); }
  get richEvents() {
    if (this.#richEvents) return this.#richEvents;
    const enriched = super.events.map(e => this.enricher.enrichEvent(e)).reverse();
    this.#richEvents = lowReliabilityLast(enriched, eventReliability);
    return this.#richEvents;
  }

  get promotions() { return super.promotions; }
  get richPromotions() {
    if (this.#richPromotions) return this.#richPromotions;
    this.#richPromotions = super.promotions.map(p => this.enricher.enrichPromotion(p));
    return this.#richPromotions;
  }

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

    // Build numbers order: numbers_fighter_id sequence → fighter_id rank
    const numbersOrder = new Map();
    for (const nf of this.numbersFighters) {
      const match = this.numbersNameMatches.find(m => m.numbers_fighter_id === nf.numbers_fighter_id);
      const fid = match?.matched_fighter_id || match?.candidate_fighter_id;
      if (fid && !numbersOrder.has(fid)) numbersOrder.set(fid, numbersOrder.size);
    }

    const raw = [...canonical, ...discovered];
    const originalIndex = new Map(raw.map((f, idx) => [f.fighter_id, idx]));
    raw.sort((a, b) => {
      const ai = numbersOrder.has(a.fighter_id) ? numbersOrder.get(a.fighter_id) : Infinity;
      const bi = numbersOrder.has(b.fighter_id) ? numbersOrder.get(b.fighter_id) : Infinity;
      if (ai === Infinity && bi === Infinity) {
        return originalIndex.get(a.fighter_id) - originalIndex.get(b.fighter_id);
      }
      if (ai === Infinity) return 1;
      if (bi === Infinity) return -1;
      return ai - bi;
    });
    const enriched = raw.map(f => this.enricher.enrichFighter(f));
    this.#richFighters = lowReliabilityLast(enriched, fighterReliability);
    return this.#richFighters;
  }

  get bouts() { return super.bouts; }
  get richBouts() {
    if (this.#richBouts) return this.#richBouts;
    const enriched = super.bouts.map(b => this.enricher.enrichBout(b)).reverse();
    this.#richBouts = lowReliabilityLast(enriched, boutReliability);
    return this.#richBouts;
  }

  get videos() { return super.videos; }
  get richVideos() {
    if (this.#richVideos) return this.#richVideos;
    const enriched = super.videos.map(v => this.enricher.enrichVideo(v)).reverse();
    this.#richVideos = lowReliabilityLast(enriched, videoReliability);
    return this.#richVideos;
  }

  get articles() { return super.articles; }
  get richArticles() {
    if (this.#richArticles) return this.#richArticles;
    this.#richArticles = super.articles.map(a => this.enricher.enrichArticle(a)).reverse();
    return this.#richArticles;
  }

  get sourceDocuments() {
    if (this.#sourceDocuments) return this.#sourceDocuments;
    const docs = [...super.sourceDocuments].reverse();
    const bodies = this.data.sourceDocumentBodies;
    if (!bodies?.length) {
      this.#sourceDocuments = docs;
      return docs;
    }
    const bodyMap = this.index("sourceDocumentBodies:source_id", bodies, b => b.source_id);
    this.#sourceDocuments = docs.map(d => {
      const body = bodyMap.get(d.source_id);
      return body ? { ...d, content_text: body.content_text } : d;
    });
    return this.#sourceDocuments;
  }

  get sourceMentions() { return [...super.sourceMentions].reverse(); }
  get richSourceMentions() {
    if (this.#richSourceMentions) return this.#richSourceMentions;
    this.#richSourceMentions = super.sourceMentions.map(m => this.enricher.enrichSourceMention(m)).reverse();
    return this.#richSourceMentions;
  }

  get fighterSnapshots() { return super.fighterSnapshots; }
  get richFighterSnapshots() {
    if (this.#richFighterSnapshots) return this.#richFighterSnapshots;
    this.#richFighterSnapshots = super.fighterSnapshots.map(s => this.enricher.enrichFighterSnapshot(s));
    return this.#richFighterSnapshots;
  }

  get boutParticipants() { return super.boutParticipants; }
  get richBoutParticipants() {
    if (this.#richBoutParticipants) return this.#richBoutParticipants;
    this.#richBoutParticipants = super.boutParticipants.map(p => this.enricher.enrichBoutParticipant(p));
    return this.#richBoutParticipants;
  }

  get videoLinks() { return super.videoLinks; }
  get richVideoLinks() {
    if (this.#richVideoLinks) return this.#richVideoLinks;
    this.#richVideoLinks = super.videoLinks.map(l => this.enricher.enrichVideoLink(l));
    return this.#richVideoLinks;
  }

  get articleLinks() { return super.articleLinks; }
  get richArticleLinks() {
    if (this.#richArticleLinks) return this.#richArticleLinks;
    this.#richArticleLinks = super.articleLinks.map(l => this.enricher.enrichArticleLink(l));
    return this.#richArticleLinks;
  }

  get sourceEventReferences() { return super.sourceEventReferences; }
  get richSourceEventReferences() {
    if (this.#richSourceEventReferences) return this.#richSourceEventReferences;
    this.#richSourceEventReferences = super.sourceEventReferences.map(r => this.enricher.enrichSourceEventReference(r));
    return this.#richSourceEventReferences;
  }

  get sourceBoutReferences() { return super.sourceBoutReferences; }
  get richSourceBoutReferences() {
    if (this.#richSourceBoutReferences) return this.#richSourceBoutReferences;
    this.#richSourceBoutReferences = super.sourceBoutReferences.map(r => this.enricher.enrichSourceBoutReference(r));
    return this.#richSourceBoutReferences;
  }

  get sourceVideoReferences() { return super.sourceVideoReferences; }
  get richSourceVideoReferences() {
    if (this.#richSourceVideoReferences) return this.#richSourceVideoReferences;
    this.#richSourceVideoReferences = super.sourceVideoReferences.map(r => this.enricher.enrichSourceVideoReference(r));
    return this.#richSourceVideoReferences;
  }

  // Rich Finders
  findRichEvent(id) { return this.richEvents.find(e => e.event_id === id); }
  findRichPromotion(id) { return this.richPromotions.find(p => p.promotion_id === id); }
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

  titlesForPromotion(promotionId) { return this.richTitles.filter(t => t.promotion_id === promotionId); }
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

  get richTitles() {
    if (this.#richTitles) return this.#richTitles;

    // Build source_video_id → event_id map from bouts.inferred_from_video_id
    const videoEventMap = new Map();
    for (const bout of super.bouts) {
      if (bout.inferred_from_video_id && bout.event_id) {
        videoEventMap.set(bout.inferred_from_video_id, bout.event_id);
      }
    }

    this.#richTitles = this.titles.map((title) => {
      const lineage = (title.lineage ?? []).map((r) => ({ ...r }));

      // Derive won_at from source_video_id via bouts cross-reference
      for (const reign of lineage) {
        if (!reign.won_at_event_id && reign.source_video_id) {
          const eventId = videoEventMap.get(reign.source_video_id);
          if (eventId) reign.won_at_event_id = eventId;
        }
      }

      // Forward pass: derive lost_at from next reign's won_at
      for (let i = 0; i < lineage.length - 1; i++) {
        if (!lineage[i].lost_at_event_id && lineage[i + 1].won_at_event_id) {
          lineage[i].lost_at_event_id = lineage[i + 1].won_at_event_id;
        }
      }
      // Backward pass: derive won_at from previous reign's lost_at
      for (let i = lineage.length - 1; i > 0; i--) {
        if (!lineage[i].won_at_event_id && lineage[i - 1].lost_at_event_id) {
          lineage[i].won_at_event_id = lineage[i - 1].lost_at_event_id;
        }
      }

      return { ...title, lineage };
    });
    return this.#richTitles;
  }

  titleDisplayName(title) {
    const p = this.promotionName(title.promotion_id);
    const d = title.division ?? "階級未設定";
    if (title.title_id?.includes("tournament")) return `${p} ${d}トーナメント`;
    if (title.promotion_id === "max_bout") return `${p} ${d}`;
    return `${p} ${d}王座`;
  }
}
