function isHomeBrowsePage() {
  const path = window.location.pathname;
  return path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('index.html');
}

function browseBasePath() {
  return isHomeBrowsePage() ? 'index.html' : 'browse.html';
}

runWhenReady(async () => {
  initNav(isHomeBrowsePage() ? 'index' : 'browse');

  const mapView = document.getElementById('map-view');
  const listingsView = document.getElementById('listings-view');
  const mapContainer = document.getElementById('us-map-container');
  const mapError = document.getElementById('map-error');
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
  let mapSvg = null;

  function getMapSvg() {
    return mapContainer?.querySelector('svg.us-map') || null;
  }

  async function updateMapPins() {
    if (typeof renderMapPins !== 'function') return;

    mapSvg = getMapSvg();
    if (!mapSvg || mapView.hidden) return;

    try {
      await renderMapPins(mapSvg, allListings, {
        onPinHover: showPinTooltip,
        onPinLeave: hideTooltip,
        onPinActivate: (_event, listing) => {
          selectState(listing.homeState);
        },
      });
    } catch (err) {
      console.error('Map pins failed:', err);
    }
  }

  function showPinTooltip(event, listing) {
    const data = normalizeListing(listing);
    mapTooltip.textContent = `${data.businessName} — ${formatHomeLocation(data.homeCity, data.homeState)}`;
    mapTooltip.hidden = false;
    moveTooltip(event);
  }

  function countListingsForState(stateCode) {
    return allListings.filter((l) => listingMatchesState(l, stateCode)).length;
  }

  function getMapPaths() {
    return mapContainer ? [...mapContainer.querySelectorAll('.state')] : [];
  }

  function updateMapHighlights() {
    const paths = getMapPaths();
    if (!paths.length) return;
    paths.forEach((path) => {
      const code = path.dataset.state;
      const count = countListingsForState(code);
      path.classList.toggle('has-listings', count > 0);
      path.setAttribute('aria-label', `${path.dataset.name}: ${count} pilot car${count === 1 ? '' : 's'}`);
    });
  }

  function bindMapPaths() {
    getMapPaths().forEach((path) => {
      path.setAttribute('role', 'button');
      path.setAttribute('tabindex', '0');
      path.style.cursor = 'pointer';
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
  }

  async function loadMap() {
    const mapUrl = new URL('images/us-map.svg', document.baseURI).href;
    const res = await fetch(mapUrl);
    if (!res.ok) throw new Error(`Map failed to load (${res.status}).`);

    const svgText = await res.text();
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error(parseError.textContent?.trim() || 'Map file is invalid.');
    }

    const svg = doc.documentElement;
    if (svg.localName !== 'svg') {
      throw new Error('Map file is invalid.');
    }

    svg.classList.add('us-map');
    mapContainer.innerHTML = '';
    mapContainer.appendChild(document.importNode(svg, true));

    bindMapPaths();
    updateMapHighlights();
    void updateMapPins();
  }

  function showMapError(message) {
    if (mapError) {
      mapError.textContent = message;
      mapError.hidden = false;
    }
  }

  async function loadListings() {
    try {
      allListings = await getAllListingsWithUsers();
    } catch (err) {
      console.error(err);
      allListings = [];
    }
    updateMapHighlights();
    void updateMapPins();
    if (selectedState) renderListings();
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
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const x = e?.clientX ?? rect.left + rect.width / 2;
    const y = e?.clientY ?? rect.top + rect.height / 2;
    mapTooltip.style.left = `${x - rect.left}px`;
    mapTooltip.style.top = `${y - rect.top - 12}px`;
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
    browseSubtitle.textContent = `Pilot cars based in ${name}. Contact them directly.`;

    searchInput.value = '';
    typeFilter.value = '';
    renderListings();
    history.replaceState(null, '', `#${selectedState}`);
    listingsView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function showMap() {
    selectedState = null;
    listingsView.hidden = true;
    mapView.hidden = false;
    browseTitle.textContent = 'Find a pilot car';
    browseSubtitle.textContent = 'Select a state on the map to view pilot cars based there. No account required.';
    history.replaceState(null, '', browseBasePath());
    await updateMapPins();
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

  backBtn.addEventListener('click', () => { showMap(); });
  searchInput.addEventListener('input', renderListings);
  typeFilter.addEventListener('change', renderListings);

  try {
    await loadMap();
  } catch (err) {
    console.error(err);
    showMapError('Map failed to load. Refresh the page or check that images/us-map.svg is deployed.');
  }

  void loadListings();

  const hash = window.location.hash.replace('#', '').toUpperCase();
  if (hash && US_STATES.includes(hash) && getMapPaths().length) {
    selectState(hash);
  }
});
