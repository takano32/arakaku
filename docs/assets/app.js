const DATA_FILES = {
  metadata: "./data/metadata.json",
  articles: "./data/articles.json",
  promotions: "./data/promotions.json",
  events: "./data/events.json",
  bouts: "./data/bouts.json",
  fighters: "./data/fighters.json",
  titles: "./data/titles.json",
  videos: "./data/videos.json",
  videoLinks: "./data/video_links.json",
  fighterSnapshots: "./data/fighter_snapshots.json",
  aliases: "./data/aliases.json",
};

const state = {
  tab: "bouts",
  query: "",
  titlePromotion: "",
  titleDivision: "",
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
      const fallback = key === "aliases" || key === "metadata" ? {} : [];
      return [key, await fetchJson(path, fallback)];
    })
  );

  state.data = Object.fromEntries(entries);
  render();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), "ja")
  );
}

function eventName(eventId) {
  return state.data.events.find((event) => event.event_id === eventId)?.name ?? eventId;
}

function promotionName(promotionId) {
  return state.data.promotions.find((promotion) => promotion.promotion_id === promotionId)?.name ?? promotionId;
}

function videoById(videoId) {
  return state.data.videos.find((video) => video.video_id === videoId);
}

function videosForEntity(entityType, entityId) {
  return state.data.videoLinks
    .filter((link) => link.entity_type === entityType && link.entity_id === entityId)
    .map((link) => ({
      link,
      video: videoById(link.video_id),
    }))
    .filter((item) => item.video);
}

function videoTypeLabel(videoType) {
  return {
    full_fight: "Full Fight",
    highlight: "ハイライト",
    short: "Short",
    stream_archive: "配信",
    preview: "煽り",
    interview: "インタビュー",
    commentary: "解説",
    reference: "参考",
  }[videoType] ?? videoType ?? "動画";
}

function relationTypeLabel(relationType) {
  return {
    full_fight: "Full Fight",
    highlight: "ハイライト",
    short: "Short",
    stream_archive: "配信",
    preview: "煽り",
    interview: "インタビュー",
    commentary: "解説",
    reference: "参考",
  }[relationType] ?? relationType ?? "動画";
}


function renderBoutResultSummary(bout) {
  const resultStatus = bout.result_status ?? "known";

  if (resultStatus === "unknown") {
    return "勝敗未入力";
  }

  if (bout.winner && bout.loser) {
    return `${fighterLink(bout.winner_id, bout.winner)} def. ${fighterLink(bout.loser_id, bout.loser)}`;
  }

  return "結果未入力";
}

function renderVideoLinks(entityType, entityId) {
  const items = videosForEntity(entityType, entityId);

  if (items.length === 0) {
    return "";
  }

  return `
    <section class="video-links">
      <h3>動画</h3>
      <ul>
        ${items.map(({ link, video }) => `
          <li>
            <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(video.title)}
            </a>
            <span class="video-badge">${escapeHtml(relationTypeLabel(link.relation_type || video.video_type))}</span>
            ${link.notes ? `<p class="meta">${escapeHtml(link.notes)}</p>` : ""}
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}


function titleDisplayName(title) {
  const promotion = promotionName(title.promotion_id);
  const division = title.division ?? "階級未設定";
  const id = title.title_id ?? "";

  if (id.includes("tournament")) {
    return `${promotion} ${division}トーナメント`;
  }

  if (title.promotion_id === "max_bout") {
    return `${promotion} ${division}`;
  }

  return `${promotion} ${division}王座`;
}

function fighterName(fighterId) {
  return state.data.fighters.find((fighter) => fighter.fighter_id === fighterId)?.display_name ?? fighterId;
}



function fighterMatchesQuery(fighter) {
  return includesQuery([
    fighter.display_name,
    fighter.aliases?.join(" "),
    fighter.main_division,
    fighter.main_promotion_id,
    fighter.profile?.height,
    fighter.profile?.age,
    fighter.profile?.gym,
    fighter.summary,
  ]);
}

