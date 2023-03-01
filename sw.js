const cacheName = "wa-share-V1";
self.addEventListener("install", event => {
  console.log("👷", "install", event);
  self.skipWaiting();
  const contentToCache = ["/", "/index.html", "/util.js", "/logo.png"];
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      console.log("[Service Worker] Caching all: app shell and content");
      await cache.addAll(contentToCache);
    })()
  );
});

self.addEventListener("activate", event => {
  console.log("👷", "activate", event);
  return self.clients.claim();
});

self.addEventListener("fetch", event => {
  // Regular requests not related to Web Share Target.
  if (event.request.method !== "POST") {
    event.respondWith(
      (async () => {
        console.log(`[Service Worker] Fetching resource: ${event.request.url}`);
        let r, response;
        try {
          response = await fetch(event.request);
        } catch {
          r = await caches.match(event.request);
        }
        if (response) {
          const cache = await caches.open(cacheName);
          console.log(
            `[Service Worker] Caching new resource: ${event.request.url}`
          );
          cache.put(event.request, response.clone());
        } else if (r) {
          console.log(
            `[Service Worker] Using cached resource: ${event.request.url}`
          );
          response = r;
        }
        return response;
      })()
    );
    return;
  }

  // Redirect to the form page
  event.respondWith(Response.redirect("/index.html"));

  // Requests related to Web Share Target.
  event.waitUntil(
    (async () => {
      const formData = await event.request.formData();
      const client = await self.clients.get(
        event.resultingClientId || event.clientId
      );
      const files = formData.getAll("chat");
      client.postMessage({ files: files, action: "chat" });
    })()
  );
});
