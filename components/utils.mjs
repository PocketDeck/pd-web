const DRAG_LAYER_ID = '__drag_layer__';

export function getDragLayer() {
  let dragLayer = document.getElementById(DRAG_LAYER_ID);
  if (!dragLayer) {
    dragLayer = document.createElement('div');
    dragLayer.id = DRAG_LAYER_ID;
    Object.assign(dragLayer.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: 9999,
    });
    document.body.appendChild(dragLayer);
  }
  return dragLayer;
}

export function makeDraggable(element) {
    if (element._draggable) return;
    element._draggable = true;
    let isDragging = false;
    let originalParent = element.parentNode;
    let originalNextSibling = element.nextSibling;

    const getPoint = (e) => (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;

    const onStart = (event) => {
        console.log('down');
        const point = getPoint(event);
        if (event.cancelable) event.preventDefault();

        const rect = element.getBoundingClientRect();
        element.style.width = `${rect.width}px`;
        element.style.height = `${rect.height}px`;

        isDragging = true;
        const dragLayer = getDragLayer();
        if (element.getAnimations) { element.getAnimations().forEach(a => a.cancel()); }
        moveWithAnimation(element, dragLayer, null, { animate: false });
        Object.assign(element.style, {
            position: 'absolute',
            left: `${point.clientX}px`,
            top: `${point.clientY}px`,
            transform: 'translate(-50%, -50%)',
        });
    };

    const onMove = (event) => {
        if (!isDragging) return;
        console.log('move');
        const point = getPoint(event);
        if (event.cancelable) event.preventDefault();
        if (element.getAnimations) { element.getAnimations().forEach(a => a.cancel()); }
        Object.assign(element.style, {
            left: `${point.clientX}px`,
            top: `${point.clientY}px`,
        });
    };

    const onEnd = () => {
        if (!isDragging) return;
        console.log('up');
        isDragging = false;
        if (element.getAnimations) { element.getAnimations().forEach(a => a.cancel()); }
        moveWithAnimation(element, originalParent, originalNextSibling);
        element.style.removeProperty('left');
        element.style.removeProperty('top');
        element.style.removeProperty('position');
        element.style.removeProperty('width');
        element.style.removeProperty('height');
        element.style.removeProperty('transform');
    };

    element.addEventListener('mousedown', onStart);
    element.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
}

export function moveWithAnimation(element, newParent, nextSibling, options = {}) {
    const { animate = true, duration = 160, easing = 'ease' } = options;
    const start = element.getBoundingClientRect();
    newParent.insertBefore(element, nextSibling);
    if (!animate) return null;
    const end = element.getBoundingClientRect();
    const delta = {
        x: end.left - start.left,
        y: end.top - start.top,
    };
    return element.animate([
        { transform: `translate(${delta.x}px, ${delta.y}px)` },
        { transform: 'translate(0, 0)' },
    ], {
        duration,
        easing,
    });
}