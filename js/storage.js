const USERS_KEY = 'pc4h_users';
const LISTINGS_KEY = 'pc4h_listings';

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getListings() {
  return JSON.parse(localStorage.getItem(LISTINGS_KEY) || '[]');
}

function saveListings(listings) {
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}

function getListingByUserId(userId) {
  return getListings().find((l) => l.userId === userId) || null;
}

function upsertListing(listing) {
  const listings = getListings();
  const index = listings.findIndex((l) => l.userId === listing.userId);
  if (index >= 0) {
    listings[index] = listing;
  } else {
    listings.push(listing);
  }
  saveListings(listings);
  return listing;
}

function getUserByEmail(email) {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function createUser({ name, email, password, role }) {
  const users = getUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('An account with this email already exists.');
  }
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    password,
    role,
    createdAt: Date.now(),
  };
  users.push(user);
  saveUsers(users);
  return user;
}

function getUserById(id) {
  return getUsers().find((u) => u.id === id) || null;
}

function getListingWithUser(listing) {
  const user = getUserById(listing.userId);
  return { ...listing, userName: user?.name, userEmail: user?.email };
}

function getAllListingsWithUsers() {
  return getListings()
    .map(getListingWithUser)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function deleteListingByUserId(userId) {
  const listings = getListings().filter((l) => l.userId !== userId);
  saveListings(listings);
}

function updateUser(userId, updates) {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index < 0) throw new Error('User not found.');
  users[index] = { ...users[index], ...updates };
  saveUsers(users);
  const session = getSession?.();
  if (session?.userId === userId) {
    setSession(users[index]);
  }
  return users[index];
}
