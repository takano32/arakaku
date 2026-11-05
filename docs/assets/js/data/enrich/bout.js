/**
 * 試合に名鑑 (Numbers) の個人成績 (numbers_fight_records) を重ねる規則 (純関数)。
 * 突き合わせの軸は event ではなく「団体 + 興行番号」(fightRecordKey)。Numbers の興行番号が
 * 整数でない大会 (MAXバウトの SP / SP2) は events.csv の numbers_event_number を使う。
 */

function fightRecordKey(promotionId, eventNumber) {
  return `${promotionId}:${eventNumber}`;
}

/** "promotion_id:event_number_normalized" → [records] */
export function buildFightRecordIndex(records) {
  const index = new Map();
  for (const r of records ?? []) {
    const key = fightRecordKey(r.promotion_id, r.event_number_normalized);
    const group = index.get(key) ?? [];
    group.push(r);
    index.set(key, group);
  }
  return index;
}

/** 試合とその大会から、個人成績を引くキーを作る。 */
export function fightRecordKeyForBout(bout, event) {
  return fightRecordKey(bout.promotion_id, String(event.numbers_event_number || event.event_number));
}

/**
 * 候補の記録のうち、選手と対戦相手の両方が試合の 2 選手に一致するものだけを返す。
 * トーナメント (MAXバウト) は 1 大会に同じ選手の試合が複数あるため、片方の一致だけでは別の回戦の結果を拾ってしまう。
 */
export function fightRecordsForBout(bout, candidates) {
  const fighterIds = new Set((bout.fighters ?? []).map(f => f.fighter_id).filter(Boolean));
  return candidates.filter(r => {
    const fighter = r.matched_fighter_id || r.candidate_fighter_id;
    const opponent = r.opponent_matched_fighter_id || r.opponent_candidate_fighter_id;
    return fighterIds.size === 2 && fighterIds.has(fighter) && fighterIds.has(opponent);
  });
}

/**
 * 名鑑の記録を試合に重ねた浅いコピーを返す (records が空ならコピーのみ)。
 * 勝敗は両選手ぶんの記録が矛盾しない (勝ち 1・負け 1) ときだけ上書きし、決まり手・階級・形式は記録から補う。
 */
export function applyFightRecords(bout, records) {
  const rich = { ...bout };
  if (records.length === 0) return rich;

  const participants = (bout.fighters ?? []).map(f => ({ ...f }));

  // Numbers の 2 行が矛盾する (両者勝ち・両者負け) 試合は勝敗を上書きしない。CSV には note の勝者を
  // 入れてあり (T.40.4・T.86.6)、上書きすると「A def. A」や両者勝ちの表示になる (T.89)。
  const numbersResults = participants.map((p) => {
    if (!p.fighter_id) return p.result;
    const own = records.find(rec => rec.matched_fighter_id === p.fighter_id || rec.candidate_fighter_id === p.fighter_id);
    if (own?.result) return own.result;
    const other = records.find(rec => rec.opponent_matched_fighter_id === p.fighter_id || rec.opponent_candidate_fighter_id === p.fighter_id);
    if (other?.result === "win") return "loss";
    if (other?.result === "loss") return "win";
    return p.result;
  });
  const consistent = [...numbersResults].sort().join() === "loss,win";

  for (const p of consistent ? participants : []) {
    if (!p.fighter_id) continue;

    let r = records.find(rec => rec.matched_fighter_id === p.fighter_id || rec.candidate_fighter_id === p.fighter_id);
    if (r && r.result) {
      p.result = r.result;
      continue;
    }

    // 名鑑レコードは「対戦相手側」の行としても当該選手を含みうる。その場合 result は
    // 相手視点なので win/loss を反転して当該選手の結果に直す。
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
    if (consistent) rich.result_status = "numbers_verified";
  }

  rich.numbers_records = records;
  return rich;
}
