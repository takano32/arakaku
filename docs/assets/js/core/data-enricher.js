/**
 * 公式選手名と fighter の display_name を緩く突き合わせるための正規化キー。
 * 中黒・空白・ピリオドの有無や全半角差のみ異なる表記ゆれを吸収する
 * (例: 「ローリングJr」=「ローリングJr.」)。完全一致が取れなかった場合の
 * フォールバックにのみ用いる。
 */
export function normalizeFighterName(name) {
  let s = (name ?? "").normalize("NFKC");
  for (const ch of ["・", "　", " ", ".", "．"]) s = s.split(ch).join("");
  return s.toLowerCase();
}

/** DataEnricher: 各エンティティの Supplementation (名鑑データやアーカイブとの合成) を担当 */
export class DataEnricher {
  constructor(repo) {
    this.repo = repo;
    this.#nameMatchIndex = null;
    this.#fightRecordIndex = null;
    this.#officialPlayerIndex = null;
    this.#officialPlayerNormIndex = null;
    this.#officialTournamentIndex = null;
  }

  #nameMatchIndex;
  #fightRecordIndex;
  #officialPlayerIndex;
  #officialPlayerNormIndex;
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
    const rich = {
      ...video,
      title: archive?.fulltitle ?? video.title,
      channel_name: archive?.uploader ?? video.channel_name,
      published_at: archive?.upload_date ?? video.published_at,
      archive_description: archive?.description,
      archive_metadata: archive,
    };
    // 関連 bout(階級+団体)/event(団体) から絞り込み用フィールドを導出 (動画は単一値)
    for (const link of this.repo.findManyByField("videoLinks", "video_id", video.video_id)) {
      if (link.entity_type === "bout") {
        const bout = this.repo.findBout(link.entity_id);
        if (bout) {
          rich.promotion_id ??= bout.promotion_id;
          rich.division ??= bout.division;
        }
      } else if (link.entity_type === "event") {
        const event = this.repo.findEvent(link.entity_id);
        if (event) rich.promotion_id ??= event.promotion_id;
      }
    }
    return rich;
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
    this.#officialPlayerNormIndex = new Map();
    const ambiguousNorm = new Set();
    for (const p of this.repo.officialPlayers) {
      if (!p.name) continue;
      this.#officialPlayerIndex.set(p.name, p);
      const key = normalizeFighterName(p.name);
      // 同じ正規化キーに複数の公式選手がいる場合は曖昧として除外する
      if (this.#officialPlayerNormIndex.has(key) && this.#officialPlayerNormIndex.get(key).name !== p.name) {
        ambiguousNorm.add(key);
      }
      this.#officialPlayerNormIndex.set(key, p);
    }
    for (const key of ambiguousNorm) this.#officialPlayerNormIndex.delete(key);
    return this.#officialPlayerIndex;
  }

  // 完全一致を優先し、取れなければ表記ゆれを吸収した正規化キーで突き合わせる
  #officialPlayerByName(name) {
    if (!name) return undefined;
    const exact = this.#officialPlayers.get(name);
    if (exact) return exact;
    return this.#officialPlayerNormIndex.get(normalizeFighterName(name));
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
    return this.#officialPlayerByName(name);
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

  // 公式選手データを fighter に重ねる (base を上書き; 名鑑が後でさらに上書きする)
  #applyOfficialFighter(rich, op) {
    this.#applyOfficialPlayer(rich, op);
    if (op.weight_class) rich.main_division = op.weight_class;
    const promotionId = this.repo.promotionIdByName(op.organization);
    if (promotionId) rich.main_promotion_id = promotionId;
    if (op.gym) rich.profile.gym = op.gym;
    if (op.age != null && op.age !== "") rich.profile.age = op.age;
    if (op.height) rich.profile.height = /^\d+$/.test(String(op.height)) ? `${op.height}cm` : op.height;
  }

  // 名鑑データを fighter に重ねる (最優先)
  #applyNumbersFighter(rich, nf) {
    if (nf.display_name) rich.display_name = nf.display_name;
    if (nf.main_division) rich.main_division = nf.main_division;
    if (nf.main_promotion_id) rich.main_promotion_id = nf.main_promotion_id;
    rich.profile = { ...(rich.profile ?? {}) };
    if (nf.profile?.height) rich.profile.height = nf.profile.height;
    if (nf.profile?.age) rich.profile.age = nf.profile.age;
    if (nf.profile?.gym) rich.profile.gym = nf.profile.gym;
    rich.numbers_data = nf;
  }

  enrichFighter(fighter) {
    const PLACEHOLDER = "公式YouTube動画タイトルから抽出した選手。詳細未入力。";
    const match = this.#nameMatches.get(fighter.fighter_id);
    const nf = match ? this.repo.numbersFighterById(match.numbers_fighter_id) : undefined;
    const op = this.#officialPlayerByName(fighter.display_name);

    const needsClear = fighter.summary === PLACEHOLDER;
    if (!nf && !op) return needsClear ? { ...fighter, summary: "" } : fighter;

    const rich = { ...fighter };
    if (needsClear) rich.summary = "";

    // 信頼性の低い順に重ねる: base(通信/YouTube) → 公式 → 名鑑
    if (op) this.#applyOfficialFighter(rich, op);
    if (nf) this.#applyNumbersFighter(rich, nf);

    // summary は 名鑑(catchphrase/notes) > base(通信/YouTube) で決定する。
    // 公式 bio は summary に流用せず、official_data 経由でカードが専用ブロックに表示する
    // (名鑑が無い選手では bio が唯一のプロフィールになるが、それはカード側で表示される)。
    const numbersSummary = nf && (nf.catchphrase || nf.notes)
      ? [nf.catchphrase, nf.notes].filter(Boolean).join("\n\n")
      : "";
    rich.summary = numbersSummary || (needsClear ? "" : (fighter.summary || ""));

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
