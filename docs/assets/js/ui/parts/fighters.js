import { escapeHtml, joinPresent, recordText } from "../html.js";
import { dl, grid, item, section } from "./basic.js";
import { eventLink } from "./links.js";
import { articleRefs } from "./sources.js";

/**
 * 選手プロフィールの HTML 部品 (公式 bio・戦績ブロック・出典別プロフィール)。文字列だけを返す。
 */

/**
 * 公式 bio (王座履歴・トーナメント成績など) を「／」区切りで分解してリスト表示する。
 * summary (名鑑/通信由来) に既出のセグメントは重複を避けて除外する。
 */
export function officialBio(od, summary) {
  const bio = od?.bio;
  if (!bio) return "";
  const ref = (summary ?? "").replace(/[\s／/、,]/g, "");
  const items = bio
    .split(/[／/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((item) => !ref.includes(item.replace(/[\s／/、,]/g, "")));
  if (items.length === 0) return "";
  return `<ul class="bio">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

/** 公式 + 名鑑を統合した「戦績・プロフィール」ブロック (戦績は一度だけ表示) */
export function profileBlock(f) {
  const r = f.profile?.record;
  const achievements = f.profile?.achievements ?? [];
  const entry = f.numbers_data?.achievements?.tournament_entry_raw;
  const bio = officialBio(f.official_data, f.summary);
  const chips = [
    r ? `<span class="stat">通算 ${escapeHtml(recordText(r))}</span>` : "",
    ...achievements.map((a) => `<span class="stat stat-gold">${escapeHtml(a)}</span>`),
    entry ? `<span class="stat">出場 ${escapeHtml(entry)}</span>` : "",
  ].filter(Boolean).join("");
  if (!chips && !bio) return "";
  return section("戦績・プロフィール", `${chips ? `<div class="stats">${chips}</div>` : ""}${bio}`, "sec-profile");
}

// source_id は note:<article_id> または official_news:<slug>
export function snapshotSource(repo, snapshot) {
  const [type, ref] = (snapshot.source_id ?? "").split(/:(.*)/s);
  if (type === "official_news") {
    const news = repo.officialNews.find((n) => n.slug === ref);
    return `公式ニュース「${escapeHtml(news?.title ?? ref)}」${news?.date ? `（${escapeHtml(news.date)}）` : ""}`;
  }
  return articleRefs(repo, snapshot.source_article_id);
}

/** 出典別プロフィール (fighter_snapshots) */
export function fighterSnapshots(repo, fighterId) {
  const s = repo.fighterSnapshotsForFighter(fighterId);
  if (s.length === 0) return "";
  return section("出典別プロフィール", grid(s.map((x) => item(`
      <p class="item-head small">${x.event_id ? eventLink(repo, x.event_id, repo.eventName(x.event_id)) : "大会未設定"} / ${snapshotSource(repo, x)}</p>
      ${dl([
        ["所属", escapeHtml(x.gym ?? "")],
        ["身長・年齢", escapeHtml(joinPresent([x.height, x.age]))],
        ["戦績", escapeHtml(x.record_text ?? "")],
        ["主団体", escapeHtml(repo.promotionName(x.main_promotion_id) ?? "")],
        ["肩書き", escapeHtml(x.titles_text ?? "")],
        ["キャッチコピー", escapeHtml(x.catchphrase ?? "")],
        ["snapshot_id", `<code>${escapeHtml(x.snapshot_id)}</code>`],
      ])}
    `, "item-snapshot")).join("")), "sec-snapshots");
}
