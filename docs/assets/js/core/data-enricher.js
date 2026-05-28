/** DataEnricher: 各エンティティの Supplementation (名鑑データやアーカイブとの合成) を担当 */
export class DataEnricher {
  constructor(repo) {
    this.repo = repo;
    this.#nameMatchIndex = null;
    this.#fightRecordIndex = null;
    this.#officialPlayerIndex = null;
    this.#officialTournamentIndex = null;
  }

  #nameMatchIndex;
  #fightRecordIndex;
  #officialPlayerIndex;
  #officialTournamentIndex;

  // fighter_id → numbersNameMatch (matched or candidate)
  get #nameMatches() {
    if (this.#nameMatchIndex) return this.#nameMatchIndex;
    this.#nameMatchIndex = new Map();
    for (const m of this.repo.numbersNameMatches) {
      if (m.matched_fighter_id && !this.#nameMatchIndex.has(m.matched_fighter_id))
        this.#nameMatchIndex.set(m.matched_fighter_id, m);
      if (m.candidate_fighter_id && !this.#nameMatchIndex.has(m.candidate_fighter_id))
        this.#nameMatchIndex.set(m.candidate_fighter_id, m);
    }
    return this.#nameMatchIndex;
  }

  // "promotion_id:event_number_normalized" → [records]
  get #fightRecords() {
    if (this.#fightRecordIndex) return this.#fightRecordIndex;
    this.#fightRecordIndex = new Map();
    for (const r of this.repo.numbersFightRecords) {
      const key = `${r.promotion_id}:${r.event_number_normalized}`;
      const group = this.#fightRecordIndex.get(key) ?? [];
      group.push(r);
      this.#fightRecordIndex.set(key, group);
    }
    return this.#fightRecordIndex;
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

  // display_name → officialPlayer
  get #officialPlayers() {
    if (this.#officialPlayerIndex) return this.#officialPlayerIndex;
    this.#officialPlayerIndex = new Map();
    for (const p of this.repo.officialPlayers) {
      if (p.name) this.#officialPlayerIndex.set(p.name, p);
    }
    return this.#officialPlayerIndex;
  }

  // event_id → officialTournament (normalized id matching)
  get #officialTournaments() {
    if (this.#officialTournamentIndex) return this.#officialTournamentIndex;
    this.#officialTournamentIndex = new Map();
    for (const t of this.repo.officialTournaments) {
      const normalized = t.id
        .replace("maxbout-", "max-bout-")
        .replace(/-light$/, "-lightweight")
        .replace(/-middle$/, "-middleweight")
        .replace(/-heavy$/, "-heavyweight");
      this.#officialTournamentIndex.set(normalized, t);
    }
    return this.#officialTournamentIndex;
  }

  #officialPlayerFor(name) {
    return this.#officialPlayers.get(name);
  }

  #applyOfficialPlayer(rich, op) {
    rich.profile = { ...(rich.profile ?? {}) };
    if (op.nickname) rich.profile.nickname = op.nickname;
    if (op.nationality) rich.profile.nationality = op.nationality;
    if (op.name_kana) rich.profile.name_kana = op.name_kana;
    if (op.wins != null) rich.profile.wins = op.wins;
    if (op.losses != null) rich.profile.losses = op.losses;
    if (op.draws != null) rich.profile.draws = op.draws;
    if (op.bio && !rich.summary) rich.summary = op.bio;
    rich.official_data = op;
  }

  enrichFighter(fighter) {
    const match = this.#nameMatches.get(fighter.fighter_id);
    const nf = match ? this.repo.numbersFighterById(match.numbers_fighter_id) : undefined;

    const op = this.#officialPlayers.get(fighter.display_name);

    if (!nf && !op) return fighter;

    const rich = { ...fighter };

    if (nf) {
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
    }

    if (op) this.#applyOfficialPlayer(rich, op);

    return rich;
  }

  enrichEvent(event) {
    const ot = this.#officialTournaments.get(event.event_id);
    if (!ot) return event;
    return { ...event, official_data: ot };
  }
  enrichPromotion(promotion) { return promotion; }
  enrichFighterSnapshot(snapshot) {
    const fighter = this.repo.findFighter(snapshot.fighter_id);
    const op = fighter ? this.#officialPlayerFor(fighter.display_name) : undefined;
    if (!op) return snapshot;
    const rich = { ...snapshot };
    this.#applyOfficialPlayer(rich, op);
    return rich;
  }

  enrichBoutParticipant(participant) {
    const op = this.#officialPlayerFor(participant.fighter_name);
    if (!op) return participant;
    const rich = { ...participant };
    this.#applyOfficialPlayer(rich, op);
    return rich;
  }
  enrichVideoLink(link) { return link; }
  enrichArticleLink(link) { return link; }
  enrichSourceMention(mention) { return mention; }
  enrichSourceEventReference(ref) { return ref; }
  enrichSourceBoutReference(ref) { return ref; }
  enrichSourceVideoReference(ref) { return ref; }

  enrichBout(bout) {
    const rich = { ...bout };
    const event = this.repo.findEvent(bout.event_id);
    if (!event) return rich;

    const participants = (bout.fighters ?? []).map(f => ({ ...f }));
    const fighterIds = new Set(participants.map(f => f.fighter_id).filter(Boolean));

    const key = `${bout.promotion_id}:${String(event.event_number)}`;
    const candidates = this.#fightRecords.get(key) ?? [];
    const records = candidates.filter(r =>
      fighterIds.has(r.matched_fighter_id) ||
      fighterIds.has(r.candidate_fighter_id) ||
      fighterIds.has(r.opponent_matched_fighter_id) ||
      fighterIds.has(r.opponent_candidate_fighter_id)
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
