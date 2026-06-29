const SESSION_KEY = 'pc4h_session';

function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  }));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  return getUserById(session.userId);
}

function redirectForRole(role) {
  window.location.href = role === 'pilot-car' ? 'pilot-car.html' : 'browse.html';
}

function requireAuth(expectedRole) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  if (expectedRole && user.role !== expectedRole) {
    redirectForRole(user.role);
    return null;
  }
  return user;
}

function login(email, password) {
  const user = getUserByEmail(email);
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password.');
  }
  setSession(user);
  return user;
}

function signup({ name, email, password, role }) {
  const user = createUser({ name, email, password, role });
  setSession(user);
  return user;
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}
