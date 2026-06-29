// Bump when shipping frontend changes (shown on index page).
window.SITE_VERSION = 'v2';

// Set to true while building the frontend (no Supabase required).
// Set to false when Supabase is configured and ready.
window.DEV_MODE = true;

// Supabase project: PilotCar4Hire
// Replace placeholders when connecting the backend.
window.SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
window.SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

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
