// 公式ニュース本文 (body_md) を表示するための最小限の自前 Markdown→HTML 変換。外部依存を
// 持たず正規表現置換のみ。対応: 見出し / 太字 / リンク / 箇条書き / テーブル / 改行 / 段落 / 1 行だけの <iframe>。
// ui/sections/official.js が mdToHtml を呼び、.official-doc に埋め込む。
// 入力先頭で & < > をエスケープしてから置換するのが XSS 防御の前提。リンクは生成側で target/rel を
// 付与する。md→html は同一入力で安定するため Map でメモ化 (再描画で同じ本文が何度も変換されるのを
// 避ける)。対応構文を増やす場合はエスケープ順序を壊さないこと。
const mdToHtmlCache = new Map();

// 本文にそのまま埋め込んでよい iframe のホスト (公式サイトがチケット予約ウィジェットに使っている)。
const EMBED_HOSTS = new Set(["tiget.net"]);
const IFRAME_LINE = /^<iframe\b([^>]*)><\/iframe>[ \t]*$/gm;

function iframeAttr(attrs, name) {
  return attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? "";
}

function escapeAttr(v) {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 元のタグは使わず、許可ホストの https URL と数字の幅・高さだけから組み立て直す。それ以外はリンクにする。
function iframeHtml(attrs) {
  let url;
  try { url = new URL(iframeAttr(attrs, "src")); } catch { return null; }
  if (url.protocol !== "https:") return null;
  const href = escapeAttr(url.href);
  const link = `<a href="${href}" target="_blank" rel="noopener">${escapeAttr(url.host)} を開く</a>`;
  if (!EMBED_HOSTS.has(url.hostname)) return link;
  const size = (name) => (/^\d{1,4}$/.test(iframeAttr(attrs, name)) ? `${name}:${iframeAttr(attrs, name)}px;` : "");
  return `<iframe class="md-embed" src="${href}" style="${size("width")}${size("height")}" loading="lazy" title="${escapeAttr(url.host)}"></iframe><br>${link}`;
}

export function mdToHtml(md) {
  if (mdToHtmlCache.has(md)) return mdToHtmlCache.get(md);
  const html = mdToHtmlCompile(md);
  mdToHtmlCache.set(md, html);
  return html;
}

function mdToHtmlCompile(md) {
  // <iframe> 行はエスケープ前に退避し、最後に組み立て直した HTML へ差し替える。
  const embeds = [];
  md = md.replace(IFRAME_LINE, (line, attrs) => {
    const html = iframeHtml(attrs);
    if (html === null) return line;
    embeds.push(html);
    return `\u0000EMBED${embeds.length - 1}\u0000`;
  });

  let s = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // tables: consecutive lines starting with |
  s = s.replace(/((?:^\|.+\n?)+)/gm, (block) => {
    const lines = block.trim().split("\n").filter(l => !/^\s*\|[-| :]+\|\s*$/.test(l));
    return "<table>" + lines.map(l => "<tr>" +
      l.replace(/^\||\|$/g, "").split("|").map(c => `<td>${c.trim()}</td>`).join("") +
    "</tr>").join("") + "</table>\n";
  });

  s = s
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm,  "<h2>$1</h2>")
    .replace(/^# (.+)$/gm,   "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // http(s) 以外 (javascript: など) は文字のまま残す。" は & < > と違い先頭でエスケープしていないのでここで消す。
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, href) =>
      /^https?:\/\//i.test(href) ? `<a href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener">${text}</a>` : m)
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/  \n/g, "<br>");

  // 末尾の改行は ul の外に戻す (飲み込むと直後の空行が段落区切りとして効かない)。
  s = s.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m.replace(/\n$/, "")}</ul>\n`);

  s = s.split(/\n\n+/).map(p => {
    p = p.trim();
    if (!p || /^<(h[1-6]|ul|table)/.test(p)) return p;
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");

  return s.replace(/\u0000EMBED(\d+)\u0000/g, (_, i) => embeds[Number(i)]);
}
