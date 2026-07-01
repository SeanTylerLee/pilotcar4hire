const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

// States that require pilot car certification — shown first on admin intake.
const CERTIFICATION_REQUIRED_STATES = [
  'AZ', 'CO', 'FL', 'GA', 'KS', 'MN', 'NY', 'NC', 'OK', 'PA',
  'TX', 'UT', 'VA', 'WA', 'LA', 'NM', 'NV', 'WI',
];

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

function getStateName(code) {
  return STATE_NAMES[code?.toUpperCase()] || code;
}

function normalizeListing(listing) {
  if (!listing) return null;

  const services = listing.services
    || listing.escortTypes
    || [];

  let statesCertified = listing.statesCertified;
  if (!statesCertified && listing.states) {
    statesCertified = listing.states
      .split(/[,;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => US_STATES.includes(s));
  }
  if (!Array.isArray(statesCertified)) statesCertified = [];

  return {
    ...listing,
    services,
    statesCertified,
    homeState: listing.homeState || '',
    homeCity: listing.homeCity || '',
    yearsExperience: listing.yearsExperience ?? null,
    email: listing.email || listing.userEmail || '',
    description: listing.description || listing.notes || '',
  };
}

function formatStatesList(codes) {
  return (codes || []).join(', ');
}

function formatHomeLocation(city, stateCode) {
  const parts = [];
  if (city?.trim()) parts.push(city.trim());
  if (stateCode) parts.push(getStateName(stateCode));
  return parts.join(', ') || '';
}

function listingMatchesState(listing, stateCode) {
  if (!stateCode) return true;
  const code = stateCode.toUpperCase();
  const normalized = normalizeListing(listing);
  return normalized.homeState?.toUpperCase() === code;
}
