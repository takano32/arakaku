/** DataEnricher: 各エンティティの Supplementation (名鑑データやアーカイブとの合成) を担当 */
export class DataEnricher {
  constructor(repo) {
    this.repo = repo;
  }

  enrichVideo(video) {
    if (!video) return video;
    const archive = this.repo.findYoutubeArchive(video.platform_video_id);
    return {
      ...video,
      title: archive?.fulltitle ?? video.title,
      channel_name: archive?.uploader ?? video.channel_name,
      published_at: archive?.upload_date ?? video.published_at,
      archive_description: archive?.description,
      archive_metadata: archive,
    };
  }

  enrichArticle(article) {
    if (!article) return article;
    const archive = this.repo.findNoteArchive(article.url);
    return {
      ...article,
      title: archive?.title ?? article.title,
      archive_description: archive?.description,
    };
  }

  enrichFighter(fighter) {
    const match = this.repo.numbersNameMatches.find(m => m.matched_fighter_id === fighter.fighter_id || m.candidate_fighter_id === fighter.fighter_id);
    const nf = match ? this.repo.numbersFighterById(match.numbers_fighter_id) : undefined;
    if (!nf) return fighter;

    const rich = { ...fighter };
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

  enrichBout(bout) {
    const rich = { ...bout };
    const event = this.repo.findEvent(bout.event_id);
    if (!event) return rich;

    const participants = (bout.fighters ?? []).map(f => ({ ...f }));
    const fighterIds = new Set(participants.map(f => f.fighter_id).filter(Boolean));

    const records = this.repo.numbersFightRecords.filter(r => 
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

    for (const p of participants) {
      if (!p.fighter_id) continue;
      
      let r = records.find(rec => rec.matched_fighter_id === p.fighter_id || rec.candidate_fighter_id === p.fighter_id);
      if (r && r.result) {
        p.result = r.result;
        continue;
      }
      
      r = records.find(rec => rec.opponent_matched_fighter_id === p.fighter_id || rec.opponent_candidate_fighter_id === p.fighter_id);
      if (r && r.result) {
        if (r.result === "win") p.result = "loss";
        else if (r.result === "loss") p.result = "win";
        continue;
      }
    }
    rich.fighters = participants;

    const winner = participants.find(p => p.result === "win");
    const loser = participants.find(p => p.result === "loss");
    if (winner) {
      rich.winner_id = winner.fighter_id;
      rich.winner = winner.name;
    }
    if (loser) {
      rich.loser_id = loser.fighter_id;
      rich.loser = loser.name;
    }

    const recordWithMeta = records.find(r => r.detail_raw || r.division || r.bout_format);
    if (recordWithMeta) {
      if (recordWithMeta.detail_raw) {
        rich.result = { ...(rich.result ?? {}), method_raw: recordWithMeta.detail_raw };
      }
      if (recordWithMeta.division) {
        rich.division = recordWithMeta.division;
      }
      if (recordWithMeta.bout_format) {
        rich.bout_type = recordWithMeta.bout_format;
      }
      rich.result_status = "numbers_verified";
    }

    rich.numbers_records = records;
    return rich;
  }
}
