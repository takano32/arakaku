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

/** Repository: JSON データへの参照・検索を集約 */
export class DataRepository {
  /** @param {Record<string, unknown>} data */
  constructor(data) {
    this.data = data;
    this.#indexes = new Map();
    this.#richFighters = null;
    this.#richBouts = null;
  }

  #indexes;
  #richFighters;
  #richBouts;

  #index(name, records, keyForRecord) {
    if (this.#indexes.has(name)) return this.#indexes.get(name);
    const index = new Map();
    if (records) {
      for (const record of records) {
        const key = keyForRecord(record);
        if (key) index.set(key, record);
      }
    }
    this.#indexes.set(name, index);
    return index;
  }

  #findById(collectionName, id) {
    const idField = COLLECTION_FIELDS[collectionName];
    const records = this[collectionName];
    if (!records) return undefined;
    return this.#index(`${collectionName}:${idField}`, records, (record) => record[idField]).get(id);
  }

  #groupIndex(name, records, keyForRecord) {
    if (this.#indexes.has(name)) return this.#indexes.get(name);
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
    this.#indexes.set(name, index);
    return index;
  }

  #findManyByField(collectionName, fieldName, value) {
    const records = this[collectionName] ?? [];
    return this.#groupIndex(`${collectionName}:${fieldName}:many`, records, (r) => r[fieldName]).get(value) ?? [];
  }

  // Collection Accessors
  get events() { return this.data.events ?? []; }
  get promotions() { return this.data.promotions ?? []; }
  get articleLinks() { return this.data.articleLinks ?? []; }
  get fighters() {
    if (this.#richFighters) return this.#richFighters;
    const raw = this.data.fighters ?? [];
    this.#richFighters = raw.map(f => this.getRichFighterInfo(f));
    return this.#richFighters;
  }
  get bouts() {
    if (this.#richBouts) return this.#richBouts;
    const raw = this.data.bouts ?? [];
    this.#richBouts = raw.map(b => this.getRichBoutInfo(b));
    return this.#richBouts;
  }
  get boutParticipants() { return this.data.boutParticipants ?? []; }
  get titles() { return this.data.titles ?? []; }
  get titleReigns() { return this.data.titleReigns ?? []; }
  get videos() { return this.data.videos ?? []; }
  get videoLinks() { return this.data.videoLinks ?? []; }
  get articles() { return this.data.articles ?? []; }
  get fighterSnapshots() { return this.data.fighterSnapshots ?? []; }
  get sourceDocuments() { return this.data?.sourceDocuments ?? []; }
  get sourceMentions() { return this.data?.sourceMentions ?? []; }
  get numbersFighters() { return this.data.numbersFighters ?? []; }
  get numbersNameMatches() { return this.data.numbersNameMatches ?? []; }
  get numbersFightRecords() { return this.data.numbersFightRecords ?? []; }
  get sourceEventReferences() { return this.data.sourceEventReferences ?? []; }
  get sourceBoutReferences() { return this.data.sourceBoutReferences ?? []; }
  get sourceVideoReferences() { return this.data.sourceVideoReferences ?? []; }
  get youtubeArchives() { return this.data.youtubeArchives ?? []; }
  get noteArchives() { return this.data.noteArchives ?? []; }

  // Finder Methods
  findEvent(id) { return this.#findById("events", id); }
  findPromotion(id) { return this.#findById("promotions", id); }
  findBout(id) { return this.#findById("bouts", id); }
  findFighter(id) { return this.#findById("fighters", id); }
  findArticle(id) { return this.#findById("articles", id); }
  videoById(id) { return this.#findById("videos", id); }
  sourceDocumentById(id) { return this.#findById("sourceDocuments", id); }
  numbersFighterById(id) { return this.#findById("numbersFighters", id); }

  // Archive Lookups
  findYoutubeArchive(displayId) { return this.#index("youtubeArchives:display_id", this.youtubeArchives, (r) => r.display_id).get(displayId); }
  findNoteArchive(url) { return this.#index("noteArchives:webpage_url", this.noteArchives, (r) => r.webpage_url).get(url); }

  getRichVideoInfo(video) {
    const archive = this.findYoutubeArchive(video.platform_video_id);
    return {
      ...video,
      title: archive?.fulltitle ?? video.title,
      channel_name: archive?.uploader ?? video.channel_name,
      published_at: archive?.upload_date ?? video.published_at,
      archive_description: archive?.description,
      archive_metadata: archive,
    };
  }

  getRichArticleInfo(article) {
    const archive = this.findNoteArchive(article.url);
    return {
      ...article,
      title: archive?.title ?? article.title,
      archive_description: archive?.description,
    };
  }

  getRichFighterInfo(fighter) {
    const match = this.numbersNameMatches.find(m => m.matched_fighter_id === fighter.fighter_id || m.candidate_fighter_id === fighter.fighter_id);
    const nf = match ? this.numbersFighterById(match.numbers_fighter_id) : undefined;
    if (!nf) return fighter;

    const rich = { ...fighter };
    // Prioritize Numbers data as it is human-verified and treated as source of truth
    if (nf.display_name) rich.display_name = nf.display_name;
    if (nf.main_division) rich.main_division = nf.main_division;
    if (nf.main_promotion_id) rich.main_promotion_id = nf.main_promotion_id;
    
    rich.profile = { ...(rich.profile ?? {}) };
    if (nf.profile?.height) rich.profile.height = nf.profile.height;
    if (nf.profile?.age) rich.profile.age = nf.profile.age;
    if (nf.profile?.gym) rich.profile.gym = nf.profile.gym;

    if (nf.catchphrase || nf.notes) {
      rich.summary = [nf.catchphrase, nf.notes].filter(Boolean).join("\n\n");
    }
    
    rich.numbers_data = nf;
    return rich;
  }

  getRichBoutInfo(bout) {
    const rich = { ...bout };
    const event = this.findEvent(bout.event_id);
    if (!event) return rich;

    const participants = (bout.fighters ?? []).map(f => ({ ...f }));
    const fighterIds = new Set(participants.map(f => f.fighter_id).filter(Boolean));

    // Match by promotion, event number, and at least one fighter (either matched or candidate)
    const records = this.numbersFightRecords.filter(r => 
      r.promotion_id === bout.promotion_id &&
      r.event_number_normalized === String(event.event_number) &&
      (
        fighterIds.has(r.matched_fighter_id) || 
        fighterIds.has(r.candidate_fighter_id) || 
        fighterIds.has(r.opponent_matched_fighter_id) ||
        fighterIds.has(r.opponent_candidate_fighter_id)
      )
    );

    if (records.length === 0) return rich;

    // Use Numbers records to fill fields, prioritizing direct matches
    for (const p of participants) {
      if (!p.fighter_id) continue;
      
      // 1. Direct match: this participant is the main fighter of the record
      let r = records.find(rec => rec.matched_fighter_id === p.fighter_id || rec.candidate_fighter_id === p.fighter_id);
      if (r && r.result) {
        p.result = r.result;
        continue;
      }
      
      // 2. Opponent match: this participant is the opponent of the record
      // Infer result if the record for the main fighter exists and has a result
      r = records.find(rec => rec.opponent_matched_fighter_id === p.fighter_id || rec.opponent_candidate_fighter_id === p.fighter_id);
      if (r && r.result) {
        if (r.result === "win") p.result = "loss";
        else if (r.result === "loss") p.result = "win";
        continue;
      }
    }
    rich.fighters = participants;

    const hasWinner = participants.some(p => p.result === "win");
    const hasLoss = participants.some(p => p.result === "loss");
    if (rich.result_status === "unknown" && (hasWinner || hasLoss)) {
      rich.result_status = "numbers_verified";
    }

    // Supplement bout result details from any available Numbers record
    const recordWithDetail = records.find(r => r.detail_raw);
    if (recordWithDetail) {
      rich.result = {
        ...(rich.result ?? {}),
        method_raw: recordWithDetail.detail_raw,
      };
    }

    rich.numbers_records = records;
    return rich;
  }

  // Label Methods
  eventName(id) { return this.findEvent(id)?.name ?? id; }
  promotionName(id) { return this.findPromotion(id)?.name ?? id; }
  fighterName(id) { return this.findFighter(id)?.display_name ?? id; }

  // Source Document Resolution
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

  sourceContextForVideo(video) {
    return {
      reference: this.sourceReferenceForVideo(video),
      document: this.sourceDocumentForVideo(video),
    };
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