function boutMatchup(bout) {
  const fighterA = bout.fighters?.[0];
  const fighterB = bout.fighters?.[1];

  const fighterAName = fighterA?.name ?? bout.fighter_a ?? "";
  const fighterBName = fighterB?.name ?? bout.fighter_b ?? "";
  const fighterAId = fighterA?.fighter_id ?? bout.fighter_a_id ?? "";
  const fighterBId = fighterB?.fighter_id ?? bout.fighter_b_id ?? "";

  if (fighterAName && fighterBName) {
    return `${fighterLink(fighterAId, fighterAName)} vs ${fighterLink(fighterBId, fighterBName)}`;
  }

  if (bout.winner && bout.loser) {
    return `${fighterLink(bout.winner_id, bout.winner)} vs ${fighterLink(bout.loser_id, bout.loser)}`;
  }

  if (bout.matchup) {
    return escapeHtml(bout.matchup);
  }

  return escapeHtml(bout.bout_id);
}

function fighterLink(fighterId, fallbackName) {
  const name = fighterName(fighterId) || fallbackName || fighterId;

  return `
    <button type="button" class="link-button fighter-link" data-fighter-id="${escapeHtml(fighterId)}" data-fighter-name="${escapeHtml(name)}">
      ${escapeHtml(name)}
    </button>
  `;
}

function jumpToFighter(fighterId, fighterNameValue) {
  state.tab = "fighters";
  state.focusFighterId = fighterId || "";
  state.query = fighterNameValue || "";
  searchInput.value = state.query;

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === state.tab);
  });

  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function relatedBoutsForFighter(fighterId) {
  if (!fighterId) return [];

  return state.data.bouts
    .filter((bout) =>
      (bout.fighters ?? []).some((fighter) => fighter.fighter_id === fighterId)
    )
    .sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));
}

