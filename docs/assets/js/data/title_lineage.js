/**
 * 王座の歴代 (lineage) の補完と表示名 (純関数)。
 *
 * 出典動画 (source_video_id) から獲得大会は導かない。王座の出典動画は防衛戦のこともあり、
 * そうした 4 王座で獲得・喪失の大会が誤っていた (T.89)。獲得大会は title_reigns.csv に明示されたものだけ。
 */

/**
 * 歴代の獲得・喪失大会を前後の代から補う。入力は変更せず、各代のコピーを返す。
 * - 前進パス: 次代の獲得大会を喪失大会に (返上して空位になった王者は、次の王者が王座決定戦で
 *   獲得しても負けていないので、end_reason が vacated の代は補わない)
 * - 後退パス: 前代の喪失大会を獲得大会に
 */
export function inferLineageEvents(lineage) {
  const reigns = (lineage ?? []).map((r) => ({ ...r }));
  for (let i = 0; i < reigns.length - 1; i++) {
    if (reigns[i].end_reason === "vacated") continue;
    if (!reigns[i].lost_at_event_id && reigns[i + 1].won_at_event_id) {
      reigns[i].lost_at_event_id = reigns[i + 1].won_at_event_id;
    }
  }
  for (let i = reigns.length - 1; i > 0; i--) {
    if (!reigns[i].won_at_event_id && reigns[i - 1].lost_at_event_id) {
      reigns[i].won_at_event_id = reigns[i - 1].lost_at_event_id;
    }
  }
  return reigns;
}

/** 歴代を補完した王座のコピーを返す。 */
export function enrichTitle(title) {
  return { ...title, lineage: inferLineageEvents(title.lineage) };
}

/**
 * 王座の表示名。promotionName は title.promotion_id を解決した団体名。
 * トーナメントは「…トーナメント」、MAXバウトは階級名のみ、それ以外は「…王座」。
 */
export function titleDisplayName(title, promotionName) {
  const d = title.division ?? "階級未設定";
  if (title.title_id?.includes("tournament")) return `${promotionName} ${d}トーナメント`;
  if (title.promotion_id === "max_bout") return `${promotionName} ${d}`;
  return `${promotionName} ${d}王座`;
}
