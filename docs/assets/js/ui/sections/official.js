import { OFFICIAL_SITE_URL } from "../../config.js";
import { escapeHtml, joinPresent } from "../html.js";
import { mdToHtml } from "../markdown.js";

/**
 * 公式サイトから取り込んだ本文 HTML (body_html) を、このビューアで表示できる形に整える。
 * - 「/」始まりの画像・リンクは公式サイト (Astro の base 配下) を基準に絶対 URL にする。
 *   そのままだと GitHub Pages 上で 404 になる (例: /logos/logo_target.jpeg)。
 * - リンクは別タブで開く。
 * - iframe の allow に含まれる web-share はブラウザが未対応の警告を出すので外す。
 * 文面そのものは変えない。
 */
export function officialBodyHtml(html) {
  return (html ?? "")
    .replace(/\b(src|href)="\/(?!\/)([^"]*)"/g, (_, attr, path) => `${attr}="${OFFICIAL_SITE_URL}${path}"`)
    .replace(/<a\b(?![^>]*\btarget=)/g, '<a target="_blank" rel="noopener noreferrer"')
    .replace(/;?\s*web-share/g, "");
}

/**
 * 公式タブ: 公式サイトの固定ページ (about / history) とニュース。
 * 固定ページは長いので閉じた状態、ニュースは日付降順で開いた状態にする。
 */
export const officialSection = {
  id: "official",
  label: "公式",
  placeholder: "公式ページ・ニュースを検索",
  empty: "公式サイトのデータがありません。",
  build({ repo, parts, query }) {
    const pages = repo.officialPages.map((p) => ({ _kind: "page", ...p }));
    const news = [...repo.officialNews]
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .map((n) => ({ _kind: "news", ...n }));
    const items = [...pages, ...news].filter((item) =>
      query.includes(item._kind === "page"
        ? [item.title, item.description, item.slug]
        : [item.title, item.date, item.category, item.summary, item.body_md, item.slug]));
    return {
      items,
      keyOf: (item) => `${item._kind}:${item.slug}`,
      defaultOpen: (item) => item._kind === "news",
      rowClass: (item) => `rec-official rec-official-${item._kind}`,
      renderHead: (item) => item._kind === "page"
        ? `<div class="rec-text">
             <p class="rec-title">${escapeHtml(item.title)}</p>
             <p class="rec-sub">${escapeHtml(item.description ?? "")}</p>
           </div>
           <div class="rec-aside">${parts.badge("公式ページ", "official")}</div>`
        : `<div class="rec-text">
             <p class="rec-title">${escapeHtml(item.title)}</p>
             <p class="rec-sub">${escapeHtml(joinPresent([item.date, item.category]))}</p>
           </div>
           <div class="rec-aside">${parts.badge("公式ニュース", "official")}</div>`,
      renderBody: (item) => item._kind === "page"
        ? `<div class="official-doc">${officialBodyHtml(item.body_html)}</div>`
        : `<div class="official-doc md">${mdToHtml(item.body_md ?? "")}</div>`,
    };
  },
};
