const mdToHtmlCache = new Map();

export function mdToHtml(md) {
  if (mdToHtmlCache.has(md)) return mdToHtmlCache.get(md);
  const html = mdToHtmlCompile(md);
  mdToHtmlCache.set(md, html);
  return html;
}

function mdToHtmlCompile(md) {
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
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/  \n/g, "<br>");

  s = s.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`);

  s = s.split(/\n\n+/).map(p => {
    p = p.trim();
    if (!p || /^<(h[1-6]|ul|table)/.test(p)) return p;
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");

  return s;
}
