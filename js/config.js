// Bump when shipping frontend changes (shown in footer).
window.SITE_VERSION = 'v22';

// Set to true while building the frontend (no Supabase required).
// Set to false when Supabase is configured and ready.
window.DEV_MODE = false;

// Supabase project: PilotCar4Hire
window.SUPABASE_URL = 'https://jefzhadejttqniktjtpu.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_WTFyVuiEIYsYYKSUYB7RRQ_-vMnviAJ';

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
