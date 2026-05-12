function findDragOverElement(x, y, wrapper) {
  wrapper.style.visibility = "hidden";
  let over = document.elementFromPoint(x, y);
  wrapper.style.visibility = "visible";
  return over;
}

export function makeDraggable(element) {
  if (element._draggable) return { onDragStart() {}, onDragStop() {} };
  element._draggable = true;

  let originalParent = null;
  let originalSibling = null;
  let dragOverElement = null;
  let dragging = false;
  let dropping = false;
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.top = "0";
  wrapper.style.left = "0";
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = "10000";

  let _dragStart = null;
  const onDragStart = (fn) => { _dragStart = fn; };
  let _dragStop = null;
  const onDragStop = (fn) => { _dragStop = fn; };
  let _dragMove = null;
  const onDragMove = (fn) => { _dragMove = fn; };

  const moveTo = (x, y) => {
    x -= wrapper.offsetWidth / 2;
    y -= wrapper.offsetHeight / 2;
    wrapper.style.transform = `translate(${x}px, ${y}px)`;
  };

  const onStart = (e) => {
    if (dragging || dropping) return;
    if (element._dragAnimation && element._dragAnimation.playState === "running") return;
    originalParent = element.parentNode;
    originalSibling = element.nextSibling;
    document.body.appendChild(wrapper);
    wrapper.appendChild(element);
    moveTo(e.clientX, e.clientY);
    dragging = true;
    _dragStart?.(e);
  };

  const onMove = (e) => {
    if (!dragging || dropping) return;
    moveTo(e.clientX, e.clientY);
    const newOver = findDragOverElement(e.clientX, e.clientY, wrapper);
    if (newOver !== dragOverElement) {
      const old = dragOverElement;
      dragOverElement = newOver;
      old?.dispatchEvent(new CustomEvent("dragleave", { bubbles: true, detail: { old, new: newOver } }));
      newOver?.dispatchEvent(new CustomEvent("dragenter", { bubbles: true, detail: { old, new: newOver } }));
    }
    _dragMove?.(e);
  };

  const onEnd = (e) => {
    if (!dragging || dropping) return;
    dropping = true;

    element.finalizeDrop = () => {
      wrapper.remove();
      dragging = false;
      dropping = false;
    };
    element.abortDrop = () => {
      element._dragAnimation = moveWithAnimation(element, originalParent, originalSibling, {
        endCallback: () => _dragStop?.(e),
      });
      element.finalizeDrop();
    };

    const event = new CustomEvent("dragdrop", {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { el: element },
    });

    const handled = dragOverElement?.dispatchEvent(event) === false;
    dragOverElement = null;
    if (!handled) element.abortDrop();
    else _dragStop?.(e);
  };

  element.addEventListener("pointerdown", onStart);
  element.addEventListener("pointerup", onEnd);
  element.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onEnd);
  document.addEventListener("pointermove", onMove);

  return { onDragStart, onDragStop };
}

export function moveWithAnimation(element, newParent, nextSibling, options = {}) {
  const { animate = true, duration = 260, easing = "ease-out", endCallback = null } = options;
  const start = element.getBoundingClientRect();
  newParent.insertBefore(element, nextSibling);
  const end = element.getBoundingClientRect();
  if (!animate) return;

  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.top = `${end.top}px`;
  wrapper.style.left = `${end.left}px`;
  wrapper.appendChild(element);
  document.body.appendChild(wrapper);

  const delta = { x: start.left - end.left, y: start.top - end.top };

  const animation = wrapper.animate(
    [{ transform: `translate(${delta.x}px, ${delta.y}px)` }, { transform: "translate(0, 0)" }],
    { duration, easing },
  );

  const cleanup = () => {
    newParent.insertBefore(element, nextSibling);
    wrapper.remove();
    endCallback?.();
  };
  animation.oncancel = cleanup;
  animation.onfinish = cleanup;
  return animation;
}

export function containsDeep(element, target) {
  if (element === target) return true;
  for (const node of element.children) {
    if (containsDeep(node, target) || (node.shadowRoot && containsDeep(node.shadowRoot, target))) return true;
  }
  return false;
}
