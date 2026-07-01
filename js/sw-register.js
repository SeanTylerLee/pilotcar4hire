async function clearSiteCacheAndReload() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('clear-cache');
  window.location.replace(url.toString());
}

(async function registerSiteServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

  if (new URLSearchParams(window.location.search).has('clear-cache')) {
    await clearSiteCacheAndReload();
    return;
  }

  const version = window.SITE_VERSION || '1';
  const swUrl = new URL(`sw.js?v=${encodeURIComponent(version)}`, document.baseURI).href;

  navigator.serviceWorker.register(swUrl).then((registration) => {
    registration.update().catch(() => undefined);
  }).catch(() => undefined);

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
})();
