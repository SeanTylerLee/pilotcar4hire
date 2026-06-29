const MAP_PROJECTION = {
  continental: { minLon: -125, maxLon: -66.4, minLat: 24, maxLat: 49.6, width: 960, height: 600 },
  AK: { minLon: -180, maxLon: -129, minLat: 51, maxLat: 72, width: 280, height: 200, tx: 20, ty: 420, scale: 0.55 },
  HI: { minLon: -161, maxLon: -154, minLat: 18, maxLat: 23, width: 200, height: 130, tx: 280, ty: 500, scale: 0.9 },
};

const GEOCODE_CACHE_KEY = 'pc4h_geocode_v1';

function readGeocodeCache() {
  try {
    return JSON.parse(sessionStorage.getItem(GEOCODE_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeGeocodeCache(cache) {
  try {
    sessionStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota errors */
  }
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function projectLonLat(lon, lat, stateCode) {
  const code = stateCode?.toUpperCase();
  let cfg = MAP_PROJECTION.continental;

  if (code === 'AK') cfg = MAP_PROJECTION.AK;
  if (code === 'HI') cfg = MAP_PROJECTION.HI;

  const x = ((lon - cfg.minLon) / (cfg.maxLon - cfg.minLon)) * cfg.width;
  const y = ((cfg.maxLat - lat) / (cfg.maxLat - cfg.minLat)) * cfg.height;

  if (cfg.scale) {
    return { x: cfg.tx + x * cfg.scale, y: cfg.ty + y * cfg.scale };
  }

  return { x, y };
}

function getStatePath(svg, stateCode) {
  if (!svg || !stateCode) return null;
  return svg.querySelector(`#state-${stateCode.toUpperCase()}`);
}

function fallbackCoords(svg, listing, index) {
  const data = normalizeListing(listing);
  const stateCode = data.homeState?.toUpperCase();
  const path = getStatePath(svg, stateCode);
  if (!path) return null;

  let bbox;
  try {
    bbox = path.getBBox();
  } catch {
    return null;
  }
  const seed = hashString(`${data.homeCity}|${data.businessName}|${index}`);
  const angle = (seed % 360) * (Math.PI / 180);
  const radius = 6 + (seed % 5) * 3;
  const cx = bbox.x + bbox.width * (0.35 + ((seed >> 3) % 30) / 100);
  const cy = bbox.y + bbox.height * (0.35 + ((seed >> 5) % 30) / 100);

  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
    approximate: true,
  };
}

async function geocodeHomeCity(city, stateCode) {
  const cityTrim = city?.trim();
  const state = stateCode?.toUpperCase();
  if (!cityTrim || !state) return null;

  const cacheKey = `${cityTrim.toLowerCase()}|${state}`;
  const cache = readGeocodeCache();
  if (cache[cacheKey]) return cache[cacheKey];

  const stateName = getStateName(state);
  const query = `${cityTrim}, ${stateName}, USA`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const results = await res.json();
    if (!results?.length) return null;

    const coords = {
      lon: Number(results[0].lon),
      lat: Number(results[0].lat),
      approximate: false,
    };

    cache[cacheKey] = coords;
    writeGeocodeCache(cache);
    return coords;
  } catch {
    return null;
  }
}

async function resolvePinCoords(svg, listing, index) {
  const data = normalizeListing(listing);
  const geocoded = await geocodeHomeCity(data.homeCity, data.homeState);

  if (geocoded && Number.isFinite(geocoded.lon) && Number.isFinite(geocoded.lat)) {
    const projected = projectLonLat(geocoded.lon, geocoded.lat, data.homeState);
    return { ...projected, approximate: false };
  }

  return fallbackCoords(svg, listing, index);
}

function ensurePinsLayer(svg) {
  let layer = svg.querySelector('.map-pins');
  if (!layer) {
    layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    layer.setAttribute('class', 'map-pins');
    layer.setAttribute('aria-hidden', 'false');
    svg.appendChild(layer);
  }
  return layer;
}

function clearMapPins(svg) {
  const layer = svg?.querySelector('.map-pins');
  if (layer) layer.textContent = '';
}

async function renderMapPins(svg, listings, handlers = {}) {
  if (!svg) return;

  clearMapPins(svg);
  const layer = ensurePinsLayer(svg);
  const normalized = (listings || [])
    .map(normalizeListing)
    .filter((l) => l?.homeState && l?.homeCity?.trim());

  if (!normalized.length) return;

  const coordsList = await Promise.all(
    normalized.map((listing, index) => resolvePinCoords(svg, listing, index)),
  );

  normalized.forEach((data, index) => {
    const coords = coordsList[index];
    if (!coords) return;

    const pin = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    pin.setAttribute('class', 'map-pin');
    pin.setAttribute('role', 'button');
    pin.setAttribute('tabindex', '0');
    pin.dataset.state = data.homeState.toUpperCase();
    pin.dataset.listingId = data.id || '';
    if (coords.approximate) pin.classList.add('is-approximate');

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${data.businessName} — ${formatHomeLocation(data.homeCity, data.homeState)}`;
    pin.appendChild(title);

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('class', 'map-pin-dot');
    dot.setAttribute('cx', coords.x.toFixed(2));
    dot.setAttribute('cy', coords.y.toFixed(2));
    dot.setAttribute('r', '6');
    pin.appendChild(dot);

    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('class', 'map-pin-ring');
    ring.setAttribute('cx', coords.x.toFixed(2));
    ring.setAttribute('cy', coords.y.toFixed(2));
    ring.setAttribute('r', '10');
    pin.appendChild(ring);

    const activate = (event) => {
      if (handlers.onPinActivate) handlers.onPinActivate(event, data, pin);
    };

    pin.addEventListener('click', activate);
    pin.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate(event);
      }
    });

    if (handlers.onPinHover) {
      pin.addEventListener('mouseenter', (event) => handlers.onPinHover(event, data, pin));
      pin.addEventListener('focus', (event) => handlers.onPinHover(event, data, pin));
      pin.addEventListener('mouseleave', handlers.onPinLeave);
      pin.addEventListener('blur', handlers.onPinLeave);
    }

    layer.appendChild(pin);
  });
}