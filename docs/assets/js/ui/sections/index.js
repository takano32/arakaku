import { officialSection } from "./official.js";
import { tsushinSection } from "./tsushin.js";
import { boutsSection } from "./bouts.js";
import { fightersSection } from "./fighters.js";
import { eventsSection } from "./events.js";
import { promotionsSection } from "./promotions.js";
import { titlesSection } from "./titles.js";
import { videosSection } from "./videos.js";
import { sourcesSection } from "./sources.js";
import { mentionsSection } from "./mentions.js";
import { numbersFightersSection } from "./numbers_fighters.js";
import { numbersNameMatchesSection } from "./numbers_name_matches.js";
import { numbersFightRecordsSection } from "./numbers_fight_records.js";
import { officialPlayersSection } from "./official_players.js";
import { officialMiscSection } from "./official_misc.js";

/**
 * タブ ID → セクション定義。各セクションは
 *   { id, label, placeholder (検索欄の文言), empty (0 件のときの文言), build(ctx) }
 * を持ち、build(ctx) は RecordList の descriptor
 *   { items, keyOf, renderHead, renderBody, defaultOpen?, rowClass?, isHeader? }
 * を返す。ctx は { state, repo, query }。HTML 部品は ui/parts/*.js を直接 import する。
 * キーは config.js の PUBLIC_TABS / ADMIN_TABS の ID と完全一致させること。
 */
export const SECTIONS = Object.fromEntries([
  officialSection,
  tsushinSection,
  boutsSection,
  fightersSection,
  eventsSection,
  promotionsSection,
  titlesSection,
  videosSection,
  sourcesSection,
  mentionsSection,
  numbersFightersSection,
  numbersNameMatchesSection,
  numbersFightRecordsSection,
  officialPlayersSection,
  officialMiscSection,
].map((section) => [section.id, section]));
