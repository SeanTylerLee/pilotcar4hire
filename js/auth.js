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
