function initMapZoom({ container, svg, onTransform }) {
  if (!container || !svg) return null;

  const base = { x: 0, y: 0, w: 960, h: 600 };
  const aspect = base.h / base.w;
  const minWidth = 180;
  const maxWidth = 960;

  const viewBox = { ...base };
  let dragging = false;
  let dragMoved = false;
  let dragStart = null;

  function clampViewBox() {
    viewBox.w = Math.min(maxWidth, Math.max(minWidth, viewBox.w));
    viewBox.h = viewBox.w * aspect;

    const maxX = base.w - viewBox.w;
    const maxY = base.h - viewBox.h;
    viewBox.x = Math.min(base.x, Math.max(base.x + maxX, viewBox.x));
    viewBox.y = Math.min(base.y, Math.max(base.y + maxY, viewBox.y));
  }

  function applyViewBox() {
    clampViewBox();
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
    container.classList.toggle('is-zoomed', viewBox.w < maxWidth - 1);
    if (onTransform) onTransform(viewBox);
  }

  function zoomAt(factor, clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const mx = (clientX - rect.left) / rect.width;
    const my = (clientY - rect.top) / rect.height;
    const nextW = viewBox.w * factor;
    const nextH = nextW * aspect;
    const dx = (viewBox.w - nextW) * mx;
    const dy = (viewBox.h - nextH) * my;

    viewBox.x += dx;
    viewBox.y += dy;
    viewBox.w = nextW;
    viewBox.h = nextH;
    applyViewBox();
  }

  function reset() {
    viewBox.x = base.x;
    viewBox.y = base.y;
    viewBox.w = base.w;
    viewBox.h = base.h;
    applyViewBox();
  }

  function zoomIn() {
    const rect = svg.getBoundingClientRect();
    zoomAt(0.8, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function zoomOut() {
    const rect = svg.getBoundingClientRect();
    zoomAt(1.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function onWheel(event) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 0.85 : 1.18;
    zoomAt(factor, event.clientX, event.clientY);
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    if (event.target.closest('.map-pin, .state')) return;

    dragging = true;
    dragMoved = false;
    dragStart = { x: event.clientX, y: event.clientY, vx: viewBox.x, vy: viewBox.y };
    container.setPointerCapture(event.pointerId);
    container.classList.add('is-dragging');
  }

  function onPointerMove(event) {
    if (!dragging || !dragStart) return;

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dxPx = event.clientX - dragStart.x;
    const dyPx = event.clientY - dragStart.y;

    if (Math.abs(dxPx) > 4 || Math.abs(dyPx) > 4) dragMoved = true;

    const dx = (dxPx / rect.width) * viewBox.w;
    const dy = (dyPx / rect.height) * viewBox.h;

    viewBox.x = dragStart.vx - dx;
    viewBox.y = dragStart.vy - dy;
    applyViewBox();
  }

  function onPointerUp(event) {
    if (!dragging) return;
    const moved = dragMoved;
    dragging = false;
    dragStart = null;
    container.classList.remove('is-dragging');
    try {
      container.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      dragMoved = false;
    }, moved ? 120 : 0);
  }

  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);

  const zoomInBtn = document.getElementById('map-zoom-in');
  const zoomOutBtn = document.getElementById('map-zoom-out');
  const resetBtn = document.getElementById('map-zoom-reset');

  if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
  if (resetBtn) resetBtn.addEventListener('click', reset);

  applyViewBox();

  return {
    reset,
    zoomIn,
    zoomOut,
    zoomToState(svgEl, stateCode) {
      const path = svgEl?.querySelector(`#state-${stateCode?.toUpperCase()}`);
      if (!path) return;
      try {
        const box = path.getBBox();
        const pad = Math.max(box.width, box.height) * 0.35;
        viewBox.x = Math.max(base.x, box.x - pad);
        viewBox.y = Math.max(base.y, box.y - pad);
        viewBox.w = Math.min(maxWidth, box.width + pad * 2);
        viewBox.h = viewBox.w * aspect;
        applyViewBox();
      } catch {
        /* ignore */
      }
    },
    wasDragged: () => dragMoved,
  };
}