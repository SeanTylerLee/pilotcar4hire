function initMapZoom({ container, svg, onTransform }) {
  if (!container || !svg) return null;

  const base = { x: 0, y: 0, w: 960, h: 600 };
  const aspect = base.h / base.w;
  // Smaller minWidth = deeper zoom (~44× at 22 vs ~6× at 160). Helps small states (RI, DE, DC).
  const minWidth = 22;
  const maxWidth = 960;

  const viewBox = { ...base };
  let dragging = false;
  let dragMoved = false;
  let dragStart = null;
  let pinchStart = null;
  let activePointers = 0;

  function clampViewBox() {
    viewBox.w = Math.min(maxWidth, Math.max(minWidth, viewBox.w));
    viewBox.h = viewBox.w * aspect;

    const maxX = base.w - viewBox.w;
    const maxY = base.h - viewBox.h;
    viewBox.x = Math.min(base.x + maxX, Math.max(base.x, viewBox.x));
    viewBox.y = Math.min(base.y + maxY, Math.max(base.y, viewBox.y));
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

  function zoomIn(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    zoomAt(0.75, clientX ?? rect.left + rect.width / 2, clientY ?? rect.top + rect.height / 2);
  }

  function zoomOut(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    zoomAt(1.33, clientX ?? rect.left + rect.width / 2, clientY ?? rect.top + rect.height / 2);
  }

  function isInteractionLocked() {
    return container.classList.contains('is-loading');
  }

  function isBlockedTarget(target) {
    return Boolean(target?.closest?.(
      '.map-pin, .map-zoom-controls, button, a',
    ));
  }

  function touchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function touchCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  function onWheel(event) {
    if (isInteractionLocked()) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 0.82 : 1.22;
    zoomAt(factor, event.clientX, event.clientY);
  }

  function onPointerDown(event) {
    if (isInteractionLocked()) return;
    if (pinchStart) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (isBlockedTarget(event.target)) return;

    activePointers += 1;
    if (activePointers > 1) {
      dragging = false;
      dragStart = null;
      return;
    }

    dragging = true;
    dragMoved = false;
    dragStart = { x: event.clientX, y: event.clientY, vx: viewBox.x, vy: viewBox.y };
    container.setPointerCapture(event.pointerId);
    container.classList.add('is-dragging');
  }

  function onPointerMove(event) {
    if (pinchStart) return;
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

  function endDrag(event) {
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

  function onPointerUp(event) {
    activePointers = Math.max(0, activePointers - 1);
    endDrag(event);
  }

  function onTouchStart(event) {
    if (isInteractionLocked()) return;
    if (event.touches.length === 2) {
      event.preventDefault();
      pinchStart = {
        distance: touchDistance(event.touches),
        center: touchCenter(event.touches),
        viewBox: { ...viewBox },
      };
      dragging = false;
      dragStart = null;
      dragMoved = true;
      container.classList.remove('is-dragging');
    }
  }

  function onTouchMove(event) {
    if (isInteractionLocked()) return;
    if (!pinchStart || event.touches.length !== 2) return;
    event.preventDefault();

    const distance = touchDistance(event.touches);
    const center = touchCenter(event.touches);
    if (!distance || !pinchStart.distance) return;

    const factor = pinchStart.distance / distance;
    zoomAt(factor, center.x, center.y);
    pinchStart.distance = distance;
  }

  function onTouchEnd(event) {
    if (event.touches.length < 2) {
      pinchStart = null;
      activePointers = event.touches.length;
    }
    if (event.touches.length === 0) {
      window.setTimeout(() => {
        dragMoved = false;
      }, 120);
    }
  }

  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);
  container.addEventListener('touchstart', onTouchStart, { passive: false });
  container.addEventListener('touchmove', onTouchMove, { passive: false });
  container.addEventListener('touchend', onTouchEnd);
  container.addEventListener('touchcancel', onTouchEnd);

  const zoomInBtn = document.getElementById('map-zoom-in');
  const zoomOutBtn = document.getElementById('map-zoom-out');
  const resetBtn = document.getElementById('map-zoom-reset');

  if (zoomInBtn) zoomInBtn.addEventListener('click', () => { if (!isInteractionLocked()) zoomIn(); });
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => { if (!isInteractionLocked()) zoomOut(); });
  if (resetBtn) resetBtn.addEventListener('click', () => { if (!isInteractionLocked()) reset(); });

  applyViewBox();

  function zoomToPoint(x, y, targetWidth = 42) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    viewBox.w = Math.max(minWidth, Math.min(maxWidth, targetWidth));
    viewBox.h = viewBox.w * aspect;
    viewBox.x = x - viewBox.w / 2;
    viewBox.y = y - viewBox.h / 2;
    applyViewBox();
  }

  function zoomToBounds(minX, minY, maxX, maxY, padding = 1.35) {
    const width = (maxX - minX) * padding;
    const height = (maxY - minY) * padding;
    const targetW = Math.max(width, height / aspect);
    viewBox.w = Math.max(minWidth, Math.min(maxWidth, targetW));
    viewBox.h = viewBox.w * aspect;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    viewBox.x = cx - viewBox.w / 2;
    viewBox.y = cy - viewBox.h / 2;
    applyViewBox();
  }

  return {
    reset,
    zoomIn,
    zoomOut,
    getViewBoxWidth: () => viewBox.w,
    zoomToPoint,
    zoomToBounds,
    zoomToState(svgEl, stateCode) {
      const path = svgEl?.querySelector(`#state-${stateCode?.toUpperCase()}`);
      if (!path) return;
      try {
        const box = path.getBBox();
        const pad = Math.max(box.width, box.height) * 0.28;
        const targetW = box.width + pad * 2;
        viewBox.w = Math.min(maxWidth, Math.max(minWidth, targetW));
        viewBox.h = viewBox.w * aspect;
        viewBox.x = box.x + box.width / 2 - viewBox.w / 2;
        viewBox.y = box.y + box.height / 2 - viewBox.h / 2;
        applyViewBox();
      } catch {
        /* ignore */
      }
    },
    wasDragged: () => dragMoved || Boolean(pinchStart),
  };
}