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
    let wrapper = null;

    const getPoint = (e) => (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;

    const createWrapper = () => {
        const rect = element.getBoundingClientRect();
        wrapper = document.createElement('div');
        
        // Style the wrapper for positioning
        Object.assign(wrapper.style, {
            position: 'absolute',
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 10000,
        });
        
        // Keep original element's styles
        element.style.width = `${rect.width}px`;
        element.style.height = `${rect.height}px`;
        
        // Move element into wrapper
        wrapper.appendChild(element);
        return wrapper;
    };

    const onStart = (event) => {
        console.log('down', event);
        const point = getPoint(event);
        
        // For touch events, always prevent default to prevent scrolling
        if (event.type === 'touchstart') {
            event.preventDefault();
            event.stopPropagation();
        } else if (event.cancelable) {
            event.preventDefault();
        }
        
        //isDragging = true;
        const dragLayer = getDragLayer();
        
        // Create and position wrapper
        wrapper = createWrapper();
        if (event.type !== 'touchstart') dragLayer.appendChild(wrapper);
        
        // Position wrapper at touch point
        //updateWrapperPosition(point.clientX, point.clientY);
        
        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        
        // For touch devices, explicitly capture the touch
        if (event.type === 'touchstart' && event.touches.length > 0) {
            // Store the touch identifier to track this specific touch
            element._touchId = event.touches[0].identifier;
        }
        
        return true;
    };

    const updateWrapperPosition = (x, y) => {
        if (!wrapper) return;
        wrapper.style.left = `${x}px`;
        wrapper.style.top = `${y}px`;
    };

    const onMove = (event) => {
        console.log('move', event);
        if (!isDragging) return;
        
        // For touch events, make sure it's the same touch we started with
        if (event.type === 'touchmove') {
            if (element._touchId === undefined) return;
            
            // Find our touch in the list of changed touches
            const touch = Array.from(event.changedTouches).find(
                t => t.identifier === element._touchId
            );
            
            if (!touch) return;
            
            event.preventDefault();
            event.stopPropagation();
            
            updateWrapperPosition(touch.clientX, touch.clientY);
        } else {
            // Handle mouse events
            if (event.cancelable) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const point = getPoint(event);
            updateWrapperPosition(point.clientX, point.clientY);
        }
        
        return false;
    };

    const cleanup = () => {
        if (!wrapper) return;
        
        // Re-enable text selection
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        
        // Move element back to original position in DOM
        if (originalParent) {
            if (element.parentNode === wrapper) {
                originalParent.insertBefore(element, originalNextSibling);
            }
        }
        
        // Clean up wrapper
        if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
        }
        
        // Reset element styles
        element.style.removeProperty('width');
        element.style.removeProperty('height');
        
        wrapper = null;
    };

    const onEnd = (event) => {
        if (!isDragging) return;
        
        // For touch events, make sure it's the same touch we started with
        if (event && event.type.startsWith('touch')) {
            if (element._touchId === undefined) return;
            
            // Find our touch in the list of changed touches
            const touch = Array.from(event.changedTouches || []).find(
                t => t.identifier === element._touchId
            );
            
            if (!touch && event.type !== 'touchend') return;
        }
        
        console.log('up');
        isDragging = false;
        
        // Clean up touch identifier
        if (element._touchId !== undefined) {
            delete element._touchId;
        }
        
        // Move element back to original position
        if (element.getAnimations) { 
            element.getAnimations().forEach(a => a.cancel()); 
        }
        
        // Animate back to original position if needed
        if (originalParent) {
            const moveBack = moveWithAnimation(element, originalParent, originalNextSibling);
            if (moveBack) {
                moveBack.onfinish = cleanup;
                return;
            }
        }
        
        // If no animation, just clean up
        cleanup();
    };

    // Clean up function to remove all event listeners
    const removeEventListeners = () => {
        element.removeEventListener('mousedown', onStart);
        element.removeEventListener('touchstart', onStart);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchend', onEnd);
        document.removeEventListener('touchcancel', onEnd);
    };

    // Store cleanup function on the element
    element._cleanupDraggable = removeEventListeners;

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