// Bump when shipping frontend changes (shown in footer).
window.SITE_VERSION = 'v65';

// Public contact email (footer, reports, schema.org).
window.SITE_CONTACT_EMAIL = 'team@pilotcar4hire.com';

// Native iOS app (App Store).
window.APP_STORE_ID = '6802048795';
window.APP_STORE_URL = 'https://apps.apple.com/us/app/pilotcar4hire/id6802048795';

// Set to true while building the frontend (no Supabase required).
// Set to false when Supabase is configured and ready.
window.DEV_MODE = false;

// Supabase project: PilotCar4Hire
window.SUPABASE_URL = 'https://jefzhadejttqniktjtpu.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_WTFyVuiEIYsYYKSUYB7RRQ_-vMnviAJ';

// Emails allowed to access admin.html (your Supabase auth account).
window.ADMIN_EMAILS = [
  'seantylerlee@outlook.com',
];

function isAdminEmail(email) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return (window.ADMIN_EMAILS || [])
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

function isSupabaseConfigured() {
  return window.SUPABASE_URL
    && !window.SUPABASE_URL.includes('YOUR_PROJECT_REF')
    && window.SUPABASE_ANON_KEY
    && !window.SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY');
}

function useLocalDev() {
  return window.DEV_MODE === true || !isSupabaseConfigured();
}

const DEV_PILOT_USER = {
  id: 'dev-pilot',
  name: 'Test Pilot Car',
  email: 'pilot@example.com',
  role: 'pilot-car',
};

function isIosDevice() {
  const ua = window.navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

(function renderSiteVersion() {
  function apply() {
    const el = document.getElementById('site-version');
    if (el && window.SITE_VERSION) {
      el.textContent = window.SITE_VERSION;
      el.hidden = false;
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();

(function renderAppStoreBadge() {
  const url = window.APP_STORE_URL;
  if (!url) return;

  function badgeHtml(extraClass) {
    return `<a class="app-store-badge${extraClass ? ` ${extraClass}` : ''}" href="${url}" target="_blank" rel="noopener noreferrer">
      <img src="images/download-on-the-app-store.svg" alt="Download on the App Store" width="120" height="40">
    </a>`;
  }

  function apply() {
    if (isIosDevice()) {
      document.documentElement.classList.add('is-ios');
    }

    const footerBrand = document.querySelector('.footer-brand');
    if (footerBrand && !footerBrand.querySelector('.app-store-badge')) {
      footerBrand.insertAdjacentHTML('beforeend', badgeHtml('app-store-badge--footer'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
