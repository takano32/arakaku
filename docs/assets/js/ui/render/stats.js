import { escapeHtml } from "../html.js";
import { SECTIONS } from "../sections/index.js";

/**
 * サイドバーの件数 (#stats)。HTML を作る関数は純粋で、StatsRenderer が DOM に当てる。
 */

// 件数の計算規則:
// - 試合・動画は enrich で増減しないので生配列長 (名鑑のみの試合は個人成績ロード後に加算)。
// - 選手は名鑑/公式由来の発掘と重複統合で件数が変わるため、関係キーが揃ってから richFighters を数える。
// - 未ロードのものは "…"。
// 戻り値は [ラベル, 件数, 押したときに開くタブ] の配列。出典候補だけの一覧は無く、出典本文の各行に候補件数が出るので出典本文へ。
export function dataCounts(state, repo) {
  const d = state.data;
  const loaded = state.loadedDataKeys;
  const fightersFinal = ["fighters", "numbersFighters", "numbersNameMatches", "officialPlayers"].every((k) => loaded.has(k));
  const numbersOnlyLoaded = loaded.has("numbersFightRecords");
  const refsLoaded = ["sourceEventReferences", "sourceBoutReferences", "sourceVideoReferences"].every((k) => loaded.has(k));
  return [
    ["団体", d.promotions.length, "promotions"],
    ["大会", d.events.length + (numbersOnlyLoaded ? repo.numbersOnlyEvents.length : 0), "events"],
    ["試合", d.bouts.length + (numbersOnlyLoaded ? repo.numbersOnlyBouts.length : 0), "bouts"],
    ["選手", fightersFinal ? repo.richFighters.length : d.fighters.length, "fighters"],
    ["王座", d.titles.length, "titles"],
    ["動画", d.videos.length, "videos"],
    ["出典", loaded.has("sourceDocuments") ? d.sourceDocuments.length : "…", "sources"],
    ["出典候補", refsLoaded ? (d.sourceEventReferences?.length ?? 0) + (d.sourceBoutReferences?.length ?? 0) + (d.sourceVideoReferences?.length ?? 0) : "…", "sources"],
  ];
}

export function statsHtml(counts) {
  return counts.map(([label, count, tab]) => {
    const name = SECTIONS[tab]?.label ?? label;
    return `<a class="stat-cell" href="?tab=${escapeHtml(tab)}" data-tab="${escapeHtml(tab)}" title="${escapeHtml(name)}を表示"><span class="stat-num">${escapeHtml(count)}</span><span class="stat-label">${escapeHtml(label)}</span></a>`;
  }).join("");
}

export class StatsRenderer {
  #el;

  constructor(el = document.querySelector("#stats")) {
    this.#el = el;
  }

  render(state, repo) {
    if (!this.#el) return;
    const html = statsHtml(dataCounts(state, repo));
    if (this.#el.innerHTML !== html) this.#el.innerHTML = html;
  }
}
