/** @typedef {import("./core/app-state.js").AppState} AppState */

/**
 * 役割: viewer 全体の静的な設定値 (データファイルのパス一覧、タブ定義、
 *   ロードフェーズ別のキー集合) を定義する単一の真実源。
 * アーキ上の位置: data-loader.js / view-controller.js / keyboard-nav.js /
 *   event-controller.js / app-state.js / tab-registry.js / url-sync.js から import される
 *   葉モジュール (このファイル自身は他の viewer モジュールを import しない)。
 * 不変条件:
 *   - DATA_FILES のキーは docs/data/*.json の生成物と 1:1 で対応する。新しい JSON を
 *     増やしたら必ずここへ追加すること (data-loader はこのキー集合しか fetch しない)。
 *   - DATA_FILES のキーは aliases/metadata を除き配列 JSON を指す (data-parser.js の
 *     OBJECT_DATA_KEYS と同期が必要。ストリーミングは配列前提)。
 *   - PUBLIC_TABS の順序はキーボードショートカット 1..8 に直結する (keyboard-nav.js)。
 *   - INITIAL/PRIMARY/ENRICHMENT のキーは全て DATA_FILES に存在する文字列であること。
 * 関連スキル: .agents/skills/arakaku-viewer-ui
 */
export const DATA_FILES = {
  metadata: "./data/metadata.json",
  articles: "./data/articles.json",
  articleLinks: "./data/article_links.json",
  promotions: "./data/promotions.json",
  events: "./data/events.json",
  bouts: "./data/bouts.json",
  boutParticipants: "./data/bout_participants.json",
  fighters: "./data/fighters.json",
  titles: "./data/titles.json",
  titleReigns: "./data/title_reigns.json",
  videos: "./data/videos.json",
  videoLinks: "./data/video_links.json",
  fighterSnapshots: "./data/fighter_snapshots.json",
  aliases: "./data/aliases.json",
  sourceDocuments: "./data/source_documents.json",
  sourceDocumentBodies: "./data/source_document_bodies.json",
  sourceMentions: "./data/source_mentions.json",
  numbersFighters: "./data/numbers_fighters.json",
  numbersNameMatches: "./data/numbers_name_matches.json",
  numbersFightRecords: "./data/numbers_fight_records.json",
  youtubeArchives: "./data/youtube_archives.json",
  noteArchives: "./data/note_archives.json",
  sourceEventReferences: "./data/source_event_references.json",
  sourceBoutReferences: "./data/source_bout_references.json",
  sourceVideoReferences: "./data/source_video_references.json",
  officialPlayers: "./data/official_players.json",
  officialTournaments: "./data/official_tournaments.json",
  officialMatches: "./data/official_matches.json",
  officialHistory: "./data/official_history.json",
  officialPages: "./data/official_pages.json",
  officialNews: "./data/official_news.json",
};

// 公開ビューのタブ [id, ラベル]。表示順 = キーボードショートカット 1..8 の割り当て順
// (keyboard-nav.js が PUBLIC_TABS[num-1] で参照するため、並べ替えはショートカット変更を意味する)。
export const PUBLIC_TABS = [
  ["official", "公式"],
  ["tsushin", "通信"],
  ["bouts", "試合"],
  ["fighters", "選手"],
  ["events", "大会"],
  ["promotions", "団体"],
  ["titles", "王座"],
  ["videos", "動画"],
];

// 管理ビュー (viewMode === "admin") でのみ表示されるタブ。view-controller.js が
// viewMode に応じて PUBLIC_TABS / ADMIN_TABS を出し分ける。
export const ADMIN_TABS = [
  ["sources", "出典本文"],
  ["mentions", "出典言及"],
  ["numbersFighters", "名鑑選手"],
  ["numbersNameMatches", "名前対応"],
  ["numbersFightRecords", "名鑑記録"],
  ["officialPlayers", "公式選手"],
  ["officialMisc", "公式"],
];

// 「出典言及」タブで言及タイプを並べる順序。view-controller.js が indexOf でソートキーに使う。
export const MENTION_TYPE_ORDER = ["event", "matchup", "result", "note_url", "youtube_url"];

export const DEFAULT_TAB = "official";
export const DEFAULT_ADMIN_TAB = "sources";

// 初期タブ (公式) の表示に必要なデータ。初期画面を最速で描画するため、
// PRIMARY より先に Phase 0 で単独ロードする (合計 ~16KB)。
export const INITIAL_TAB_DATA_KEYS = ["officialPages", "officialNews"];

// ストリーミングでインクリメンタルに描画するファイル群 (表示に直結するもの)
// NOTE: aliases / titleReigns は viewer から参照されないため除外している。
// aliases は object 形式で、配列 SAX ストリームに通すと [] に誤パースされる
// (選手の別名は fighters.json の各レコードに焼き込み済み)。titleReigns の系譜は
// titles.json の lineage に焼き込み済み。再度必要になったら DATA_FILES から読める。
export const PRIMARY_DATA_KEYS = [
  "bouts", "boutParticipants", "fighters", "events", "promotions",
  "videos", "titles", "videoLinks",
  "fighterSnapshots", "articles", "articleLinks",
];

// PRIMARY の後にロードしてエンリッチに使うファイル群。
// 公開タブが実際に参照するキーのみ eager にする。
// - metadata: viewer から未参照（object を配列 SAX に通すと [] に誤パースされる既存バグ）
//   なので除外。aliases / titleReigns と同じ理由。
// - sourceMentions: 管理用「出典言及」タブ専用（~1MB）。TAB_DATA_KEYS / REQUIRED_TAB_DATA_KEYS
//   経由でタブを開いたときに遅延ロードする。
// - officialMatches / officialHistory: 管理用「公式」タブ専用だが小さいため eager のまま残す。
export const ENRICHMENT_DATA_KEYS = [
  "numbersFighters", "numbersNameMatches", "numbersFightRecords",
  "youtubeArchives", "noteArchives",
  "sourceDocuments",
  "officialPlayers",
  "officialTournaments",
  "officialMatches",
  "officialHistory",
];