function renderRelatedBouts(fighterId) {
  const bouts = relatedBoutsForFighter(fighterId);

  if (bouts.length === 0) {
    return `<p class="meta">関連試合はまだ登録されていません。</p>`;
  }

  return `
    <section class="related-bouts">
      <h3>関連試合</h3>
      <ul>
        ${bouts.map((bout) => `
          <li>
            <span class="meta">${escapeHtml(eventName(bout.event_id))}</span>
            <span>
              ${fighterLink(bout.winner_id, bout.winner)}
              def.
              ${fighterLink(bout.loser_id, bout.loser)}
            </span>
            <span class="meta">
              ${escapeHtml(bout.result?.round ? `${bout.result.round}R` : "")}
              ${escapeHtml(bout.result?.time ?? "")}
              ${escapeHtml(bout.result?.method_raw ?? "")}
            </span>
            ${renderVideoLinks("bout", bout.bout_id)}
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

function renderSummary() {
  const d = state.data;

  const items = [
    ["団体", d.promotions.length],
    ["大会", d.events.length],
    ["試合", d.bouts.length],
    ["選手", d.fighters.length],
    ["王座", d.titles.length],
    ["動画", d.videos.length],
  ];

  document.querySelector("#summary").innerHTML = items
    .map(([label, count]) => `
      <article class="summary-card">
        <strong>${escapeHtml(count)}</strong>
        <span>${escapeHtml(label)}</span>
      </article>
    `)
    .join("");
}

function renderTitleFilters() {
  const filters = document.querySelector("#title-filters");
  if (!filters) return;

  filters.hidden = state.tab !== "titles";

  const promotionSelect = document.querySelector("#title-promotion-filter");
  const divisionSelect = document.querySelector("#title-division-filter");

  if (!promotionSelect || !divisionSelect || !state.data) return;

  const promotionIds = uniqueSorted(state.data.titles.map((title) => title.promotion_id));
  const divisions = uniqueSorted(state.data.titles.map((title) => title.division));

  promotionSelect.innerHTML = [
    `<option value="">すべての団体</option>`,
    ...promotionIds.map((promotionId) => `
      <option value="${escapeHtml(promotionId)}" ${promotionId === state.titlePromotion ? "selected" : ""}>
        ${escapeHtml(promotionName(promotionId))}
      </option>
    `),
  ].join("");

  divisionSelect.innerHTML = [
    `<option value="">すべての階級</option>`,
    ...divisions.map((division) => `
      <option value="${escapeHtml(division)}" ${division === state.titleDivision ? "selected" : ""}>
        ${escapeHtml(division)}
      </option>
    `),
  ].join("");
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
      <h2>${boutMatchup(bout)}</h2>
      <p class="meta">${escapeHtml(eventName(bout.event_id))} / ${escapeHtml(bout.division ?? "")}</p>
      <p class="result">
        ${renderBoutResultSummary(bout)}
        ${bout.result?.round ? `${escapeHtml(bout.result.round)}R` : ""}
        ${escapeHtml(bout.result?.time ?? "")}
        ${escapeHtml(bout.result?.method_raw ?? "")}
      </p>
      ${bout.title?.is_title_bout ? `<p class="meta">王座戦: ${escapeHtml(bout.title.note)}</p>` : ""}
      ${renderVideoLinks("bout", bout.bout_id)}
    </article>
  `).join("") || emptyMessage();
}

function renderFighters() {
  const fighters = state.focusFighterId
    ? state.data.fighters.filter((fighter) => fighter.fighter_id === state.focusFighterId)
    : state.data.fighters.filter((fighter) => fighterMatchesQuery(fighter));

  return fighters.map((fighter) => `
    <article class="card">
      <h2>${escapeHtml(fighter.display_name)}</h2>
      <p class="meta">${escapeHtml(fighter.main_division ?? "")} / ${escapeHtml(promotionName(fighter.main_promotion_id))}</p>
      <dl>
        <dt>所属</dt>
        <dd>${escapeHtml(fighter.profile?.gym ?? "不明")}</dd>
        <dt>身長・年齢</dt>
        <dd>${escapeHtml(fighter.profile?.height ?? "不明")} / ${escapeHtml(fighter.profile?.age ?? "不明")}</dd>
        <dt>概要</dt>
        <dd>${escapeHtml(fighter.summary || "未入力")}</dd>
      </dl>
      ${renderRelatedBouts(fighter.fighter_id)}
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
      <h2>${escapeHtml(event.name)}</h2>
      <p class="meta">${escapeHtml(promotionName(event.promotion_id))} / ${escapeHtml(event.published_at ?? "")}</p>
      <p>${escapeHtml(event.summary || "概要未入力")}</p>
      ${renderVideoLinks("event", event.event_id)}
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
      <h2>${escapeHtml(promotion.name)}</h2>
      <p class="meta">${escapeHtml(promotion.name_en ?? "")} / ${escapeHtml(promotion.category ?? "")}</p>
      <p>${escapeHtml(promotion.summary || "概要未入力")}</p>
      <dl>
        <dt>会場</dt>
        <dd>${escapeHtml(promotion.rules?.venue ?? "不明")}</dd>
        <dt>ラウンド</dt>
        <dd>${escapeHtml(promotion.rules?.rounds ?? "不明")}</dd>
        <dt>判定</dt>
        <dd>${escapeHtml(promotion.rules?.judging ?? "不明")}</dd>
      </dl>
    </article>
  `).join("") || emptyMessage();
}


function linkStatusLabel(status) {
  return {
    linked: "紐づけ済み",
    partially_linked: "一部紐づけ",
    unlinked: "未紐づけ",
    needs_review: "要確認",
  }[status] ?? status ?? "未設定";
}

function renderVideos() {
  const videos = state.data.videos.filter((video) =>
    includesQuery([
      video.title,
      video.url,
      video.channel_name,
      video.video_type,
      video.link_status,
      video.notes,
      video.duplicate_group_id,
      video.duplicate_note,
    ])
  );

  if (videos.length === 0) {
    return emptyMessage();
  }

  return videos.map((video) => `
    <article class="card video-card">
      <h2>
        <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(video.title)}
        </a>
      </h2>

      <p class="meta">
        ${escapeHtml(video.channel_name ?? "")}
        ${video.published_at ? ` / ${escapeHtml(video.published_at)}` : ""}
      </p>

      <div class="video-badges">
        <span class="video-badge">${escapeHtml(videoTypeLabel(video.video_type))}</span>
        <span class="video-badge">${escapeHtml(linkStatusLabel(video.link_status))}</span>
      </div>

      <dl>
        <dt>URL</dt>
        <dd><a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(video.url)}</a></dd>

        <dt>platform_video_id</dt>
        <dd>${escapeHtml(video.platform_video_id ?? "")}</dd>

        ${video.duplicate_group_id ? `
          <dt>重複候補</dt>
          <dd>${escapeHtml(video.duplicate_group_id)}</dd>
        ` : ""}

        ${video.duplicate_note ? `
          <dt>重複メモ</dt>
          <dd>${escapeHtml(video.duplicate_note)}</dd>
        ` : ""}

        ${video.notes ? `
          <dt>メモ</dt>
          <dd>${escapeHtml(video.notes)}</dd>
        ` : ""}
      </dl>
    </article>
  `).join("");
}

function renderTitles() {
  const titles = state.data.titles
    .filter((title) => {
      if (state.titlePromotion && title.promotion_id !== state.titlePromotion) {
        return false;
      }

      if (state.titleDivision && title.division !== state.titleDivision) {
        return false;
      }

      return includesQuery([
        title.title_id,
        title.division,
        promotionName(title.promotion_id),
        ...(title.lineage ?? []).flatMap((reign) => [
          reign.fighter_name,
          reign.reign_label,
        ]),
      ]);
    })
    .sort((a, b) => {
      const promotionCompare = promotionName(a.promotion_id).localeCompare(
        promotionName(b.promotion_id),
        "ja"
      );

      if (promotionCompare !== 0) return promotionCompare;

      return String(a.division ?? "").localeCompare(String(b.division ?? ""), "ja");
    });

  if (titles.length === 0) {
    return emptyMessage();
  }

  let previousGroup = "";

  return titles.map((title) => {
    const group = `${promotionName(title.promotion_id)} / ${title.division ?? "階級未設定"}`;
    const groupHeader = group !== previousGroup
      ? `<h2 class="title-group-heading">${escapeHtml(group)}</h2>`
      : "";

    previousGroup = group;

    const lineage = [...(title.lineage ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((reign) => `
        <li>
          <span class="reign-label">${escapeHtml(reign.reign_label ?? `${reign.order}代`)}</span>
          <span class="fighter-name">${fighterLink(reign.fighter_id, reign.fighter_name)}</span>
        </li>
      `)
      .join("");

    return `
      ${groupHeader}
      <article class="card title-card">
        <h3>${escapeHtml(titleDisplayName(title))}</h3>
        <p class="meta">${escapeHtml(title.title_id)}</p>
        <ol class="lineage-list">
          ${lineage}
        </ol>
      </article>
    `;
  }).join("");
}

function emptyMessage() {
  return `<article class="card"><p>該当するデータがありません。</p></article>`;
}

function renderContent() {
  const renderers = {
    bouts: renderBouts,
    fighters: renderFighters,
    events: renderEvents,
    promotions: renderPromotions,
    titles: renderTitles,
    videos: renderVideos,
  };

  const renderer = renderers[state.tab] ?? renderBouts;
  document.querySelector("#content").innerHTML = renderer();
}

function renderTabs() {
  
document.querySelector("#content").addEventListener("click", (event) => {
  const button = event.target.closest(".fighter-link");
  if (!button) return;

  jumpToFighter(button.dataset.fighterId, button.dataset.fighterName);
});

document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.tab);
  });
}

function render() {
  if (!state.data) return;

  renderSummary();
  renderTabs();
  renderTitleFilters();
  renderContent();
}

document.querySelector("#search").addEventListener("input", (event) => {
  state.query = event.target.value;
  renderContent();
});

document.querySelector("#title-promotion-filter")?.addEventListener("change", (event) => {
  state.titlePromotion = event.target.value;
  renderContent();
});

document.querySelector("#title-division-filter")?.addEventListener("change", (event) => {
  state.titleDivision = event.target.value;
  renderContent();
});


document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;
    if (!tab) return;

    state.tab = tab;
    render();
  });
});

loadData().catch((error) => {
  document.querySelector("#content").innerHTML = `
    <article class="card">
      <h2>読み込みに失敗しました</h2>
      <p>${escapeHtml(error.message)}</p>
    </article>
  `;
});
