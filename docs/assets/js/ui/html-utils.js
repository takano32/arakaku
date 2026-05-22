export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), "ja")
  );
}

export function renderValue(value) {
  if (value === null || value === undefined || value === "") {
    return "未入力";
  }
  return escapeHtml(value);
}

export function renderIdList(values) {
  const items = (values ?? []).filter(Boolean);
  if (items.length === 0) {
    return "未入力";
  }
  return items.map((value) => `<code>${escapeHtml(value)}</code>`).join(", ");
}

export function renderTextList(values) {
  const items = (values ?? []).filter(Boolean);
  if (items.length === 0) {
    return "未入力";
  }
  return items.map((value) => escapeHtml(value)).join(", ");
}

export function externalLink(url, label) {
  if (!url) {
    return `<code>${escapeHtml(label)}</code>`;
  }

  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

export function emptyMessage() {
  return `<article class="card"><p>該当するデータがありません。</p></article>`;
}
