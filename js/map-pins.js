const MAP_PROJECTION = {
  continental: { minLon: -125, maxLon: -66.4, minLat: 24, maxLat: 49.6, width: 960, height: 600 },
  AK: { minLon: -180, maxLon: -129, minLat: 51, maxLat: 72, width: 280, height: 200, tx: 20, ty: 420, scale: 0.55 },
  HI: { minLon: -161, maxLon: -154, minLat: 18, maxLat: 23, width: 200, height: 130, tx: 280, ty: 500, scale: 0.9 },
};

const GEOCODE_CACHE_KEY = 'pc4h_geocode_v1';
const PIN_FILL = '#0d7a4e';
const PIN_FILL_APPROX = '#3d9e6a';
const CLUSTER_MIN_TOTAL = 12;
const CLUSTER_ZOOM_WIDTH = 130;
const PIN_BASE_VIEW_WIDTH = 960;

let pinRegistry = [];
let currentPinViewBoxWidth = PIN_BASE_VIEW_WIDTH;
let geocodeChain = Promise.resolve();
const GEOCODE_DELAY_MS = 1100;

function scheduleGeocode(task) {
  geocodeChain = geocodeChain
    .then(() => task())
    .then(() => new Promise((resolve) => { window.setTimeout(resolve, GEOCODE_DELAY_MS); }))
    .catch(() => undefined);
  return geocodeChain;
}

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
    /* ignore */
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

function isValidCoord(coords) {
  return coords
    && Number.isFinite(coords.x)
    && Number.isFinite(coords.y)
    && coords.x >= -40
    && coords.x <= 1000
    && coords.y >= -40
    && coords.y <= 640;
}

function waitForMapLayout() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
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

function stateCenterCoords(svg, stateCode) {
  const path = getStatePath(svg, stateCode);
  if (!path) return null;

  let bbox;
  try {
    bbox = path.getBBox();
  } catch {
    return null;
  }

  if (!bbox.width && !bbox.height) return null;

  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
    approximate: true,
  };
}

function fallbackCoords(svg, listing, index) {
  const data = normalizeListing(listing);
  const stateCode = data.homeState?.toUpperCase();
  const path = getStatePath(svg, stateCode);
  if (!path) return stateCenterCoords(svg, stateCode);

  let bbox;
  try {
    bbox = path.getBBox();
  } catch {
    return stateCenterCoords(svg, stateCode);
  }

  if (!bbox.width && !bbox.height) {
    return stateCenterCoords(svg, stateCode);
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
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const results = await res.json();
    if (!results?.length) return null;

    const lon = Number(results[0].lon);
    const lat = Number(results[0].lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

    const coords = { lon, lat, approximate: false };
    cache[cacheKey] = coords;
    writeGeocodeCache(cache);
    return coords;
  } catch {
    return null;
  }
}

function getPinScale(viewBoxWidth) {
  const width = viewBoxWidth ?? PIN_BASE_VIEW_WIDTH;
  return Math.min(1, width / PIN_BASE_VIEW_WIDTH);
}

function applyPinScale(pin, viewBoxWidth) {
  if (!pin) return;

  const scale = getPinScale(viewBoxWidth);
  const x = Number(pin.dataset.pinX);
  const y = Number(pin.dataset.pinY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  pin.dataset.pinScale = scale.toFixed(4);

  if (scale >= 0.999) {
    pin.removeAttribute('transform');
    return;
  }

  pin.setAttribute('transform', `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`);
}

function applyPinScales(svg, viewBoxWidth) {
  svg?.querySelectorAll('.map-pins > .map-pin').forEach((pin) => {
    applyPinScale(pin, viewBoxWidth);
  });
}

function setPinCoords(pin, coords) {
  if (!pin || !isValidCoord(coords)) return false;

  pin.dataset.pinX = coords.x.toFixed(2);
  pin.dataset.pinY = coords.y.toFixed(2);

  pin.querySelectorAll('circle').forEach((circle) => {
    circle.setAttribute('cx', coords.x.toFixed(2));
    circle.setAttribute('cy', coords.y.toFixed(2));
  });

  const dot = pin.querySelector('.map-pin-dot');
  if (dot) {
    dot.setAttribute('fill', coords.approximate ? PIN_FILL_APPROX : PIN_FILL);
  }

  if (coords.approximate) pin.setAttribute('class', 'map-pin is-approximate');
  else pin.setAttribute('class', 'map-pin');

  applyPinScale(pin, currentPinViewBoxWidth);
  return true;
}

function getPinCoords(pin) {
  const x = Number(pin?.dataset?.pinX);
  const y = Number(pin?.dataset?.pinY);
  return isValidCoord({ x, y }) ? { x, y } : null;
}

function createMapPin(listing, coords, handlers = {}) {
  const data = normalizeListing(listing);
  if (!isValidCoord(coords)) return null;

  const pin = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  pin.setAttribute('class', coords.approximate ? 'map-pin is-approximate' : 'map-pin');
  pin.setAttribute('role', 'button');
  pin.setAttribute('tabindex', '0');
  pin.dataset.state = data.homeState.toUpperCase();
  pin.dataset.listingId = data.id || '';

  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = `${data.businessName} — ${formatHomeLocation(data.homeCity, data.homeState)}`;
  pin.appendChild(title);

  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  hit.setAttribute('class', 'map-pin-hit');
  hit.setAttribute('r', '18');
  hit.setAttribute('fill', 'transparent');
  pin.appendChild(hit);

  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('class', 'map-pin-dot');
  dot.setAttribute('r', '7');
  dot.setAttribute('fill', coords.approximate ? PIN_FILL_APPROX : PIN_FILL);
  dot.setAttribute('stroke', '#ffffff');
  dot.setAttribute('stroke-width', '2');
  pin.appendChild(dot);

  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  ring.setAttribute('class', 'map-pin-ring');
  ring.setAttribute('r', '12');
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', 'rgba(13, 122, 78, 0.35)');
  ring.setAttribute('stroke-width', '2');
  pin.appendChild(ring);

  setPinCoords(pin, coords);

  const activate = (event) => {
    event.stopPropagation();
    if (handlers.onPinActivate) handlers.onPinActivate(event, listing, pin);
  };

  pin.addEventListener('click', activate);
  pin.addEventListener('mousedown', (event) => event.stopPropagation());
  pin.addEventListener('pointerdown', (event) => event.stopPropagation());
  pin.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(event);
    }
  });

  if (handlers.onPinHover) {
    pin.addEventListener('mouseenter', (event) => handlers.onPinHover(event, listing, pin));
    pin.addEventListener('focus', (event) => handlers.onPinHover(event, listing, pin));
    pin.addEventListener('mouseleave', handlers.onPinLeave);
    pin.addEventListener('blur', handlers.onPinLeave);
  }

  return pin;
}

