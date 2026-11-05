import { numbersAchievementLabels } from "../labels.js";

/**
 * 選手の補完規則 (純関数)。DataEnricher が名鑑 (nf = numbers_fighters の行) と公式 (op = official_players
 * の行) の突合結果を渡し、信頼性の低い順 base(通信/YouTube) → 公式 → 名鑑 に重ねて 1 人分の rich fighter を作る。
 * reliability.js のティアと一致させること。
 */

// 公式 YouTube 動画から機械的に作った選手の仮の要約。補完の有無に関わらず表示しない。
const PLACEHOLDER_SUMMARY = "公式YouTube動画タイトルから抽出した選手。詳細未入力。";

/** fighter_id → 名鑑の名前対応 (matched でも candidate でも引ける。同じ ID は最初の対応を使う)。 */
export function buildNameMatchIndex(numbersNameMatches) {
  const index = new Map();
  for (const m of numbersNameMatches ?? []) {
    if (m.matched_fighter_id && !index.has(m.matched_fighter_id)) index.set(m.matched_fighter_id, m);
    if (m.candidate_fighter_id && !index.has(m.candidate_fighter_id)) index.set(m.candidate_fighter_id, m);
  }
  return index;
}

// 公式・名鑑の戦績を 1 つに統合する。両者は通常一致するので勝敗は一度だけ持つ
// (名鑑優先・無ければ公式)。各ソース固有の数値 (名鑑: fight_count/win_rate, 公式: draws)
// は取りこぼさず合算する。どちらの戦績も無ければ null。
export function mergeRecord(op, nf) {
  const ns = nf?.stats ?? {};
  const wins = ns.wins ?? op?.wins ?? null;
  const losses = ns.losses ?? op?.losses ?? null;
  if (wins == null && losses == null && ns.fight_count == null) return null;
  return {
    fight_count: ns.fight_count ?? null, // 名鑑のみ
    wins,
    losses,
    draws: op?.draws ?? null,            // 公式のみ
    win_rate: ns.win_rate ?? null,       // 名鑑のみ
  };
}

function applyOfficialPlayer(rich, op) {
  rich.profile = { ...(rich.profile ?? {}) };
  if (op.nickname) rich.profile.nickname = op.nickname;
  if (op.nationality) rich.profile.nationality = op.nationality;
  if (op.name_kana) rich.profile.name_kana = op.name_kana;
  // 戦績 (wins/losses/draws) は mergeRecord で名鑑と統合し profile.record に集約するため、ここでは profile に展開しない。
  // 公式の bio は official_data 経由でカードの専用ブロックに出す。summary には流用しない (summary はあとで
  // 名鑑か base から決め直すので、以前ここで bio を入れていた行は効いていなかった。T112.4.18)。
  rich.official_data = op;
}

// 公式選手データを fighter に重ねる (base を上書き; 名鑑が後でさらに上書きする)
function applyOfficialFighter(rich, op, promotionId) {
  applyOfficialPlayer(rich, op);
  if (op.weight_class) rich.main_division = op.weight_class;
  if (promotionId) rich.main_promotion_id = promotionId;
  if (op.gym) rich.profile.gym = op.gym;
  if (op.age != null && op.age !== "") rich.profile.age = op.age;
  if (op.height) rich.profile.height = /^\d+$/.test(String(op.height)) ? `${op.height}cm` : op.height;
}

// 名鑑データを fighter に重ねる (最優先)
function applyNumbersFighter(rich, nf) {
  if (nf.display_name) rich.display_name = nf.display_name;
  if (nf.main_division) rich.main_division = nf.main_division;
  if (nf.main_promotion_id) rich.main_promotion_id = nf.main_promotion_id;
  rich.profile = { ...(rich.profile ?? {}) };
  if (nf.profile?.height) rich.profile.height = nf.profile.height;
  if (nf.profile?.age) rich.profile.age = nf.profile.age;
  if (nf.profile?.gym) rich.profile.gym = nf.profile.gym;
  rich.numbers_data = nf;
}

/**
 * 名鑑・公式を重ねた選手を返す。どちらも無く、仮の要約も無ければ入力のオブジェクトをそのまま返す (コピーしない)。
 * @param {object} fighter        fighters.json の行 (または発掘した合成行)
 * @param {{ nf?: object, op?: object, officialPromotionId?: string }} sources
 *        officialPromotionId は op.organization (団体名) を promotion_id に解決したもの
 */
export function composeFighter(fighter, { nf, op, officialPromotionId } = {}) {
  const needsClear = fighter.summary === PLACEHOLDER_SUMMARY;
  if (!nf && !op) return needsClear ? { ...fighter, summary: "" } : fighter;

  const rich = { ...fighter };
  if (needsClear) rich.summary = "";

  // 信頼性の低い順に重ねる: base(通信/YouTube) → 公式 → 名鑑
  if (op) applyOfficialFighter(rich, op, officialPromotionId);
  if (nf) applyNumbersFighter(rich, nf);

  // summary は 名鑑(catchphrase/notes) > base(通信/YouTube) で決定する。
  // 公式 bio は summary に流用せず、official_data 経由でカードが専用ブロックに表示する。
  const numbersSummary = nf && (nf.catchphrase || nf.notes)
    ? [nf.catchphrase, nf.notes].filter(Boolean).join("\n\n")
    : "";
  rich.summary = numbersSummary || (needsClear ? "" : (fighter.summary || ""));

  // 公式(戦績/bio/国籍) と 名鑑(通算数/勝率/実績) を 1 つの戦績プロフィールに統合する。
  rich.profile = { ...(rich.profile ?? {}) };
  const record = mergeRecord(op, nf);
  if (record) rich.profile.record = record;
  const achievements = numbersAchievementLabels(nf?.achievements);
  if (achievements.length) rich.profile.achievements = achievements;

  return rich;
}
