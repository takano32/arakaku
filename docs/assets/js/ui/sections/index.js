import { officialSection } from "./official.js";
import { tsushinSection } from "./tsushin.js";
import { boutsSection } from "./bouts.js";
import { fightersSection } from "./fighters.js";
import { eventsSection } from "./events.js";
import { promotionsSection } from "./promotions.js";
import { titlesSection } from "./titles.js";
import { videosSection } from "./videos.js";
import {
  mentionsSection,
  numbersFightRecordsSection,
  numbersFightersSection,
  numbersNameMatchesSection,
  officialMiscSection,
  officialPlayersSection,
  sourcesSection,
} from "./admin.js";

/**
 * タブ ID → セクション定義。各セクションは
 *   { id, label, placeholder (検索欄の文言), empty (0 件のときの文言), build(ctx) }
 * を持ち、build(ctx) は RecordList の descriptor
 *   { items, keyOf, renderHead, renderBody, defaultOpen?, rowClass?, isHeader? }
 * を返す。ctx は { state, repo, query, parts }。
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
