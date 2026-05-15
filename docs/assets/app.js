const DATA_FILES = {
  metadata: "./data/metadata.json",
  articles: "./data/articles.json",
  promotions: "./data/promotions.json",
  events: "./data/events.json",
  bouts: "./data/bouts.json",
  fighters: "./data/fighters.json",
  titles: "./data/titles.json",
  fighterSnapshots: "./data/fighter_snapshots.json",
  aliases: "./data/aliases.json",
};

let state = {
  tab: "bouts",
  query: "",
  data: null,
};

async function fetchJson(path, fallback) {
  const response = await fetch(path);
  if (!response.ok) return fallback;
  return response.json();
}

async function loadData() {
  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, path]) => {
      const fallback = key === "aliases" ? {} : key === "metadata" ? {} : [];
      return [key, await fetchJson(path, fallback)];
    })
  );

  state.data = Object.fromEntries(entries);
  render();
}

function includesQuery(values) {
  const q = state.query.trim().toLowerCase();
  if (!q) return true;

  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function renderSummary() {
  const d = state.data;

  const items = [
    ["団体", d.promotions.length],
    ["大会", d.events.length],
    ["試合", d.bouts.length],
    ["選手", d.fighters.length],
    ["王座", d.titles.length],
  ];

  document.querySelector("#summary").innerHTML = items
    .map(([label, count]) => `
      <article class="summary-card">
        <strong>${count}</strong>
        <span>${label}</span>
      </article>
    `)
    .join("");
}

function eventName(eventId) {
  return state.data.events.find((event) => event.event_id === eventId)?.name ?? eventId;
}

function promotionName(promotionId) {
  return state.data.promotions.find((promotion) => promotion.promotion_id === promotionId)?.name ?? promotionId;
}

function renderBouts() {
  const bouts = state.data.bouts.filter((bout) =>
    includesQuery([
      bout.winner,
      bout.loser,
      bout.division,
      eventName(bout.event_id),
      promotionName(bout.promotion_id),
      bout.result?.method_raw,
      bout.result?.technique,
    ])
  );

  return bouts.map((bout) => `
    <article class="card">
      <h2>${bout.winner} vs ${bout.loser}</h2>
      <p class="meta">${eventName(bout.event_id)} / ${bout.division ?? ""}</p>
      <p class="result">
        ${bout.winner} def. ${bout.loser}
        ${bout.result?.round ? `${bout.result.round}R` : ""}
        ${bout.result?.time ?? ""}
        ${bout.result?.method_raw ?? ""}
      </p>
      ${bout.title?.is_title_bout ? `<p class="meta">王座戦: ${bout.title.note}</p>` : ""}
    </article>
  `).join("") || emptyMessage();
}

function renderFighters() {
  const fighters = state.data.fighters.filter((fighter) =>
    includesQuery([
      fighter.display_name,
      fighter.main_division,
      fighter.main_promotion_id,
      fighter.profile?.gym,
      fighter.summary,
    ])
  );

  return fighters.map((fighter) => `
    <article class="card">
      <h2>${fighter.display_name}</h2>
      <p class="meta">${fighter.main_division ?? ""} / ${promotionName(fighter.main_promotion_id)}</p>
      <dl>
        <dt>所属</dt>
        <dd>${fighter.profile?.gym ?? "不明"}</dd>
        <dt>身長・年齢</dt>
        <dd>${fighter.profile?.height ?? "不明"} / ${fighter.profile?.age ?? "不明"}</dd>
        <dt>概要</dt>
        <dd>${fighter.summary || "未入力"}</dd>
      </dl>
    </article>
  `).join("") || emptyMessage();
}

function renderEvents() {
  const events = state.data.events.filter((event) =>
    includesQuery([
      event.name,
      promotionName(event.promotion_id),
      event.summary,
    ])
  );

  return events.map((event) => `
    <article class="card">
      <h2>${event.name}</h2>
      <p class="meta">${promotionName(event.promotion_id)} / ${event.published_at ?? ""}</p>
      <p>${event.summary || "概要未入力"}</p>
    </article>
  `).join("") || emptyMessage();
}

function renderPromotions() {
  const promotions = state.data.promotions.filter((promotion) =>
    includesQuery([
      promotion.name,
      promotion.name_en,
      promotion.category,
      promotion.summary,
    ])
  );

  return promotions.map((promotion) => `
    <article class="card">
      <h2>${promotion.name}</h2>
      <p class="meta">${promotion.name_en ?? ""} / ${promotion.category ?? ""}</p>
      <p>${promotion.summary || "概要未入力"}</p>
      <dl>
        <dt>会場</dt>
        <dd>${promotion.rules?.venue ?? "不明"}</dd>
        <dt>ラウンド</dt>
        <dd>${promotion.rules?.rounds ?? "不明"}</dd>
        <dt>判定</dt>
        <dd>${promotion.rules?.judging ?? "不明"}</dd>
      </dl>
    </article>
  `).join("") || emptyMessage();
}


function renderTitles() {
  const titles = state.data.titles.filter((title) =>
    includesQuery([
      title.title_id,
      title.division,
      promotionName(title.promotion_id),
      ...(title.lineage ?? []).flatMap((reign) => [
        reign.fighter_name,
        reign.reign_label,
      ]),
    ])
  );

  return titles.map((title) => {
    const lineage = [...(title.lineage ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((reign) => `
        <li>
          <span class="reign-label">${reign.reign_label ?? `${reign.order}代`}</span>
          <span class="fighter-name">${reign.fighter_name ?? reign.fighter_id}</span>
        </li>
      `)
      .join("");

    return `
      <article class="card title-card">
        <h2>${promotionName(title.promotion_id)} / ${title.division ?? ""}</h2>
        <p class="meta">${title.title_id}</p>
        <ol class="lineage-list">
          ${lineage}
        </ol>
      </article>
    `;
  }).join("") || emptyMessage();
}

function emptyMessage() {
  return `<article class="card"><p>該当するデータがありません。</p></article>`;
}

function renderContent() {
  const renderer = {
    bouts: renderBouts,
    fighters: renderFighters,
    events: renderEvents,
    promotions: renderPromotions,
    titles: renderTitles,
  }[state.tab];

  document.querySelector("#content").innerHTML = renderer();
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.tab);
  });
}

function render() {
  renderSummary();
  renderTabs();
  renderContent();
}

document.querySelector("#search").addEventListener("input", (event) => {
  state.query = event.target.value;
  renderContent();
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    state.tab = button.dataset.tab;
    render();
  });
});

loadData().catch((error) => {
  document.querySelector("#content").innerHTML = `
    <article class="card">
      <h2>読み込みに失敗しました</h2>
      <p>${error.message}</p>
    </article>
  `;
});
