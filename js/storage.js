const LISTINGS_KEY = 'pc4h_listings';

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function mapListingRow(row) {
  const listing = {
    id: row.id,
    userId: row.user_id || row.userId,
    businessName: row.business_name || row.businessName,
    yearsExperience: row.years_experience ?? row.yearsExperience ?? null,
    phone: row.phone,
    email: row.email || row.profiles?.email || row.userEmail || '',
    services: row.services || row.escort_types || row.escortTypes || [],
    statesCertified: row.states_certified || row.statesCertified || [],
    homeState: row.home_state || row.homeState || '',
    homeCity: row.home_city || row.homeCity || '',
    description: row.description || row.notes || '',
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : row.updatedAt,
    createdAt: row.profiles?.created_at ? new Date(row.profiles.created_at).getTime() : row.createdAt || null,
    addedByAdmin: row.added_by_admin ?? row.addedByAdmin ?? false,
    userName: row.profiles?.name || row.userName || '',
    userEmail: row.profiles?.email || row.userEmail || '',
  };
  return normalizeListing(listing);
}

function getLocalListings() {
  return JSON.parse(localStorage.getItem(LISTINGS_KEY) || '[]').map((row) => mapListingRow(row));
}

function saveLocalListings(listings) {
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}

function withDevUser(listing) {
  return normalizeListing({
    ...listing,
    userName: listing.userName || DEV_PILOT_USER.name,
    email: listing.email || DEV_PILOT_USER.email,
  });
}

async function getListingByUserId(userId) {
  if (useLocalDev()) {
    const listing = getLocalListings().find((l) => l.userId === userId) || null;
    return listing ? withDevUser(listing) : null;
  }

  const { data, error } = await supabase
    .from('listings')
    .select('*, profiles(name, email)')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapListingRow(data) : null;
}

async function upsertListing(listing) {
  const payload = normalizeListing(listing);

  if (useLocalDev()) {
    const raw = JSON.parse(localStorage.getItem(LISTINGS_KEY) || '[]');
    const index = raw.findIndex((l) => l.userId === payload.userId);
    const saved = {
      ...payload,
      id: payload.id || generateId(),
      updatedAt: Date.now(),
    };
    if (index >= 0) raw[index] = saved;
    else raw.push(saved);
    saveLocalListings(raw);
    return withDevUser(saved);
  }

  const row = {
    user_id: payload.userId,
    business_name: payload.businessName,
    years_experience: payload.yearsExperience,
    phone: payload.phone,
    email: payload.email,
    services: payload.services,
    states_certified: payload.statesCertified,
    home_state: payload.homeState,
    home_city: payload.homeCity,
    description: payload.description,
  };

  if (payload.id) row.id = payload.id;

  const { data, error } = await supabase
    .from('listings')
    .upsert(row, { onConflict: 'user_id' })
    .select('*, profiles(name, email)')
    .single();

  if (error) throw new Error(error.message);
  return mapListingRow(data);
}

async function getAllListingsWithUsers() {
  if (useLocalDev()) {
    return getLocalListings()
      .map(withDevUser)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  const { data, error } = await supabase
    .from('listings')
    .select('*, profiles(name, email)')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapListingRow);
}

async function getAdminAddedListings() {
  if (useLocalDev()) {
    return getLocalListings()
      .filter((l) => l.addedByAdmin)
      .map(withDevUser)
      .sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));
  }

  const { data, error } = await supabase
    .from('listings')
    .select('*, profiles(name, email, created_at)')
    .eq('added_by_admin', true)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapListingRow);
}

async function deleteListingByUserId(userId) {
  if (useLocalDev()) {
    const raw = JSON.parse(localStorage.getItem(LISTINGS_KEY) || '[]');
    saveLocalListings(raw.filter((l) => l.userId !== userId));
    return;
  }

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}
