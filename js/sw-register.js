(function registerSiteServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

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
