function getBrowsePageContext() {
  const path = window.location.pathname;
  const isHome = path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('index.html');
  const isStatePage = /\/state\.html$/i.test(path) || path.endsWith('state.html');
  const params = new URLSearchParams(window.location.search);
  const queryState = params.get('state')?.toUpperCase();
  const lockedState = isStatePage && queryState && US_STATES.includes(queryState) ? queryState : null;

  return {
    isHomeBrowsePage: isHome,
    isStatePage,
    lockedState,
    browseBasePath() {
      if (isHome) return 'index.html';
      if (lockedState) return `state.html?state=${lockedState}`;
      return 'index.html';
    },
  };
}

function isHomeBrowsePage() {
  return getBrowsePageContext().isHomeBrowsePage;
}

function browseBasePath() {
  return getBrowsePageContext().browseBasePath();
}

runWhenReady(async () => {
  const pageContext = getBrowsePageContext();

  if (pageContext.isStatePage && !pageContext.lockedState) {
    window.location.replace('pilot-cars.html');
    return;
  }

  const navKey = pageContext.isStatePage ? 'pilot-cars' : (isHomeBrowsePage() ? 'index' : 'browse');
  initNav(navKey);

  const mapView = document.getElementById('map-view');
  const listingsView = document.getElementById('listings-view');
  const mapStage = document.getElementById('map-stage');
  const mapContainer = document.getElementById('us-map-container');
  const mapError = document.getElementById('map-error');
  const mapTooltip = document.getElementById('map-tooltip');
  const pinDetail = document.getElementById('map-pin-detail');
  const pinDetailContent = document.getElementById('map-pin-detail-content');
  const pinDetailClose = document.getElementById('map-pin-detail-close');
  const backBtn = document.getElementById('back-to-map');
  const browseTitle = document.getElementById('browse-title');
  const browseSubtitle = document.getElementById('browse-subtitle');
  const listingsEl = document.getElementById('listings');
  const emptyState = document.getElementById('empty-state');
  const resultsCount = document.getElementById('results-count');
  const searchInput = document.getElementById('search-input');
  const mapFilterSummary = document.getElementById('map-filter-summary');
  const mapLegendText = document.getElementById('map-legend-text');
  const mapLoadingOverlay = document.getElementById('map-loading-overlay');
  const mapZoomIn = document.getElementById('map-zoom-in');
  const mapZoomOut = document.getElementById('map-zoom-out');
  const mapZoomReset = document.getElementById('map-zoom-reset');
  const mapFiltersEl = document.getElementById('map-filters');
  const listingsFiltersEl = document.getElementById('listings-service-filters');
  const heroTitle = document.getElementById('hero-title');
  const heroLead = document.getElementById('hero-lead');

  if (pageContext.isStatePage && pageContext.lockedState) {
    const stateName = getStateName(pageContext.lockedState);
    if (typeof applyStatePageSeo === 'function') {
      applyStatePageSeo(pageContext.lockedState);
    } else {
      document.title = `Pilot Cars in ${stateName} | US Pilot Car Directory`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.content = `Find certified pilot cars in ${stateName}. Browse lead, chase, hi-pole, route survey, and flagger escorts — contact drivers directly.`;
      }
    }
    if (heroTitle) heroTitle.innerHTML = `Pilot cars in <span class="hero-accent">${stateName}</span>`;
    if (heroLead) heroLead.textContent = `Browse ${stateName} pilot cars in our nationwide directory. Tap a dot on the map or scroll listings below.`;
    if (backBtn) {
      backBtn.textContent = '← All states';
      backBtn.classList.add('back-link--directory');
    }
    document.body.classList.add('page-state-landing');
  }

  let selectedState = pageContext.lockedState || null;
  let allListings = [];
  let mapSvg = null;
  let mapZoom = null;
  let activePin = null;
  let mapServiceFilter = '';
  let pinHandlers = null;
  let pinRefreshTimer = null;

  function getMapSvg() {
    return mapContainer?.querySelector('svg.us-map') || null;
  }

  function getFilteredListings(serviceCode = mapServiceFilter) {
    if (!serviceCode) return allListings;
    return allListings.filter((listing) => listingOffersService(listing, serviceCode));
  }

  function clearActivePin() {
    if (activePin) {
      activePin.classList.remove('is-selected');
      activePin = null;
    }
  }

  function isPinDetailOpen() {
    return pinDetail && !pinDetail.hidden;
  }

  function closePinDetail() {
    if (pinDetail) pinDetail.hidden = true;
    if (pinDetailContent) pinDetailContent.innerHTML = '';
    clearActivePin();
    hideTooltip();
  }

  function showPinDetail(listing, pinEl) {
    if (!pinDetail || !pinDetailContent) return;

    clearActivePin();
    if (pinEl) {
      activePin = pinEl;
      activePin.classList.add('is-selected');
    }

    const data = normalizeListing(listing);
    pinDetailContent.innerHTML = '';
    pinDetailContent.appendChild(renderListingCard(listing, { showContact: true, showReport: true }));

    const footer = document.createElement('p');
    footer.className = 'map-pin-detail-footer';
    const stateName = getStateName(data.homeState);
    const stateHref = `state.html?state=${data.homeState}`;
    footer.innerHTML = `<a href="${stateHref}" class="map-pin-detail-link">View all pilot cars in ${stateName} →</a>`;
    pinDetailContent.appendChild(footer);

    pinDetail.hidden = false;
    hideTooltip();
    pinDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function setMapLoading(loading) {
    if (mapStage) {
      mapStage.classList.toggle('is-loading', loading);
      mapStage.setAttribute('aria-busy', loading ? 'true' : 'false');
    }
    if (mapLoadingOverlay) {
      mapLoadingOverlay.hidden = !loading;
    }
    [mapZoomIn, mapZoomOut, mapZoomReset].forEach((btn) => {
      if (btn) btn.disabled = loading;
    });
  }

  function updateMapLegend() {
    if (!mapLegendText) return;
    const listings = getFilteredListings();
    const count = listings.length;
    const filterLabel = mapServiceFilter ? getServiceLabel(mapServiceFilter) : null;
    const pinLabel = count === 1 ? '1 pilot car on the map' : `${count} pilot cars on the map`;
    if (!count) {
      mapLegendText.textContent = filterLabel
        ? `No pilot cars offering ${filterLabel} yet`
        : 'No pilot cars listed yet';
      return;
    }
    mapLegendText.textContent = filterLabel
      ? `${pinLabel} (${filterLabel}) — green dot = home base`
      : `${pinLabel} — green dot = home base`;
  }

  function buildPinHandlers() {
    return {
      onPinHover: showPinTooltip,
      onPinLeave: hideTooltip,
      onPinActivate: (event, listing, pinEl) => {
        event.stopPropagation();
        const coords = pinEl?.dataset?.pinX != null
          ? { x: Number(pinEl.dataset.pinX), y: Number(pinEl.dataset.pinY) }
          : null;
        if (coords && mapZoom?.zoomToPoint) {
          mapZoom.zoomToPoint(coords.x, coords.y, 42);
        }
        showPinDetail(listing, pinEl);
      },
      onClusterActivate: (event, entries, pinEl) => {
        event.stopPropagation();
        if (!entries?.length || !mapZoom?.zoomToBounds) return;
        const xs = entries.map((e) => e.coords.x);
        const ys = entries.map((e) => e.coords.y);
        mapZoom.zoomToBounds(
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs),
          Math.max(...ys),
        );
        if (typeof refreshMapPinDisplay === 'function') {
          refreshMapPinDisplay(mapSvg, mapZoom.getViewBoxWidth(), pinHandlers);
        }
      },
    };
  }

  function refreshPinsFromZoom() {
    if (!mapSvg) return;
    const width = mapZoom?.getViewBoxWidth?.() ?? 960;

    if (typeof scaleMapPins === 'function') {
      scaleMapPins(mapSvg, width);
    }

    window.clearTimeout(pinRefreshTimer);
    pinRefreshTimer = window.setTimeout(() => {
      if (typeof refreshMapPinDisplay !== 'function') return;
      refreshMapPinDisplay(mapSvg, width, pinHandlers);
    }, 150);
  }

  async function updateMapPins() {
    if (typeof renderMapPins !== 'function') return;

    mapSvg = getMapSvg();
    if (!mapSvg || mapView.hidden) return;

    pinHandlers = buildPinHandlers();
    const listings = getFilteredListings();
    const viewBoxWidth = mapZoom?.getViewBoxWidth?.() ?? 960;

    try {
      await renderMapPins(mapSvg, listings, pinHandlers, {
        viewBoxWidth,
        onCoordsRefined: refreshPinsFromZoom,
      });
      updateMapLegend();
    } catch (err) {
      console.error('Map pins failed:', err);
    }
  }

  function showPinTooltip(event, listing) {
    if (isPinDetailOpen()) return;
    const data = normalizeListing(listing);
    mapTooltip.textContent = `${data.businessName} — ${formatHomeLocation(data.homeCity, data.homeState)}`;
    mapTooltip.hidden = false;
    moveTooltip(event);
  }

  function countListingsForState(stateCode, serviceCode = mapServiceFilter) {
    return getFilteredListings(serviceCode).filter((l) => listingMatchesState(l, stateCode)).length;
  }

  function getMapPaths() {
    return mapContainer ? [...mapContainer.querySelectorAll('.state')] : [];
  }

  function updateMapHighlights() {
    const paths = getMapPaths();
    if (!paths.length) return;
    const filterActive = Boolean(mapServiceFilter);

    paths.forEach((path) => {
      const code = path.dataset.state;
      const totalCount = allListings.filter((l) => listingMatchesState(l, code)).length;
      const filteredCount = countListingsForState(code);
      path.classList.toggle('has-listings', totalCount > 0);
      path.classList.toggle('has-filtered-listings', filteredCount > 0);
      path.classList.toggle('is-filtered-out', filterActive && totalCount > 0 && filteredCount === 0);

      const label = filterActive && mapServiceFilter
        ? `${filteredCount} offering ${getServiceLabel(mapServiceFilter)}`
        : (filteredCount === 1 ? '1 pilot car' : `${filteredCount} pilot cars`);
      path.setAttribute('aria-label', `${path.dataset.name}: ${label}`);
    });
  }

  function bindMapPaths() {
    getMapPaths().forEach((path) => {
      path.setAttribute('role', 'button');
      path.setAttribute('tabindex', '0');
      path.style.cursor = 'pointer';
      path.addEventListener('click', (event) => {
        if (mapZoom?.wasDragged?.()) return;
        event.stopPropagation();
        closePinDetail();
        if (pageContext.isStatePage && pageContext.lockedState) {
          mapZoom?.zoomToState?.(mapSvg, pageContext.lockedState);
          listingsView?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        selectState(path.dataset.state);
      });
      path.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          closePinDetail();
          if (pageContext.isStatePage && pageContext.lockedState) {
            mapZoom?.zoomToState?.(mapSvg, pageContext.lockedState);
            return;
          }
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
    mapSvg = getMapSvg();

    if (typeof initMapZoom === 'function' && mapStage && mapSvg) {
      mapZoom = initMapZoom({
        container: mapStage,
        svg: mapSvg,
        onTransform: () => refreshPinsFromZoom(),
      });
    }

    bindMapPaths();
    updateMapHighlights();

    if (pageContext.lockedState && mapZoom?.zoomToState) {
      mapZoom.zoomToState(mapSvg, pageContext.lockedState);
    }
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
    updateMapLegend();
    await updateMapPins();
    if (selectedState) renderListings();
  }

  function showTooltip(e, path) {
    if (isPinDetailOpen()) return;
    const count = countListingsForState(path.dataset.state);
    const filterLabel = mapServiceFilter ? getServiceLabel(mapServiceFilter) : null;
    let label;
    if (mapServiceFilter) {
      label = count === 1
        ? `1 offering ${filterLabel}`
        : `${count} offering ${filterLabel}`;
    } else {
      label = count === 1 ? '1 pilot car' : `${count} pilot cars`;
    }
    mapTooltip.textContent = `${path.dataset.name} — ${label}`;
    mapTooltip.hidden = false;
    moveTooltip(e);
  }

  function moveTooltip(e) {
    const panel = mapStage || mapContainer?.closest('.map-panel');
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

  function updateFilterSummary() {
    if (!mapFilterSummary) return;
    mapFilterSummary.textContent = mapServiceFilter
      ? `Showing ${getServiceLabel(mapServiceFilter)} escorts`
      : 'All escort types';
  }

  function syncServiceFilterChips() {
    document.querySelectorAll('[data-service-filter-group]').forEach((group) => {
      group.querySelectorAll('.service-filter-chip').forEach((chip) => {
        const active = chip.dataset.service === mapServiceFilter
          || (!mapServiceFilter && chip.dataset.service === '');
        chip.classList.toggle('is-active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    });
  }

  function setMapServiceFilter(value) {
    mapServiceFilter = value || '';
    syncServiceFilterChips();
    updateFilterSummary();
    updateMapHighlights();
    updateMapLegend();
    void updateMapPins();
    if (selectedState) renderListings();
  }

  function buildServiceFilterGroup(container) {
    if (!container) return;

    const chips = [
      { value: '', label: 'All' },
      ...LISTING_SERVICES.map((s) => ({ value: s.value, label: s.label })),
    ];

    container.innerHTML = '';
    chips.forEach((chip) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'service-filter-chip';
      btn.dataset.service = chip.value;
      btn.textContent = chip.label;
      btn.setAttribute('aria-pressed', chip.value === mapServiceFilter ? 'true' : 'false');
      if (chip.value === mapServiceFilter) btn.classList.add('is-active');
      btn.addEventListener('click', () => setMapServiceFilter(chip.value));
      container.appendChild(btn);
    });
  }

  function buildMapFilters() {
    buildServiceFilterGroup(mapFiltersEl);
    buildServiceFilterGroup(listingsFiltersEl);
    updateFilterSummary();
  }

  function selectState(stateCode) {
    if (!stateCode) return;
    if (pageContext.isStatePage && pageContext.lockedState) {
      selectedState = pageContext.lockedState;
      renderListings();
      return;
    }

    selectedState = stateCode.toUpperCase();
    closePinDetail();
    mapView.hidden = true;
    listingsView.hidden = false;

    const name = getStateName(selectedState);
    if (browseTitle) browseTitle.textContent = name;
    if (browseSubtitle) browseSubtitle.textContent = `Pilot cars based in ${name}. Contact them directly.`;

    searchInput.value = '';
    renderListings();
    history.replaceState(null, '', `#${selectedState}`);
    listingsView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function showMap() {
    if (pageContext.isStatePage) {
      window.location.href = 'pilot-cars.html';
      return;
    }

    selectedState = null;
    closePinDetail();
    listingsView.hidden = true;
    mapView.hidden = false;
    if (browseTitle) browseTitle.textContent = 'Find a pilot car';
    if (browseSubtitle) browseSubtitle.textContent = '';
    history.replaceState(null, '', browseBasePath());
    mapZoom?.reset?.();
    void updateMapPins();
    updateMapLegend();
  }

  function renderListings() {
    if (!selectedState) return;

    const query = searchInput.value.trim().toLowerCase();
    const type = mapServiceFilter;

    let listings = getFilteredListings().filter((l) => listingMatchesState(l, selectedState));

    if (type) {
      listings = listings.filter((l) => listingOffersService(l, type));
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
    const filterNote = mapServiceFilter
      ? ` offering ${getServiceLabel(mapServiceFilter)}`
      : '';
    resultsCount.textContent = count === 1
      ? `1 pilot car in ${stateName}${filterNote}`
      : `${count} pilot cars in ${stateName}${filterNote}`;

    if (count === 0) {
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    listings.forEach((listing) => {
      listingsEl.appendChild(renderListingCard(listing, { showContact: true, showReport: true }));
    });
  }

  function initStateLandingLayout() {
    if (!pageContext.isStatePage || !pageContext.lockedState) return;

    mapView.hidden = false;
    listingsView.hidden = false;

    const name = getStateName(pageContext.lockedState);
    if (browseTitle) browseTitle.textContent = `${name} listings`;
    if (browseSubtitle) {
      browseSubtitle.textContent = 'Contact pilot car escorts based in this state.';
    }
  }

  buildMapFilters();

  if (pinDetailClose) pinDetailClose.addEventListener('click', closePinDetail);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePinDetail();
  });

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (pageContext.isStatePage) {
        window.location.href = 'pilot-cars.html';
        return;
      }
      showMap();
    });
  }

  searchInput.addEventListener('input', renderListings);

  initStateLandingLayout();
  setMapLoading(true);

  try {
    await loadMap();
    await loadListings();
  } catch (err) {
    console.error(err);
    showMapError('Map failed to load. Refresh the page or check that images/us-map.svg is deployed.');
  } finally {
    setMapLoading(false);
  }

  if (pageContext.lockedState) {
    selectedState = pageContext.lockedState;
    renderListings();
  } else {
    const hash = window.location.hash.replace('#', '').toUpperCase();
    if (hash && US_STATES.includes(hash) && getMapPaths().length) {
      selectState(hash);
    }
  }
});