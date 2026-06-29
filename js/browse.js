initNav('browse');

const listingsEl = document.getElementById('listings');
const emptyState = document.getElementById('empty-state');
const resultsCount = document.getElementById('results-count');
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('type-filter');
const stateFilter = document.getElementById('state-filter');

US_STATES.forEach((state) => {
  const option = document.createElement('option');
  option.value = state;
  option.textContent = state;
  stateFilter.appendChild(option);
});

function renderListings() {
  const query = searchInput.value.trim().toLowerCase();
  const type = typeFilter.value;
  const state = stateFilter.value;

  let listings = getAllListingsWithUsers();

  if (state) {
    listings = listings.filter((l) => listingMatchesState(l, state));
  }

  if (type) {
    listings = listings.filter((l) => l.escortTypes.includes(type));
  }

  if (query) {
    listings = listings.filter((l) => {
      const haystack = [
        l.businessName,
        l.states,
        l.serviceArea,
        l.corridors,
        l.availability,
        l.notes,
        l.userName,
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }

  listingsEl.innerHTML = '';

  const count = listings.length;
  resultsCount.textContent = count === 1 ? '1 pilot car found' : `${count} pilot cars found`;

  if (count === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  listings.forEach((listing) => {
    listingsEl.appendChild(renderListingCard(listing));
  });
}

searchInput.addEventListener('input', renderListings);
typeFilter.addEventListener('change', renderListings);
stateFilter.addEventListener('change', renderListings);
renderListings();
