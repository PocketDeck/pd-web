function findDragOverElement(x, y, wrapper) {
    wrapper.style.visibility = 'hidden';
    let over = document.elementFromPoint(x, y);

    while (over && over.shadowRoot) {
        const next = over.shadowRoot.elementFromPoint(x, y);
        if (next === over) break;
        over = next;
    }

    wrapper.style.visibility = 'visible';
    return over;
}

export function makeDraggable(element) {
    if (element._draggable) return;
    element._draggable = true;

    let wrapper = null;
    let originalParent = null;
    let originalSibling = null;
    let dragOverElement = null;
    let dragging = false;

    let dragStart = null;
    const onDragStart = (start) => { dragStart = start; }
    let dragStop = null;
    const onDragStop = (stop) => { dragStop = stop; }
    let dragMove = null;
    const onDragMove = (move) => { dragMove = move; }

    const moveTo = (x, y) => {
        x -= wrapper.offsetWidth / 2;
        y -= wrapper.offsetHeight / 2;
        wrapper.style.transform = `translate(${x}px, ${y}px)`;
    }

    const onStart = (e) => {
        if (dragging) return;
        if (element._dragAnimation && element._dragAnimation.playState === 'running') {
            element._dragAnimation.cancel();
        }
        originalParent = element.parentNode;
        originalSibling = element.nextSibling;

        wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.top = '0';
        wrapper.style.left = '0';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.zIndex = '10000';
        document.body.appendChild(wrapper);
        wrapper.appendChild(element);
        moveTo(e.clientX, e.clientY);
        dragging = true;
        dragStart?.(e);
    }

    const onMove = (e) => {
        if (!dragging || !wrapper) return;
        moveTo(e.clientX, e.clientY);

        const oldDragOverElement = dragOverElement;
        const newDragOverElement = findDragOverElement(e.clientX, e.clientY, wrapper);
        if (newDragOverElement !== dragOverElement) {
            dragOverElement = newDragOverElement;
            oldDragOverElement?.dispatchEvent(new CustomEvent('dragleave', { bubbles: true, composed: true, detail: { old: oldDragOverElement, new: newDragOverElement } }));
            newDragOverElement?.dispatchEvent(new CustomEvent('dragenter', { bubbles: true, composed: true, detail: { old: oldDragOverElement, new: newDragOverElement } }));
        }
        dragMove?.(e);
    }

    const onEnd = (e) => {
        if (!dragging || !wrapper) return;
        element._dragAnimation = moveWithAnimation(element, originalParent, originalSibling, { endCallback: () => dragStop?.(e) });
        wrapper.remove();
        dragging = false;
        dragOverElement = null;
    }

    element.addEventListener('pointerdown', onStart);
    element.addEventListener('pointerup', onEnd);
    element.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onEnd);
    document.addEventListener('pointermove', onMove);

    return {
        onDragStart,
        onDragStop,
        onDragMove,
    }
}

export function moveWithAnimation(element, newParent, nextSibling, options = {}) {
    const { animate = true, duration = 260, easing = 'ease-out', endCallback = null } = options;

    const start = element.getBoundingClientRect();
    newParent.insertBefore(element, nextSibling);
    const end = element.getBoundingClientRect();

    if (!animate) return;
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.top = `${end.top}px`;
    wrapper.style.left = `${end.left}px`;
    wrapper.appendChild(element);
    document.body.appendChild(wrapper);
    
    const delta = {
        x: start.left - end.left,
        y: start.top - end.top,
    };
    
    const animation = wrapper.animate([
        { transform: `translate(${delta.x}px, ${delta.y}px)` },
        { transform: 'translate(0, 0)' },
    ], {
        duration,
        easing,
    });
    
    animation.oncancel = () => {
        wrapper.remove();
        endCallback?.();
    };

    animation.onfinish = () => {
        newParent.insertBefore(element, nextSibling);
        wrapper.remove();
        endCallback?.();
    };
    
    return animation;
}

export function containsDeep(element, target) {
    if (element === target) return true;

    for (const node of element.children) {
        if (containsDeep(node, target) ||
            (node.shadowRoot && containsDeep(node.shadowRoot, target))) {
            return true;
        }
    }
    return false;
}