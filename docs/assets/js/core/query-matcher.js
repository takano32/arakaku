/** Strategy: 検索クエリに対するマッチ判定 */
export class QueryMatcher {
  /** @param {import("./view-context.js").ViewContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }

  includes(values) {
    const q = this.ctx.state.query.trim().toLowerCase();
    if (!q) return true;

    return values
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  }

  fighterMatches(fighter) {
    const snapshots = this.ctx.repo.fighterSnapshotsForFighter(fighter.fighter_id);

    return this.includes([
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
      ...snapshots.flatMap((snapshot) => [
        snapshot.snapshot_id,
        snapshot.event_id,
        snapshot.source_article_id,
        snapshot.age,
        snapshot.height,
        snapshot.gym,
        snapshot.record_text,
        snapshot.main_promotion_id,
        snapshot.titles_text,
        snapshot.catchphrase,
      ]),
    ]);
  }

  boutSearchText(bout) {
    const fighterNames = (bout.fighters ?? [])
      .map((fighter) => fighter.name)
      .filter(Boolean)
      .join(" ");

    return [
      bout.bout_id,
      bout.matchup,
      fighterNames,
      bout.winner,
      bout.loser,
      bout.division,
      bout.weight_class_id,
      bout.bout_type,
      bout.source_article_id,
      bout.result_status,
      bout.inferred_from_video_id,
      bout.inferred_from_video_title,
      bout.inferred_confidence,
      bout.title?.title_id,
      bout.title?.title_result,
      bout.title?.note,
      this.ctx.repo.eventName(bout.event_id),
      this.ctx.repo.promotionName(bout.promotion_id),
      bout.result?.method_raw,
      bout.result?.method_normalized,
      bout.notes,
      ...this.ctx.sources.sourceReferencesForBout(bout).map((reference) =>
        this.ctx.sources.sourceReferenceSearchText(reference)
      ),
    ];
  }

  eventMatches(event) {
    return this.includes([
      event.name,
      event.event_id,
      event.event_type,
      event.source_article_id,
      event.source_video_ids?.join(" "),
      event.inferred_from,
      event.inferred_confidence,
      this.ctx.repo.promotionName(event.promotion_id),
      event.summary,
      ...this.ctx.repo
        .sourceReferencesForEvent(event)
        .map((reference) => this.ctx.sources.sourceReferenceSearchText(reference)),
    ]);
  }

  promotionMatches(promotion) {
    return this.includes([
      promotion.name,
      promotion.name_en,
      promotion.promotion_id,
      promotion.category,
      promotion.country_scope,
      promotion.summary,
      promotion.source_article_ids?.join(" "),
      ...this.ctx.repo
        .eventsForPromotion(promotion.promotion_id)
        .map((event) => [event.event_id, event.name].join(" ")),
      ...this.ctx.repo.titlesForPromotion(promotion.promotion_id).map((title) => this.ctx.repo.titleDisplayName(title)),
    ]);
  }

  videoMatches(video) {
    const { reference, document } = this.ctx.repo.sourceContextForVideo(video);

    return this.includes([
      video.title,
      video.original_title,
      video.video_id,
      video.url,
      video.channel_name,
      video.platform,
      video.platform_video_id,
      video.official_status,
      video.video_type,
      video.link_status,
      video.notes,
      video.duplicate_group_id,
      video.duplicate_note,
      video.source_article_ids?.join(" "),
      reference?.content_preview,
      reference?.matched_texts,
      document?.content_preview,
    ]);
  }

  titleMatches(title) {
    const { state, repo } = this.ctx;
    if (state.titlePromotion && title.promotion_id !== state.titlePromotion) {
      return false;
    }
    if (state.titleDivision && title.division !== state.titleDivision) {
      return false;
    }

    return this.includes([
      title.title_id,
      title.division,
      repo.promotionName(title.promotion_id),
      ...(title.lineage ?? []).flatMap((reign) => [
        reign.fighter_name,
        reign.reign_label,
        reign.won_at_event_id,
        reign.lost_at_event_id,
        reign.source_article_id,
        reign.source_video_id,
      ]),
    ]);
  }

  mentionSearchText(mention) {
    const document = this.ctx.repo.sourceDocumentById(mention.source_id);

    return [
      mention.mention_type,
      mention.entity_type,
      mention.entity_hint,
      mention.matched_text,
      mention.context,
      mention.source_id,
      mention.source_ref_id,
      mention.confidence,
      mention.notes,
      document?.title,
      document?.url,
    ].filter(Boolean).join(" ");
  }

  mentionMatches(mention) {
    const { state } = this.ctx;
    return (!state.mentionType || mention.mention_type === state.mentionType) &&
      this.includes([this.mentionSearchText(mention)]);
  }

  sourceDocumentMatches(document) {
    return this.includes([
      document.title,
      document.url,
      document.source_type,
      document.source_ref_id,
      document.content_preview,
      document.content_text,
      document.notes,
    ]);
  }
}
