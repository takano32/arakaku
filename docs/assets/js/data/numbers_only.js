/**
 * Numbers の個人成績にだけある大会と試合 (events.csv に「団体 + 興行番号」が無いもの) を合成する (純関数)。
 * CSV には足さず、表示用に重ねるだけ。合成行は numbers_only を持つ。
 * events.csv の大会とは「団体 + 興行番号」(numbers_event_number があればそれ) で照合する。
 * 興行番号が数字でない記録で、どの大会とも対応しないものは除く。
 * 個人成績は 1 試合を両選手の側から 2 行持つので、選手の組で 1 試合にまとめる。
 */

const FLIP = { win: "loss", loss: "win" };

/**
 * @param {{ events: object[], fightRecords: object[], promotionName: (id: string) => string }} input
 *   events: events.json の生配列、fightRecords: numbers_fight_records.json、
 *   promotionName: 同じ団体に「…No.N」大会が 1 つも無いときの大会名に使う団体名の解決
 * @returns {{ events: object[], bouts: object[], eventById: Map, boutById: Map }}
 */
export function buildNumbersOnly({ events: rawEvents, fightRecords, promotionName }) {
  const known = new Set(rawEvents.map(e => `${e.promotion_id}:${e.numbers_event_number || e.event_number}`));
  // 大会名は同じ団体の既存の「…No.N」大会名の番号を差し替えて作る
  const sampleNames = new Map();
  for (const e of rawEvents) {
    if (/No\.\d+$/.test(e.name ?? "") && !sampleNames.has(e.promotion_id)) sampleNames.set(e.promotion_id, e.name);
  }
  const events = new Map();
  const bouts = new Map();
  for (const r of fightRecords) {
    const num = r.event_number_normalized;
    if (!/^\d+$/.test(num ?? "") || known.has(`${r.promotion_id}:${num}`)) continue;
    const eventId = `numbers-${r.promotion_id}-${num}`;
    if (!events.has(eventId)) {
      const sample = sampleNames.get(r.promotion_id);
      events.set(eventId, {
        event_id: eventId,
        name: sample ? sample.replace(/No\.\d+$/, `No.${num}`) : `${promotionName(r.promotion_id)}No.${num}`,
        promotion_id: r.promotion_id,
        event_number: Number(num),
        event_type: "numbered_event",
        summary: "名鑑（Numbers）の個人成績にだけ記録がある大会。動画・note は未確認。",
        numbers_only: true,
      });
    }
    const fighterId = r.matched_fighter_id || r.candidate_fighter_id || null;
    const opponentId = r.opponent_matched_fighter_id || r.opponent_candidate_fighter_id || null;
    const pairKey = `${eventId}:${[fighterId || r.fighter_name, opponentId || r.opponent_name].sort().join("|")}`;
    if (bouts.has(pairKey)) {
      // 相手側の行。両側の勝敗が食い違う (両者勝ち・両者負け) なら、どちらかに決めず不明にする (T.89)。
      const bout = bouts.get(pairKey);
      bout.numbers_records.push(r);
      const own = bout.fighters.find(f => (fighterId && f.fighter_id === fighterId) || f.name === r.fighter_name);
      if (own && r.result && own.result !== "unknown" && own.result !== r.result) {
        for (const f of bout.fighters) f.result = "unknown";
        Object.assign(bout, { winner_id: null, winner: null, loser_id: null, loser: null, result_status: "unknown" });
        bout.notes = "名鑑（Numbers）の個人成績にだけある試合。両側の記録の勝敗が食い違うため不明。";
      }
      continue;
    }
    const fighters = [
      { fighter_id: fighterId, name: r.fighter_name, side: null, corner: null, result: r.result || "unknown" },
      { fighter_id: opponentId, name: r.opponent_name, side: null, corner: null, result: FLIP[r.result] ?? "unknown" },
    ];
    const winner = fighters.find(f => f.result === "win");
    const loser = fighters.find(f => f.result === "loss");
    bouts.set(pairKey, {
      // ID は 2 人の組から作る (Numbers の記録の並びが変わっても共有リンクがずれない)。試合順は
      // Numbers に無いので持たない (以前は記録の並びを「第N試合」と表示していた。T.90)。
      bout_id: `${eventId}--${[fighterId || r.fighter_name, opponentId || r.opponent_name].sort().join("--")}`,
      event_id: eventId,
      promotion_id: r.promotion_id,
      bout_order: null,
      matchup: `${r.fighter_name} vs ${r.opponent_name}`,
      division: r.division || null,
      bout_type: null,
      fighters,
      winner_id: winner?.fighter_id ?? null,
      winner: winner?.name ?? null,
      loser_id: loser?.fighter_id ?? null,
      loser: loser?.name ?? null,
      result_status: winner ? "numbers_verified" : "unknown",
      result: { method_raw: r.detail_raw || "" },
      numbers_records: [r],
      notes: "名鑑（Numbers）の個人成績にだけある試合。",
      numbers_only: true,
    });
  }
  const byNumber = (a, b) => a.promotion_id.localeCompare(b.promotion_id, "ja") || a.event_number - b.event_number;
  const eventList = [...events.values()].sort(byNumber);
  // 大会 (団体・興行番号) → 対戦の名前の順に並べる。記録の並びのままだと試合タブで大会が混ざる (T.90)。
  const eventOrder = new Map(eventList.map((e, i) => [e.event_id, i]));
  const boutList = [...bouts.values()].sort((a, b) =>
    (eventOrder.get(a.event_id) ?? 0) - (eventOrder.get(b.event_id) ?? 0) || a.matchup.localeCompare(b.matchup, "ja"));
  return {
    events: eventList,
    bouts: boutList,
    eventById: new Map(eventList.map(e => [e.event_id, e])),
    boutById: new Map(boutList.map(b => [b.bout_id, b])),
  };
}
