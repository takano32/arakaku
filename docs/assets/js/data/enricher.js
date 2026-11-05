import { applyFightRecords, buildFightRecordIndex, fightRecordKeyForBout, fightRecordsForBout } from "./enrich/bout.js";
import { buildNameMatchIndex, composeFighter } from "./enrich/fighter.js";
import { applyArticleArchive, applyVideoArchive, deriveVideoFilterFields } from "./enrich/media.js";
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
 * - リポジトリ全体ではなく、必要な検索だけをまとめた lookups を受け取る (EnricherLookups)。
 *   配列は関数で受け取り、索引を作るときに今のデータを読む。
 * - 信頼性の重ね順は固定: base(通信/YouTube) → official → numbers(名鑑が最優先)。
 *   reliability.js のティアと一致させること。
 * - 内部インデックスは遅延構築キャッシュ。repo データ差し替え後は DataRepository.invalidate() が
 *   reset() を呼んで破棄する。
 */

/**
 * @typedef {object} EnricherLookups
 * @property {(id: string) => object|undefined} findEvent  名鑑のみの大会も引く
 * @property {(id: string) => object|undefined} findBout  名鑑のみの試合も引く
 * @property {(id: string) => object|undefined} numbersFighterById
 * @property {(name: string) => string|undefined} promotionIdByName
 * @property {(displayId: string) => object|undefined} findYoutubeArchive
 * @property {(url: string) => object|undefined} findNoteArchive
 * @property {(videoId: string) => object[]} videoLinksForVideo
 * @property {() => object[]} numbersNameMatches
 * @property {() => object[]} numbersFightRecords
 * @property {() => object[]} officialPlayers
 * @property {() => object[]} officialTournaments
 */

export class DataEnricher {
  /** @param {EnricherLookups} lookups */
  constructor(lookups) {
    this.#lookups = lookups;
    this.reset();
  }

  #lookups;
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
    this.#nameMatchIndex ??= buildNameMatchIndex(this.#lookups.numbersNameMatches());
    return this.#nameMatchIndex;
  }

  // "promotion_id:event_number_normalized" → [records]
  get #fightRecords() {
    this.#fightRecordIndex ??= buildFightRecordIndex(this.#lookups.numbersFightRecords());
    return this.#fightRecordIndex;
  }

  // アーカイブ (youtube_archives) を重ね、関連 bout / event から絞り込み用の団体・階級を導出する
  enrichVideo(video) {
    if (!video) return video;
    const rich = applyVideoArchive(video, this.#lookups.findYoutubeArchive(video.platform_video_id));
    return deriveVideoFilterFields(rich, this.#lookups.videoLinksForVideo(video.video_id), {
      findBout: (id) => this.#lookups.findBout(id),
      findEvent: (id) => this.#lookups.findEvent(id),
    });
  }

  enrichArticle(article) {
    if (!article) return article;
    return applyArticleArchive(article, this.#lookups.findNoteArchive(article.url));
  }

  // 公式選手の名前索引 (完全一致 + 表記ゆれ)。規則は enrich/official.js
  get #officialPlayers() {
    this.#officialPlayerIndexes ??= buildOfficialPlayerIndexes(this.#lookups.officialPlayers());
    return this.#officialPlayerIndexes;
  }

  #officialPlayerByName(name) {
    return findOfficialPlayer(this.#officialPlayers, name);
  }

  // 正規化した id → officialTournament
  get #officialTournaments() {
    this.#officialTournamentIndex ??= buildOfficialTournamentIndex(this.#lookups.officialTournaments());
    return this.#officialTournamentIndex;
  }

  // 名鑑 (名前対応 → numbers_fighters) と公式 (表示名) を引き当て、重ね順の規則は enrich/fighter.js に任せる
  enrichFighter(fighter) {
    const match = this.#nameMatches.get(fighter.fighter_id);
    const nf = match ? this.#lookups.numbersFighterById(match.numbers_fighter_id) : undefined;
    const op = this.#officialPlayerByName(fighter.display_name);
    const officialPromotionId = op ? this.#lookups.promotionIdByName(op.organization) : undefined;
    return composeFighter(fighter, { nf, op, officialPromotionId });
  }

  enrichEvent(event) {
    const ot = this.#officialTournaments.get(tournamentKeyForEvent(event.event_id));
    if (!ot) return event;
    return { ...event, official_data: ot };
  }

  // 大会を引いて「団体 + 興行番号」の候補を絞り、重ね方の規則は enrich/bout.js に任せる
  enrichBout(bout) {
    const event = this.#lookups.findEvent(bout.event_id);
    if (!event) return { ...bout };
    const candidates = this.#fightRecords.get(fightRecordKeyForBout(bout, event)) ?? [];
    return applyFightRecords(bout, fightRecordsForBout(bout, candidates));
  }
}
