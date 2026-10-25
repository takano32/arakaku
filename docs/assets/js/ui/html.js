/**
 * 描画層が依存する純粋な HTML ヘルパ。状態も副作用も持たない。
 * escapeHtml は文字列を innerHTML に埋め込む際の唯一の防御線 (& を最初に置換する順序を崩さない)。
 */
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

/** 空欄を除いて連結する (既定の区切りは " / ") */
export function joinPresent(values, separator = " / ") {
  return (values ?? []).filter(Boolean).join(separator);
}

export function booleanJa(value) {
  if (value === null || value === undefined) return "";
  return value ? "あり" : "なし";
}

export function codeList(values) {
  const items = (values ?? []).filter(Boolean);
  if (items.length === 0) return "";
  return items.map((value) => `<code>${escapeHtml(value)}</code>`).join(", ");
}

export function textList(values) {
  const items = (values ?? []).filter(Boolean);
  if (items.length === 0) return "";
  return items.map((value) => escapeHtml(value)).join(", ");
}

export function externalLink(url, label, className = "") {
  // http(s) 以外 (javascript: など) はリンクにしない。データは検証済みだが多層防御として (T.106)。
  if (!url || !/^https?:\/\//i.test(String(url))) return `<code>${escapeHtml(label)}</code>`;
  const cls = className ? ` class="${escapeHtml(className)}"` : "";
  return `<a${cls} href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

// bout.result の round / time / method_raw を空欄を除いて空白連結する (例: "3R 4:21 KO")。
// 名鑑由来の method_raw (detail_raw) は「1R 1:37 KO(大外刈り)」のようにラウンドと時間を含むので、
// その場合は round / time を重ねて表示しない。
export function boutResultText(bout) {
  // 名鑑の detail_raw は「1R 1:37 KO(大外刈り)\nメジャーデビュー戦」のように改行で注記が続くので 1 行にする (T.102)。
  const method = (bout.result?.method_raw ?? "").replace(/\s*\n\s*/g, " / ");
  if (/^\d+R\b/.test(method.trim())) return method.trim();
  return [
    bout.result?.round ? `${bout.result.round}R` : "",
    bout.result?.time,
    method,
  ].filter(Boolean).join(" ");
}

// 名鑑の win_rate (0〜1 の分数文字列) をパーセント 1 桁に整形する。非数値/空は ""。
export function winRatePercent(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : "";
}

// 戦績 {fight_count,wins,losses,draws,win_rate} を「N戦 X勝Y敗Z分 (勝率 R%)」の 1 行にする。
export function recordText(r) {
  const base = joinPresent([
    r.fight_count != null ? `${r.fight_count}戦` : "",
    r.wins != null ? `${r.wins}勝` : "",
    r.losses != null ? `${r.losses}敗` : "",
    r.draws ? `${r.draws}分` : "",
  ], " ");
  const wr = winRatePercent(r.win_rate);
  return wr ? `${base} (勝率 ${wr})` : base;
}

// YYYYMMDD / YYYY-MM-DD / その他をそのまま "YYYY-MM-DD" 風に整える (アーカイブの upload_date は YYYYMMDD)
export function formatDate(value) {
  const s = String(value ?? "").trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}
