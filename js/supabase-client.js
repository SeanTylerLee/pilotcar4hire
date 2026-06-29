if (useLocalDev()) {
  window.supabase = window.supabase || { createClient: () => null };
  var supabase = null;
} else {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase config. Update js/config.js or set DEV_MODE to true.');
  }
  var supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}