function createClusterPin(entries, handlers = {}) {
  const xs = entries.map((e) => e.coords.x);
  const ys = entries.map((e) => e.coords.y);
  const x = xs.reduce((a, b) => a + b, 0) / entries.length;
  const y = ys.reduce((a, b) => a + b, 0) / entries.length;
  const count = entries.length;

  const pin = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  pin.setAttribute('class', 'map-pin map-pin-cluster');
  pin.setAttribute('role', 'button');
  pin.setAttribute('tabindex', '0');
  pin.dataset.pinX = x.toFixed(2);
  pin.dataset.pinY = y.toFixed(2);
  pin.dataset.clusterCount = String(count);

  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = `${count} pilot cars in this area`;
  pin.appendChild(title);

  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  hit.setAttribute('class', 'map-pin-hit');
  hit.setAttribute('cx', x.toFixed(2));
  hit.setAttribute('cy', y.toFixed(2));
  hit.setAttribute('r', '22');
  hit.setAttribute('fill', 'transparent');
  pin.appendChild(hit);

  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  ring.setAttribute('class', 'map-pin-cluster-bg');
  ring.setAttribute('cx', x.toFixed(2));
  ring.setAttribute('cy', y.toFixed(2));
  ring.setAttribute('r', '16');
  ring.setAttribute('fill', '#0d7a4e');
  ring.setAttribute('stroke', '#ffffff');
  ring.setAttribute('stroke-width', '2');
  pin.appendChild(ring);

  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('class', 'map-pin-cluster-label');
  label.setAttribute('x', x.toFixed(2));
  label.setAttribute('y', (y + 4).toFixed(2));
  label.setAttribute('text-anchor', 'middle');
  label.textContent = String(count);
  pin.appendChild(label);

  const activate = (event) => {
    event.stopPropagation();
    if (handlers.onClusterActivate) handlers.onClusterActivate(event, entries, pin);
  };

  pin.addEventListener('click', activate);
  pin.addEventListener('pointerdown', (event) => event.stopPropagation());
  pin.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(event);
    }
  });

  return pin;
}

