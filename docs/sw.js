// 役割: docs/data/*.json 専用の Service Worker。stale-while-revalidate でキャッシュを即返ししつつ
//   裏で ETag/Last-Modified 条件付き再取得し、更新があればクライアントに DATA_UPDATED を通知する。
// アーキ上の位置: main.js が "./sw.js" を register する。DATA_UPDATED メッセージは main.js が受け取り
//   「再読み込み」バナーを表示する (メッセージ型名は main.js と同期必須)。GitHub Pages 静的配信が前提。
// 不変条件: fetch をフックするのは pathname に "/data/" を含み ".json" で終わる要求のみ — HTML/JS/CSS は
//   素通しさせる (古い viewer コードがキャッシュに固定されるのを防ぐ)。スキーマ非互換な変更時は CACHE 名の
//   バージョンを上げると activate 時に旧キャッシュが一掃される。
const CACHE = "arakaku-data-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function revalidate(cache, request, cached) {
  const headers = {};
  const etag = cached.headers.get("ETag");
  const lastModified = cached.headers.get("Last-Modified");
  if (etag) headers["If-None-Match"] = etag;
  else if (lastModified) headers["If-Modified-Since"] = lastModified;

  let response;
  try {
    response = await fetch(request, { headers });
  } catch {
    return;
  }

  // 304 (未変更) / 取得失敗 = 内容に変化なし。キャッシュ更新も通知もせず即抜けする
  // (ETag が一致するケースは下の newEtag 比較で別途弾く)。
  if (response.status === 304) return;
  if (!response.ok) return;

  const newEtag = response.headers.get("ETag");
  if (etag && newEtag && etag === newEtag) return;

  await cache.put(request, response.clone());

  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "DATA_UPDATED" });
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.includes("/data/") || !url.pathname.endsWith(".json")) return;

  const { request } = event;
  const cacheOp = caches.open(CACHE).then((cache) =>
    cache.match(request).then((cached) => ({ cache, cached }))
  );

  event.respondWith(
    cacheOp.then(({ cache, cached }) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) cache.put(request, res.clone());
        return res;
      });
    })
  );

  event.waitUntil(
    cacheOp.then(({ cache, cached }) => {
      if (!cached) return;
      return revalidate(cache, request, cached);
    })
  );
});
