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
