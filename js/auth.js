let cachedUser = null;
let authReadyPromise = null;

function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return mapProfile(data);
}

function getCurrentUser() {
  return cachedUser;
}

async function initAuth() {
  if (useLocalDev()) {
    if (!authReadyPromise) authReadyPromise = Promise.resolve(null);
    return authReadyPromise;
  }

  if (!authReadyPromise) {
    authReadyPromise = (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw new Error(error.message);
      cachedUser = session?.user ? await fetchProfile(session.user.id) : null;

      supabase.auth.onAuthStateChange(async (_event, session) => {
        cachedUser = session?.user ? await fetchProfile(session.user.id) : null;
        refreshNavUser();
      });

      return cachedUser;
    })();
  }
  return authReadyPromise;
}

function runWhenReady(fn) {
  return initAuth().then(fn);
}

function redirectAfterLogin() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (next) {
    try {
      const url = new URL(next, window.location.origin);
      if (url.origin === window.location.origin && !next.startsWith('//')) {
        window.location.href = `${url.pathname}${url.search}${url.hash}`;
        return;
      }
    } catch {
      /* ignore invalid next */
    }
  }
  window.location.href = 'pilot-car.html';
}

async function requireAuth() {
  await initAuth();
  if (useLocalDev()) return DEV_PILOT_USER;
  if (!cachedUser) {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.href = `login.html?next=${encodeURIComponent(returnTo)}`;
    return null;
  }
  if (cachedUser.role !== 'pilot-car') {
    window.location.href = 'index.html';
    return null;
  }
  return cachedUser;
}

async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyAuthError(error.message));

  const { data: { user } } = await supabase.auth.getUser();
  cachedUser = await fetchProfile(user.id);
  if (!cachedUser) throw new Error('Account profile not found. Contact support.');
  return cachedUser;
}

async function signup({ name, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name.trim() } },
  });
  if (error) throw new Error(friendlyAuthError(error.message));

  if (data.session?.user) {
    cachedUser = await fetchProfile(data.session.user.id);
    return cachedUser;
  }

  if (data.user && !data.session) {
    throw new Error('Check your email to confirm your account, then log in.');
  }

  throw new Error('Sign up failed. Please try again.');
}

async function logout() {
  await supabase.auth.signOut();
  cachedUser = null;
  window.location.href = 'index.html';
}

async function updateProfileName(name) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not logged in.');

  const { error } = await supabase
    .from('profiles')
    .update({ name: name.trim() })
    .eq('id', user.id);

  if (error) throw new Error(error.message);
  cachedUser = { ...user, name: name.trim() };
  refreshNavUser();
  return cachedUser;
}

async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(friendlyAuthError(error.message));
}

async function sendPasswordReset(email) {
  const redirectTo = `${window.location.origin}/reset-password.html`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(friendlyAuthError(error.message));
}

function friendlyAuthError(message) {
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (message.includes('User already registered')) {
    return 'An account with this email already exists.';
  }
  return message;
}

async function getAdminSession() {
  if (useLocalDev() || !supabase) return null;

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user?.email) return null;
  if (!isAdminEmail(session.user.email)) return null;
  return session.user;
}

async function adminLogin(email, password) {
  if (useLocalDev() || !supabase) {
    throw new Error('Admin login requires Supabase. Set DEV_MODE to false.');
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyAuthError(error.message));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    cachedUser = null;
    throw new Error('This account is not authorized for admin access.');
  }

  return user;
}

async function adminLogout() {
  await supabase.auth.signOut();
  cachedUser = null;
  window.location.href = 'admin.html';
}

function generatePilotPassword(name = '') {
  const trimmed = String(name).trim();
  const base = trimmed ? trimmed.split(/\s+/)[0] : '';
  const bytes = new Uint8Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    bytes[0] = Math.floor(Math.random() * 256);
  }
  const suffix = String((bytes[0] % 900) + 100);
  return base ? `${base}${suffix}` : suffix;
}

async function adminCreatePilot({ name, email, password, listing }) {
  if (useLocalDev() || !supabase) {
    throw new Error('Admin onboarding requires Supabase.');
  }

  const { data: { session: adminSession } } = await supabase.auth.getSession();
  if (!adminSession?.user?.email || !isAdminEmail(adminSession.user.email)) {
    throw new Error('Admin session expired. Log in again.');
  }

  const adminTokens = {
    access_token: adminSession.access_token,
    refresh_token: adminSession.refresh_token,
  };

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim(), created_by_admin: true } },
  });

  if (error) throw new Error(friendlyAuthError(error.message));
  if (!data.user) throw new Error('Account creation failed.');

  if (!data.session) {
    await supabase.auth.setSession(adminTokens);
    throw new Error('Account created but email confirmation is on. Turn off “Confirm email” in Supabase → Authentication → Providers → Email.');
  }

  const payload = normalizeListing({ ...listing, userId: data.user.id });
  const { error: listingError } = await supabase.from('listings').insert({
    user_id: data.user.id,
    business_name: payload.businessName,
    years_experience: payload.yearsExperience,
    phone: payload.phone,
    email: payload.email,
    services: payload.services,
    states_certified: payload.statesCertified,
    home_state: payload.homeState,
    home_city: payload.homeCity,
    description: payload.description || '',
    added_by_admin: true,
  });

  if (listingError) {
    await supabase.auth.setSession(adminTokens);
    throw new Error(listingError.message);
  }

  const { error: sessionError } = await supabase.auth.setSession(adminTokens);
  if (sessionError) {
    throw new Error('Listing saved but admin session expired. Log in again to continue.');
  }

  const handoff = await saveAdminPilotHandoff({
    userId: data.user.id,
    contactName: name.trim(),
    loginEmail: email.trim(),
    tempPassword: password,
    phone: payload.phone,
  });

  cachedUser = null;
  return {
    email: email.trim(),
    password,
    userId: data.user.id,
    contactName: name.trim(),
    phone: payload.phone,
    handoffId: handoff.id,
  };
}

function refreshNavUser() {
  const navUser = document.getElementById('nav-user');
  const logoutBtn = document.getElementById('logout-btn');
  const user = getCurrentUser();

  if (navUser) {
    if (user) {
      navUser.textContent = user.name;
      navUser.hidden = false;
    } else {
      navUser.hidden = true;
    }
  }

  if (logoutBtn) {
    logoutBtn.hidden = !user;
  }
}
