self.addEventListener("install", event => {
  console.log("👷", "install", event);
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  console.log("👷", "activate", event);
  return self.clients.claim();
});

self.addEventListener("fetch", event => {
  // Regular requests not related to Web Share Target.
  if (event.request.method !== "POST") {
    event.respondWith(fetch(event.request));
    return;
  }

  // Redirect to the form page
  event.respondWith(Response.redirect("/"));

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
