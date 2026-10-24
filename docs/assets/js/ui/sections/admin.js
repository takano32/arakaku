import { labels } from "../../data/labels.js";
import { TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { numbersAchievementLabels } from "../../data/enricher.js";
import { escapeHtml, externalLink, joinPresent, recordText } from "../html.js";

/**
 * 管理ビューのセクション群。出典本文・出典言及は「候補」や「本文そのもの」を確認するための
 * ビューで、名鑑 (Numbers) 系・公式 (official) 系は原データに近い形で全項目を見せる。
 * 行の左の色帯 (rec-src-numbers = 青, rec-src-official = 緑) で出所を示す。
 */

const code = (v) => (v ? `<code>${escapeHtml(v)}</code>` : "");

export const sourcesSection = {
  id: "sources",
  label: "出典本文",
  placeholder: "出典のタイトル・本文で検索",
  empty: "該当する出典がありません。",
  build({ repo, parts, state, query }) {
    const items = repo.sourceDocuments.filter((d) => query.sourceDocumentMatches(d) && itemPassesFilters(d, TAB_FILTERS.sources, state));
    return {
      items,
      keyOf: (d) => d.source_id,
      rowClass: (d) => `rec-source rec-src-${d.source_type === "note_article" ? "note" : "youtube"}`,
      renderHead: (d) => `<div class="rec-text">
          <p class="rec-title">${escapeHtml(d.title || d.source_ref_id)}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([d.published_at || "日付未入力", d.source_ref_id]))}</p>
          ${parts.badges([parts.badge(labels.sourceType(d.source_type), d.source_type === "note_article" ? "note" : ""), parts.sourceReferenceCounts(d.source_id)])}
        </div>`,
      renderBody: (d) => `
        ${d.url ? `<p class="small">${externalLink(d.url, "出典を開く")}</p>` : ""}
        <p class="pre-line small">${escapeHtml(d.content_preview || "プレビュー未入力")}</p>
        ${parts.sourceBody(d)}
        ${parts.details([
          ["source_id", code(d.source_id)],
          ["URL", d.url ? externalLink(d.url, d.url) : "未入力"],
          ["取得日時", escapeHtml(d.fetched_at ?? "")],
          ["content_hash", d.content_hash ? code(d.content_hash) : "未入力"],
          ["notes", escapeHtml(d.notes ?? "")],
        ])}
      `,
    };
  },
};

export const mentionsSection = {
  id: "mentions",
  label: "出典言及",
  placeholder: "言及テキストで検索",
  empty: "該当する言及がありません。",
  build({ repo, parts, query }) {
    const items = repo.richSourceMentions.filter((m) => query.mentionMatches(m));
    return {
      items,
      keyOf: (m) => m.mention_id,
      rowClass: () => "rec-mention",
      renderHead: (m) => `<div class="rec-text">
          <p class="rec-title">${parts.badge(labels.mentionType(m.mention_type), "soft")} ${escapeHtml(m.entity_hint || m.matched_text || m.mention_id)}</p>
          <p class="rec-sub">${parts.sourceMentionLink(m)}</p>
        </div>
        <div class="rec-aside">${parts.badge(`候補 ${m.confidence || "unknown"}`, "soft")}</div>`,
      renderBody: (m) => `
        <p class="pre-line">${escapeHtml(m.matched_text || "本文なし")}</p>
        ${parts.textFold("文脈を表示", m.context || m.matched_text || "")}
        ${parts.details([
          ["mention_id", code(m.mention_id)],
          ["source_id", code(m.source_id)],
          ["entity_type", escapeHtml(m.entity_type ?? "")],
          ["confidence", escapeHtml(m.confidence ?? "")],
          ["line_number", escapeHtml(m.line_number ?? "")],
          ["source_ref_id", escapeHtml(m.source_ref_id ?? "")],
          ["notes", escapeHtml(m.notes ?? "")],
        ])}
      `,
    };
  },
};

export const numbersFightersSection = {
  id: "numbersFighters",
  label: "名鑑選手",
  placeholder: "名鑑の選手名で検索",
  empty: "該当する名鑑選手がいません。",
  build({ repo, parts, state, query }) {
    const items = repo.numbersFighters.filter((f) =>
      itemPassesFilters(f, TAB_FILTERS.numbersFighters, state) &&
      query.includes([f.display_name, f.main_division, f.main_promotion_raw, f.main_promotion_id, f.profile?.gym, f.catchphrase, f.notes, f.numbers_fighter_id]));
    return {
      items,
      keyOf: (f) => f.numbers_fighter_id,
      rowClass: () => "rec-src-numbers",
      renderHead: (f) => {
        const record = recordText({
          fight_count: f.stats?.fight_count ?? null, wins: f.stats?.wins ?? null, losses: f.stats?.losses ?? null, draws: null, win_rate: f.stats?.win_rate ?? null,
        });
        return `<div class="rec-text">
          <p class="rec-title">${escapeHtml(f.display_name)}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([f.main_division, f.main_promotion_id, f.profile?.gym]))}</p>
          ${parts.badges([parts.badge(f.source_confidence === "numbers" ? "名鑑" : (f.source_confidence ?? ""), "numbers")])}
        </div>
        <div class="rec-aside">${record ? `<span class="result-line">${escapeHtml(record)}</span>` : ""}</div>`;
      },
      renderBody: (f) => {
        const markers = [...numbersAchievementLabels(f.achievements), f.achievements?.tournament_entry_raw ? `出場 ${f.achievements.tournament_entry_raw}` : ""].filter(Boolean);
        return `
          ${markers.length ? `<div class="stats">${markers.map((a) => `<span class="stat stat-gold">${escapeHtml(a)}</span>`).join("")}</div>` : ""}
          ${f.catchphrase ? `<p class="summary">${escapeHtml(f.catchphrase)}</p>` : ""}
          ${f.notes ? `<p class="pre-line small">${escapeHtml(f.notes)}</p>` : ""}
          ${parts.dl([
            ["所属", escapeHtml(f.profile?.gym ?? "")],
            ["身長・年齢", escapeHtml(joinPresent([f.profile?.height, f.profile?.age]))],
            ["勝率 (原値)", escapeHtml(f.stats?.win_rate ?? "")],
          ], "dl-inline")}
          ${parts.details([
            ["numbers_fighter_id", code(f.numbers_fighter_id)],
            ["団体(原文)", escapeHtml(f.main_promotion_raw ?? "")],
            ["出典", escapeHtml(joinPresent([f.source_sheet, f.source_row ? `行${f.source_row}` : ""], " / "))],
          ])}
        `;
      },
    };
  },
};

export const numbersNameMatchesSection = {
  id: "numbersNameMatches",
  label: "名前対応",
  placeholder: "名鑑名・fighter_id で検索",
  empty: "該当する対応がありません。",
  build({ repo, parts, query }) {
    const items = repo.numbersNameMatches.filter((m) =>
      query.includes([m.numbers_name, m.matched_fighter_id, m.matched_display_name, m.candidate_fighter_id, m.match_method, m.match_confidence, m.notes]));
    return {
      items,
      keyOf: (m) => m.numbers_fighter_id,
      rowClass: () => "rec-src-numbers",
      renderHead: (m) => `<div class="rec-text">
          <p class="rec-title">${escapeHtml(m.numbers_name)} <span class="muted">→</span> ${m.matched_fighter_id ? parts.fighterLink(m.matched_fighter_id, m.matched_display_name || m.matched_fighter_id) : "<span class=\"muted\">未対応</span>"}</p>
          <p class="rec-sub">${escapeHtml(m.match_method ?? "")}</p>
        </div>
        <div class="rec-aside">${parts.badge(m.match_confidence || "未対応", m.match_confidence ? "numbers" : "soft")}</div>`,
      renderBody: (m) => parts.details([
        ["numbers_fighter_id", code(m.numbers_fighter_id)],
        ["matched_fighter_id", m.matched_fighter_id ? code(m.matched_fighter_id) : "未対応"],
        ["candidate_fighter_id", code(m.candidate_fighter_id)],
        ["メモ", escapeHtml(m.notes ?? "")],
      ], "詳細", { open: true }),
    };
  },
};

export const numbersFightRecordsSection = {
  id: "numbersFightRecords",
  label: "名鑑記録",
  placeholder: "選手名・相手・決着で検索",
  empty: "該当する記録がありません。",
  build({ repo, parts, state, query }) {
    const items = repo.numbersFightRecords.filter((r) =>
      itemPassesFilters(r, TAB_FILTERS.numbersFightRecords, state) &&
      query.includes([r.fighter_name, r.opponent_name, r.division, r.promotion_raw, r.promotion_id, r.event_number_raw, r.bout_format, r.result, r.detail_raw, r.record_id]));
    const eventMeta = (r) => joinPresent([
      r.division,
      r.promotion_id,
      // MAXバウトは原文が「第5回 1回戦A」で、正規化値は回数だけなので原文を出す
      r.event_number_raw?.startsWith("第") ? r.event_number_raw : r.event_number_normalized ? `第${r.event_number_normalized}回` : "",
    ]);
    return {
      items,
      keyOf: (r) => r.record_id,
      rowClass: () => "rec-src-numbers",
      renderHead: (r) => `<div class="rec-text">
          <p class="rec-title">${escapeHtml(r.fighter_name)} <span class="vs">vs</span> ${escapeHtml(r.opponent_name || "不明")}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([eventMeta(r), r.bout_format]))}</p>
        </div>
        <div class="rec-aside">${r.result ? `<span class="result-line">${escapeHtml(joinPresent([r.result_mark, r.result], " "))}</span>` : ""}</div>`,
      renderBody: (r) => `
        ${r.detail_raw ? `<p class="pre-line">${escapeHtml(r.detail_raw)}</p>` : ""}
        ${parts.details([
          ["record_id", code(r.record_id)],
          ["numbers_fighter_id", code(r.numbers_fighter_id)],
          ["matched_fighter_id", r.matched_fighter_id ? code(r.matched_fighter_id) : "未対応"],
          ["candidate_fighter_id", code(r.candidate_fighter_id)],
          ["相手 matched_fighter_id", code(r.opponent_matched_fighter_id)],
          ["相手 candidate_fighter_id", code(r.opponent_candidate_fighter_id)],
          ["相手 numbers_fighter_id", code(r.opponent_numbers_fighter_id)],
          ["団体(原文)", escapeHtml(r.promotion_raw ?? "")],
          ["大会番号(原文)", escapeHtml(r.event_number_raw ?? "")],
          ["出典", escapeHtml(joinPresent([r.source_sheet, r.source_row ? `行${r.source_row}` : ""], " / "))],
        ], "詳細", { open: true })}
      `,
    };
  },
};

export const officialPlayersSection = {
  id: "officialPlayers",
  label: "公式選手",
  placeholder: "公式サイトの選手名で検索",
  empty: "該当する公式選手がいません。",
  build({ repo, parts, state, query }) {
    const items = repo.officialPlayers
      // organization (団体名) を promotion_id に解決して合成。TAB_FILTERS.officialPlayers の団体フィルタが ID で照合する。
      .map((p) => ({ ...p, promotion_id: repo.promotionIdByName(p.organization) }))
      .filter((p) => itemPassesFilters(p, TAB_FILTERS.officialPlayers, state) &&
        query.includes([p.name, p.name_kana, p.nickname, p.organization, p.weight_class, p.nationality, p.gym, p.bio, p.id]));
    return {
      items,
      keyOf: (p) => p.id,
      rowClass: () => "rec-src-official",
      renderHead: (p) => {
        const record = recordText({ fight_count: null, wins: p.wins ?? null, losses: p.losses ?? null, draws: p.draws ?? null, win_rate: null });
        return `<div class="rec-text">
          <p class="rec-title">${escapeHtml(p.name)}${p.nickname ? ` <span class="nick">「${escapeHtml(p.nickname)}」</span>` : ""}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([p.weight_class, p.organization, p.nationality]))}</p>
          ${parts.badges([parts.badge("公式", "official")])}
        </div>
        <div class="rec-aside">${record ? `<span class="result-line">${escapeHtml(record)}</span>` : ""}</div>`;
      },
      renderBody: (p) => `
        ${p.bio ? `<p class="summary">${escapeHtml(p.bio)}</p>` : ""}
        ${parts.details([
          ["id", code(p.id)],
          ["読み", escapeHtml(p.name_kana ?? "")],
          ["年齢", escapeHtml(p.age ?? "")],
          ["身長", escapeHtml(p.height ?? "")],
          ["デビュー", escapeHtml(p.debut ?? "")],
          ["所属", escapeHtml(p.gym ?? "")],
        ], "詳細", { open: true })}
      `,
    };
  },
};

export const officialMiscSection = {
  id: "officialMisc",
  label: "公式",
  placeholder: "トーナメント・試合・沿革で検索",
  empty: "該当する公式データがありません。",
  build({ repo, parts, query }) {
    const items = [
      ...repo.officialTournaments.map((t) => ({ _type: "tournament", _key: `t:${t.id}`, ...t })),
      ...repo.officialMatches.map((m) => ({ _type: "match", _key: `m:${m.id}`, ...m })),
      ...repo.officialHistory.map((h, i) => ({ _type: "history", _key: `h:${i}`, ...h })),
    ].filter((item) => query.includes(Object.values(item).filter((v) => typeof v === "string" || typeof v === "number")));
    return {
      items,
      keyOf: (item) => item._key,
      rowClass: () => "rec-src-official",
      renderHead: (item) => {
        if (item._type === "tournament") {
          return `<div class="rec-text">
            <p class="rec-title">${escapeHtml(item.name)}</p>
            <p class="rec-sub">${escapeHtml(joinPresent([item.date, item.champion ? `優勝: ${item.champion}` : "", item.runner_up ? `準優勝: ${item.runner_up}` : ""]))}</p>
          </div>
          <div class="rec-aside">${parts.badge("トーナメント", "official")}</div>`;
        }
        if (item._type === "match") {
          return `<div class="rec-text">
            <p class="rec-title">${escapeHtml(item.fighter1 ?? "")} <span class="vs">vs</span> ${escapeHtml(item.fighter2 ?? "")}</p>
            <p class="rec-sub">${escapeHtml(joinPresent([item.event, item.date, item.weight_class]))}</p>
          </div>
          <div class="rec-aside">${parts.badge("試合", "official")}${item.result ? `<span class="result-line">${escapeHtml(item.result)}</span>` : ""}</div>`;
        }
        return `<div class="rec-text">
          <p class="rec-title">${escapeHtml(item.title)}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([item.year, item.era, item.month ? `${item.month}月` : ""]))}</p>
        </div>
        <div class="rec-aside">${parts.badge("沿革", "official")}</div>`;
      },
      renderBody: (item) => {
        if (item._type === "tournament") {
          return parts.details([["id", code(item.id)], ["video_id", code(item.video_id)]], "詳細", { open: true }) || `<p class="muted">詳細はありません。</p>`;
        }
        if (item._type === "match") {
          return parts.details([["id", code(item.id)], ["決着", escapeHtml(item.method ?? "")], ["ラウンド", escapeHtml(item.round ?? "")], ["メモ", escapeHtml(item.notes ?? "")]], "詳細", { open: true });
        }
        return item.description ? `<p>${escapeHtml(item.description)}</p>` : `<p class="muted">説明はありません。</p>`;
      },
    };
  },
};
