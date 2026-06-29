runWhenReady(async () => {
  initNav('browse');

  const mapView = document.getElementById('map-view');
  const listingsView = document.getElementById('listings-view');
  const mapContainer = document.getElementById('us-map-container');
  const mapTooltip = document.getElementById('map-tooltip');
  const backBtn = document.getElementById('back-to-map');
  const browseTitle = document.getElementById('browse-title');
  const browseSubtitle = document.getElementById('browse-subtitle');
  const listingsEl = document.getElementById('listings');
  const emptyState = document.getElementById('empty-state');
  const resultsCount = document.getElementById('results-count');
  const searchInput = document.getElementById('search-input');
  const typeFilter = document.getElementById('type-filter');

  LISTING_SERVICES.forEach((service) => {
    const option = document.createElement('option');
    option.value = service.value;
    option.textContent = service.label;
    typeFilter.appendChild(option);
  });

  let selectedState = null;
  let allListings = [];

  function countListingsForState(stateCode) {
    return allListings.filter((l) => listingMatchesState(l, stateCode)).length;
  }

  function updateMapHighlights() {
    if (!mapContainer.querySelector('.state')) return;
    mapContainer.querySelectorAll('.state').forEach((path) => {
      const code = path.dataset.state;
      const count = countListingsForState(code);
      path.classList.toggle('has-listings', count > 0);
      path.setAttribute('aria-label', `${path.dataset.name}: ${count} pilot car${count === 1 ? '' : 's'}`);
    });
  }

  async function loadListings() {
    try {
      allListings = await getAllListingsWithUsers();
    } catch (err) {
      console.error(err);
      allListings = [];
    }
    updateMapHighlights();
    if (selectedState) renderListings();
  }

  async function loadMap() {
    const res = await fetch('images/us-map.svg');
    const svgText = await res.text();
    mapContainer.innerHTML = svgText;
    const svg = mapContainer.querySelector('svg');
    if (svg) svg.classList.add('us-map');

    mapContainer.querySelectorAll('.state').forEach((path) => {
      path.setAttribute('role', 'button');
      path.setAttribute('tabindex', '0');
      path.addEventListener('click', () => selectState(path.dataset.state));
      path.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectState(path.dataset.state);
        }
      });
      path.addEventListener('mouseenter', (e) => showTooltip(e, path));
      path.addEventListener('mousemove', (e) => moveTooltip(e));
      path.addEventListener('mouseleave', hideTooltip);
      path.addEventListener('focus', (e) => showTooltip(e, path));
      path.addEventListener('blur', hideTooltip);
    });

    updateMapHighlights();
  }

  function showTooltip(e, path) {
    const count = countListingsForState(path.dataset.state);
    const label = count === 1 ? '1 pilot car' : `${count} pilot cars`;
    mapTooltip.textContent = `${path.dataset.name} — ${label}`;
    mapTooltip.hidden = false;
    moveTooltip(e);
  }

  function moveTooltip(e) {
    const panel = mapContainer.closest('.map-panel');
    const rect = panel.getBoundingClientRect();
    mapTooltip.style.left = `${e.clientX - rect.left}px`;
    mapTooltip.style.top = `${e.clientY - rect.top - 12}px`;
  }

  function hideTooltip() {
    mapTooltip.hidden = true;
  }

  function selectState(stateCode) {
    if (!stateCode) return;
    selectedState = stateCode.toUpperCase();
    mapView.hidden = true;
    listingsView.hidden = false;

    const name = getStateName(selectedState);
    browseTitle.textContent = name;
    browseSubtitle.textContent = `Pilot cars certified in ${name}. Contact them directly.`;

    searchInput.value = '';
    typeFilter.value = '';
    renderListings();
    history.replaceState(null, '', `#${selectedState}`);
    listingsView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showMap() {
    selectedState = null;
    listingsView.hidden = true;
    mapView.hidden = false;
    browseTitle.textContent = 'Find a pilot car';
    browseSubtitle.textContent = 'Select a state on the map to view certified escorts. No account required.';
    history.replaceState(null, '', 'browse.html');
  }

  function renderListings() {
    if (!selectedState) return;

    const query = searchInput.value.trim().toLowerCase();
    const type = typeFilter.value;

    let listings = allListings.filter((l) => listingMatchesState(l, selectedState));

    if (type) {
      listings = listings.filter((l) => normalizeListing(l).services.includes(type));
    }

    if (query) {
      listings = listings.filter((l) => {
        const data = normalizeListing(l);
        const haystack = [
          data.businessName,
          data.description,
          data.homeCity,
          formatStatesList(data.statesCertified),
          getStateName(data.homeState),
          data.email,
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      });
    }

    listingsEl.innerHTML = '';
    const count = listings.length;
    const stateName = getStateName(selectedState);
    resultsCount.textContent = count === 1
      ? `1 pilot car in ${stateName}`
      : `${count} pilot cars in ${stateName}`;

    if (count === 0) {
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    listings.forEach((listing) => {
      listingsEl.appendChild(renderListingCard(listing));
    });
  }

  backBtn.addEventListener('click', showMap);
  searchInput.addEventListener('input', renderListings);
  typeFilter.addEventListener('change', renderListings);

  await loadListings();
  await loadMap();

  const hash = window.location.hash.replace('#', '').toUpperCase();
  if (hash && US_STATES.includes(hash)) {
    selectState(hash);
  }
});
