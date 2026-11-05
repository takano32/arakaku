import { applyFightRecords, buildFightRecordIndex, fightRecordKeyForBout, fightRecordsForBout } from "./enrich/bout.js";
import { buildNameMatchIndex, composeFighter } from "./enrich/fighter.js";
import {
  buildOfficialPlayerIndexes,
  buildOfficialTournamentIndex,
  findOfficialPlayer,
  tournamentKeyForEvent,
} from "./enrich/official.js";

/**
 * DataEnricher — 各エンティティ (fighter/bout/event/video/article) に、別ソース由来の
 * データ (選手名鑑 numbers / 団体公式 official / YouTube・note アーカイブ) を「重ねる」合成層。
 *
 * - DataRepository が所有し、rich* ゲッターから enrich*() を呼ぶ。出力は元オブジェクトのコピー (非破壊)。
 * - 信頼性の重ね順は固定: base(通信/YouTube) → official → numbers(名鑑が最優先)。
 *   reliability.js のティアと一致させること。
 * - 内部インデックスは遅延構築キャッシュ。repo データ差し替え後は DataRepository.invalidate() が
 *   reset() を呼んで破棄する。
 */

export class DataEnricher {
  constructor(repo) {
    this.repo = repo;
    this.reset();
  }

  #nameMatchIndex;
  #fightRecordIndex;
  #officialPlayerIndexes;
  #officialTournamentIndex;

  // repo データ更新後にキャッシュ済みインデックスを破棄して再計算させる
  reset() {
    this.#nameMatchIndex = null;
    this.#fightRecordIndex = null;
    this.#officialPlayerIndexes = null;
    this.#officialTournamentIndex = null;
  }

  // fighter_id → numbersNameMatch (matched or candidate)
  get #nameMatches() {
    this.#nameMatchIndex ??= buildNameMatchIndex(this.repo.numbersNameMatches);
    return this.#nameMatchIndex;
  }

  // "promotion_id:event_number_normalized" → [records]
  get #fightRecords() {
    this.#fightRecordIndex ??= buildFightRecordIndex(this.repo.numbersFightRecords);
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

  // 公式選手の名前索引 (完全一致 + 表記ゆれ)。規則は enrich/official.js
  get #officialPlayers() {
    this.#officialPlayerIndexes ??= buildOfficialPlayerIndexes(this.repo.officialPlayers);
    return this.#officialPlayerIndexes;
  }

  #officialPlayerByName(name) {
    return findOfficialPlayer(this.#officialPlayers, name);
  }

  // 正規化した id → officialTournament
  get #officialTournaments() {
    this.#officialTournamentIndex ??= buildOfficialTournamentIndex(this.repo.officialTournaments);
    return this.#officialTournamentIndex;
  }

  // 名鑑 (名前対応 → numbers_fighters) と公式 (表示名) を引き当て、重ね順の規則は enrich/fighter.js に任せる
  enrichFighter(fighter) {
    const match = this.#nameMatches.get(fighter.fighter_id);
    const nf = match ? this.repo.numbersFighterById(match.numbers_fighter_id) : undefined;
    const op = this.#officialPlayerByName(fighter.display_name);
    const officialPromotionId = op ? this.repo.promotionIdByName(op.organization) : undefined;
    return composeFighter(fighter, { nf, op, officialPromotionId });
  }

  enrichEvent(event) {
    const ot = this.#officialTournaments.get(tournamentKeyForEvent(event.event_id));
    if (!ot) return event;
    return { ...event, official_data: ot };
  }

  // 大会を引いて「団体 + 興行番号」の候補を絞り、重ね方の規則は enrich/bout.js に任せる
  enrichBout(bout) {
    const event = this.repo.findEvent(bout.event_id);
    if (!event) return { ...bout };
    const candidates = this.#fightRecords.get(fightRecordKeyForBout(bout, event)) ?? [];
    return applyFightRecords(bout, fightRecordsForBout(bout, candidates));
  }
}
