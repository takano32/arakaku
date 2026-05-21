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

function fighterName(fighterId) {
  return state.data.fighters.find((fighter) => fighter.fighter_id === fighterId)?.display_name ?? fighterId;
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

function linkStatusLabel(status) {
  return {
    linked: "紐づけ済み",
    partially_linked: "一部紐づけ",
    unlinked: "未紐づけ",
    needs_review: "要確認",
  }[status] ?? status ?? "未設定";
}

function sourceTypeLabel(sourceType) {
  return {
    note_article: "note本文",
    youtube_description: "YouTube概要欄",
  }[sourceType] ?? sourceType ?? "出典";
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
    fighter.source_article_ids?.join(" "),
    fighter.inferred_from_video_ids?.join(" "),
    fighter.inferred_confidence,
  ]);
}

function boutSearchText(bout) {
  const fighterNames = (bout.fighters ?? [])
    .map((fighter) => fighter.name)
    .filter(Boolean)
    .join(" ");

  return [
    bout.bout_id,
    bout.matchup,
    fighterNames,
    bout.winner,
    bout.loser,
    bout.division,
    bout.weight_class_id,
    bout.bout_type,
    bout.bout_id,
    bout.source_article_id,
    bout.result_status,
    bout.inferred_from_video_id,
    bout.inferred_from_video_title,
    bout.inferred_confidence,
    bout.title?.title_id,
    bout.title?.title_result,
    bout.title?.note,
    eventName(bout.event_id),
    promotionName(bout.promotion_id),
    bout.result?.method_raw,
    bout.result?.method_normalized,
    bout.notes,
    ...(typeof sourceReferencesForBout === "function"
      ? sourceReferencesForBout(bout).map(sourceReferenceSearchText)
      : []),
  ];
}

function eventLink(eventId, fallbackName) {
  const name = eventName(eventId) || fallbackName || eventId;

  return `
    <button type="button" class="link-button event-link" data-event-id="${escapeHtml(eventId)}" data-event-name="${escapeHtml(name)}">
      ${escapeHtml(name)}
    </button>
  `;
}

function jumpToEvent(eventId, eventNameValue) {
  state.tab = "events";
  state.focusEventId = eventId || "";
  state.focusFighterId = "";
  state.query = eventNameValue || "";

  const searchInput = document.querySelector("#search");
  if (searchInput) {
    searchInput.value = state.query;
  }

  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
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
  state.focusEventId = "";
  state.query = fighterNameValue || "";

  const searchInput = document.querySelector("#search");
  if (searchInput) {
    searchInput.value = state.query;
  }

  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
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
