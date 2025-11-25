import { Component } from '/core/base.mjs';

class DragWrapper extends HTMLElement {
    constructor() {
        super();
        this.style.position = 'fixed';
        this.style.top = '0';
        this.style.left = '0';
        this.style.display = 'none';
        this.style.pointerEvents = 'none';
        this.style.zIndex = '10000';
    }
}
customElements.define('drag-wrapper', DragWrapper);

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

    const wrapper = new DragWrapper();
    let originalParent = element.parentNode;
    let originalSibling = element.nextSibling;
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
        wrapper.appendChild(element);
        wrapper.style.display = 'block';
        dragStart && dragStart(e);
        dragging = true;
        moveTo(e.clientX, e.clientY);
    }

    const onMove = (e) => {
        if (!dragging) return;
        moveTo(e.clientX, e.clientY);

        const over = findDragOverElement(e.clientX, e.clientY, wrapper);
        if (over !== dragOverElement) {
            dragOverElement?.dispatchEvent(new CustomEvent('dragleave', { bubbles: true }));
            dragOverElement = over;
            dragOverElement?.dispatchEvent(new CustomEvent('dragenter', { bubbles: true }));
        }
        dragMove && dragMove(e);
    }

    const onEnd = (e) => {
        if (!dragging) return;
        moveWithAnimation(element, originalParent, originalSibling);
        wrapper.style.display = 'none';
        dragStop && dragStop(e);
        dragging = false;
    }

    element.addEventListener('pointerdown', onStart);
    element.addEventListener('pointerup', onEnd);
    element.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onEnd);
    document.addEventListener('pointermove', onMove);

    document.body.appendChild(wrapper);

    return {
        onDragStart,
        onDragStop,
        onDragMove,
    }
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