async function refinePinCoords(svg, entry) {
  const data = normalizeListing(entry.listing);
  const geocoded = await geocodeHomeCity(data.homeCity, data.homeState);

  if (geocoded) {
    const projected = projectLonLat(geocoded.lon, geocoded.lat, data.homeState);
    if (isValidCoord(projected)) {
      entry.coords = { ...projected, approximate: false };
      if (entry.pinEl) setPinCoords(entry.pinEl, entry.coords);
      return;
    }
  }

  const fallback = fallbackCoords(svg, entry.listing, entry.index);
  if (fallback) {
    entry.coords = fallback;
    if (entry.pinEl) setPinCoords(entry.pinEl, entry.coords);
  }
}

function ensurePinsLayer(svg) {
  let layer = svg.querySelector('.map-pins');
  if (!layer) {
    layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    layer.setAttribute('class', 'map-pins');
    layer.setAttribute('aria-hidden', 'false');
    svg.appendChild(layer);
  } else {
    svg.appendChild(layer);
  }
  return layer;
}

function clearMapPins(svg) {
  const layer = svg?.querySelector('.map-pins');
  if (layer) layer.textContent = '';
}

function shouldClusterPins(viewBoxWidth, visibleCount) {
  return visibleCount >= CLUSTER_MIN_TOTAL && viewBoxWidth >= CLUSTER_ZOOM_WIDTH;
}

function clusterEntries(entries, viewBoxWidth) {
  const cell = Math.max(28, viewBoxWidth / 10);
  const buckets = new Map();

  entries.forEach((entry) => {
    const key = `${Math.floor(entry.coords.x / cell)}:${Math.floor(entry.coords.y / cell)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(entry);
  });

  const groups = [];
  buckets.forEach((items) => {
    if (items.length >= 2) groups.push({ type: 'cluster', entries: items });
    else groups.push({ type: 'pin', entry: items[0] });
  });
  return groups;
}

function paintMapPins(svg, entries, viewBoxWidth, handlers = {}) {
  clearMapPins(svg);
  if (!entries.length) return 0;

  currentPinViewBoxWidth = viewBoxWidth ?? PIN_BASE_VIEW_WIDTH;
  const layer = ensurePinsLayer(svg);
  let painted = 0;
  const useClusters = shouldClusterPins(viewBoxWidth, entries.length);
  const groups = useClusters ? clusterEntries(entries, viewBoxWidth) : entries.map((entry) => ({ type: 'pin', entry }));

  groups.forEach((group) => {
    if (group.type === 'cluster') {
      const pin = createClusterPin(group.entries, handlers);
      if (!pin) return;
      layer.appendChild(pin);
      applyPinScale(pin, currentPinViewBoxWidth);
      painted += 1;
      return;
    }

    const pin = createMapPin(group.entry.listing, group.entry.coords, handlers);
    if (!pin) return;
    group.entry.pinEl = pin;
    layer.appendChild(pin);
    applyPinScale(pin, currentPinViewBoxWidth);
    painted += 1;
  });

  return painted;
}

async function renderMapPins(svg, listings, handlers = {}, options = {}) {
  if (!svg) return 0;

  const normalized = (listings || [])
    .map(normalizeListing)
    .filter((l) => l?.homeState && l?.homeCity?.trim());

  pinRegistry = [];
  clearMapPins(svg);
  if (!normalized.length) return 0;

  await waitForMapLayout();

  pinRegistry = normalized.map((data, index) => {
    const listing = listings.find((row) => normalizeListing(row).id === data.id) || data;
    return {
      listing,
      index,
      coords: fallbackCoords(svg, listing, index),
      pinEl: null,
    };
  }).filter((entry) => isValidCoord(entry.coords));

  const viewBoxWidth = options.viewBoxWidth ?? 960;
  const painted = paintMapPins(svg, pinRegistry, viewBoxWidth, handlers);

  pinRegistry.forEach((entry) => {
    scheduleGeocode(() => refinePinCoords(svg, entry)).then(() => {
      if (typeof options.onCoordsRefined === 'function') {
        options.onCoordsRefined();
      }
    });
  });

  return painted;
}

function refreshMapPinDisplay(svg, viewBoxWidth, handlers = {}) {
  if (!svg || !pinRegistry.length) return 0;
  const width = viewBoxWidth ?? PIN_BASE_VIEW_WIDTH;
  const painted = paintMapPins(svg, pinRegistry, width, handlers);
  return painted;
}

function scaleMapPins(svg, viewBoxWidth) {
  currentPinViewBoxWidth = viewBoxWidth ?? PIN_BASE_VIEW_WIDTH;
  applyPinScales(svg, currentPinViewBoxWidth);
}

function getPinRegistry() {
  return pinRegistry;
}