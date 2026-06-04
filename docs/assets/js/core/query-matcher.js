/** Strategy: 検索クエリに対するマッチ判定 */
export class QueryMatcher {
  /** @param {import("./view-context.js").ViewContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
    this.#repoRef = null;
    this.#cache = new Map();
  }

  #repoRef;
  #cache;

  /** repo が切り替わったらキャッシュをクリアし、テキストを1回だけ計算して返す */
  #cachedText(key, buildFn) {
    if (this.ctx.repo !== this.#repoRef) {
      this.#repoRef = this.ctx.repo;
      this.#cache.clear();
    }
    if (!this.#cache.has(key)) {
      this.#cache.set(key, buildFn().filter(Boolean).join(" ").toLowerCase());
    }
    return this.#cache.get(key);
  }

  #matchQuery(text) {
    const q = this.ctx.state.query.trim().toLowerCase();
    return !q || text.includes(q);
  }

  includes(values) {
    const q = this.ctx.state.query.trim().toLowerCase();
    if (!q) return true;
    return values.filter(Boolean).join(" ").toLowerCase().includes(q);
  }

  fighterMatches(fighter) {
    return this.#matchQuery(this.#cachedText(`f:${fighter.fighter_id}`, () => {
      const s = this.ctx.repo.fighterSnapshotsForFighter(fighter.fighter_id);
      return [
        fighter.display_name,
        fighter.aliases?.join(" "),
        fighter.main_division,
        fighter.main_promotion_id,
        fighter.profile?.height,
        fighter.profile?.age,
        fighter.profile?.gym,
        fighter.summary,
        fighter.source_article_ids?.join(" "),
        fighter.inferred_from_video_ids?.join(" "),
        fighter.inferred_confidence,
        ...s.flatMap(x => [x.snapshot_id, x.event_id, x.source_article_id, x.age, x.height, x.gym, x.record_text, x.main_promotion_id, x.titles_text, x.catchphrase]),
      ];
    }));
  }

  boutSearchText(bout) {
    return [
      bout.bout_id, bout.matchup, bout.winner, bout.loser, bout.division, bout.weight_class_id, bout.bout_type, bout.source_article_id, bout.result_status, bout.inferred_from_video_id, bout.inferred_from_video_title, bout.inferred_confidence, bout.notes,
      ...(bout.fighters ?? []).map(f => f.name),
      bout.title?.title_id, bout.title?.title_result, bout.title?.note,
      this.ctx.repo.eventName(bout.event_id), this.ctx.repo.promotionName(bout.promotion_id),
      bout.result?.method_raw, bout.result?.method_normalized,
      ...this.ctx.sources.sourceReferencesForBout(bout).map(r => this.ctx.sources.sourceReferenceSearchText(r)),
    ];
  }

  boutMatches(bout) {
    return this.#matchQuery(this.#cachedText(`b:${bout.bout_id}`, () => this.boutSearchText(bout)));
  }

  eventMatches(event) {
    return this.#matchQuery(this.#cachedText(`e:${event.event_id}`, () => [
      event.name, event.event_id, event.event_type, event.source_article_id,
      event.source_video_ids?.join(" "), event.inferred_from, event.inferred_confidence, event.summary,
      this.ctx.repo.promotionName(event.promotion_id),
      ...this.ctx.repo.sourceReferencesForEvent(event).map(r => this.ctx.sources.sourceReferenceSearchText(r)),
    ]));
  }

  promotionMatches(promotion) {
    return this.#matchQuery(this.#cachedText(`p:${promotion.promotion_id}`, () => [
      promotion.name, promotion.name_en, promotion.promotion_id, promotion.category,
      promotion.country_scope, promotion.summary, promotion.source_article_ids?.join(" "),
      ...this.ctx.repo.eventsForPromotion(promotion.promotion_id).map(e => `${e.event_id} ${e.name}`),
      ...this.ctx.repo.titlesForPromotion(promotion.promotion_id).map(t => this.ctx.repo.titleDisplayName(t)),
    ]));
  }

  videoMatches(video) {
    return this.#matchQuery(this.#cachedText(`v:${video.video_id}`, () => {
      const richVideo = video.archive_metadata ? video : this.ctx.repo.getRichVideoInfo(video);
      const { reference, document } = this.ctx.repo.sourceContextForVideo(richVideo);
      return [
        richVideo.title, richVideo.original_title, richVideo.video_id, richVideo.url,
        richVideo.channel_name, richVideo.published_at, richVideo.archive_description,
        richVideo.platform, richVideo.platform_video_id, richVideo.official_status,
        richVideo.video_type, richVideo.link_status, richVideo.notes,
        richVideo.duplicate_group_id, richVideo.duplicate_note, richVideo.source_article_ids?.join(" "),
        reference?.content_preview, reference?.matched_texts, document?.content_preview,
      ];
    }));
  }

  titleMatches(title) {
    const { repo } = this.ctx;
    return this.#matchQuery(this.#cachedText(`t:${title.title_id}`, () => [
      title.title_id, title.division, repo.promotionName(title.promotion_id),
      ...(title.lineage ?? []).flatMap(r => [r.fighter_name, r.reign_label, r.won_at_event_id, r.lost_at_event_id, r.source_article_id, r.source_video_id]),
    ]));
  }

  mentionMatches(mention) {
    const { state } = this.ctx;
    if (state.mentionType && mention.mention_type !== state.mentionType) return false;
    return this.#matchQuery(this.#cachedText(`m:${mention.mention_id}`, () => {
      const d = this.ctx.repo.sourceDocumentById(mention.source_id);
      return [
        mention.mention_type, mention.entity_type, mention.entity_hint, mention.matched_text,
        mention.context, mention.source_id, mention.source_ref_id, mention.confidence, mention.notes,
        d?.title, d?.url,
      ];
    }));
  }

  sourceDocumentMatches(document) {
    return this.#matchQuery(this.#cachedText(`sd:${document.source_id}`, () => [
      document.title, document.url, document.source_type, document.source_ref_id,
      document.content_preview, document.content_text, document.notes,
    ]));
  }
}
