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
    const snapshots = this.ctx.repo.fighterSnapshots.filter(
      (snapshot) => snapshot.fighter_id === fighter.fighter_id
    );

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
}
