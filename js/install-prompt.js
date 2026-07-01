const INSTALL_DISMISS_KEY = 'pc4h_install_dismissed_until';

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIOS && isSafari;
}

function isMobileDevice() {
  return window.matchMedia('(max-width: 900px)').matches
    || window.matchMedia('(pointer: coarse)').matches;
}

function isInstallDismissed() {
  try {
    const until = Number(localStorage.getItem(INSTALL_DISMISS_KEY) || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

function dismissInstallPrompt(days = 14) {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now() + days * 86400000));
  } catch {
    /* ignore */
  }
}

function ensureInstallUi() {
  let wrap = document.getElementById('install-app');
  if (wrap) return wrap;

  wrap = document.createElement('div');
  wrap.id = 'install-app';
  wrap.className = 'install-app';
  wrap.hidden = true;
  wrap.innerHTML = `
    <button type="button" class="install-app-btn" id="install-app-btn">
      <span class="install-app-icon" aria-hidden="true">+</span>
      Add to Home Screen
    </button>
    <button type="button" class="install-app-dismiss" id="install-app-dismiss" aria-label="Dismiss add to home screen">Not now</button>
  `;

  const hero = document.getElementById('hero-section');
  if (hero) {
    hero.appendChild(wrap);
    return wrap;
  }

  const main = document.getElementById('main-content') || document.querySelector('.main');
  if (main) main.insertBefore(wrap, main.firstChild);
  return wrap;
}

function ensureIosInstallModal() {
  let modal = document.getElementById('install-ios-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'install-ios-modal';
  modal.className = 'install-ios-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="install-ios-backdrop" data-install-close></div>
    <div class="install-ios-panel panel" role="dialog" aria-labelledby="install-ios-title" aria-modal="true">
      <button type="button" class="install-ios-close" data-install-close aria-label="Close">&times;</button>
      <h2 class="install-ios-title" id="install-ios-title">Add to Home Screen</h2>
      <p class="install-ios-lead">Open Pilot Car 4 Hire like an app — one tap from your home screen.</p>
      <ol class="install-ios-steps">
        <li>Tap the <strong>Share</strong> button <span class="install-ios-share-icon" aria-hidden="true">&#x2191;</span> at the bottom of Safari</li>
        <li>Scroll and tap <strong>Add to Home Screen</strong></li>
        <li>Tap <strong>Add</strong> in the top right</li>
      </ol>
      <button type="button" class="btn-submit install-ios-done" data-install-close>Got it</button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelectorAll('[data-install-close]').forEach((el) => {
    el.addEventListener('click', () => { modal.hidden = true; });
  });
  return modal;
}

function showInstallUi() {
  const wrap = ensureInstallUi();
  if (!wrap || isAppInstalled() || isInstallDismissed() || !isMobileDevice()) return;
  wrap.hidden = false;
}

function initInstallPrompt() {
  if (isAppInstalled() || isInstallDismissed() || !isMobileDevice()) return;

  const wrap = ensureInstallUi();
  const btn = document.getElementById('install-app-btn');
  const dismissBtn = document.getElementById('install-app-dismiss');
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    showInstallUi();
  });

  if (isIosSafari()) {
    showInstallUi();
  }

  if (btn) {
    btn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        wrap.hidden = true;
        return;
      }

      if (isIosSafari()) {
        const modal = ensureIosInstallModal();
        modal.hidden = false;
      }
    });
  }

  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      dismissInstallPrompt();
      wrap.hidden = true;
    });
  }
}

runWhenReady(() => {
  initInstallPrompt();
});