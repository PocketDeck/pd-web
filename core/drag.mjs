function findDragOverElement(x, y, wrapper) {
  wrapper.style.visibility = "hidden";
  const el = document.elementFromPoint(x, y);
  wrapper.style.visibility = "visible";
  return el;
}

export function makeDraggable(element) {
  if (element._draggable) return { onDragStart() {}, onDragStop() {}, onDragMove() {}, destroy() {} };
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
  let _dragStop = null;
  let _dragMove = null;
  let _click = null;

  function onDragStart(fn) { _dragStart = fn; }
  function onDragStop(fn) { _dragStop = fn; }
  function onDragMove(fn) { _dragMove = fn; }
  function onClick(fn) { _click = fn; }

  let pending = null;

  function moveTo(x, y) {
    wrapper.style.transform = `translate(${x - wrapper.offsetWidth / 2}px, ${y - wrapper.offsetHeight / 2}px)`;
  }

  function onDown(e) {
    if (dragging || dropping) return;
    if (element._dragAnimation?.playState === "running") return;
    e.preventDefault();
    pending = { x: e.clientX, y: e.clientY };
  }

  function onMove(e) {
    if (pending && !dragging) {
      const dx = e.clientX - pending.x;
      const dy = e.clientY - pending.y;
      if (dx * dx + dy * dy > 25) {
        originalParent = element.parentNode;
        originalSibling = element.nextSibling;
        document.body.appendChild(wrapper);
        wrapper.appendChild(element);
        moveTo(e.clientX, e.clientY);
        dragging = true;
        _dragStart?.(e);
        pending = null;
      }
      return;
    }
    if (!dragging || dropping) return;
    moveTo(e.clientX, e.clientY);
    const newOver = findDragOverElement(e.clientX, e.clientY, wrapper);
    if (newOver !== dragOverElement) {
      const old = dragOverElement;
      dragOverElement = newOver;
      old?.dispatchEvent(new CustomEvent("dragleave", { bubbles: true, detail: { old, el: element } }));
      newOver?.dispatchEvent(new CustomEvent("dragenter", { bubbles: true, detail: { el: element } }));
    }
    _dragMove?.(e);
  }

  function onUp(e) {
    if (pending && !dragging) {
      pending = null;
      _click?.(e);
      return;
    }
    if (!dragging || dropping) return;
    dropping = true;

    element.finalizeDrop = () => {
      wrapper.remove();
      dragging = false;
      dropping = false;
    };

    element.abortDrop = () => {
      if (element._dragAnimation?.playState === "running") return;
      element._dragAnimation = moveWithAnimation(element, originalParent, originalSibling, {
        endCallback: () => { _dragStop?.(e); element.finalizeDrop(); },
      });
    };

    const event = new CustomEvent("dragdrop", {
      bubbles: true, composed: true, cancelable: true,
      detail: { el: element },
    });

    const prevented = dragOverElement?.dispatchEvent(event) === false;
    dragOverElement = null;
    if (!prevented && !element._skipAbort) element.abortDrop();
    else _dragStop?.(e);
    pending = null;
  }

  function onCancel() {
    pending = null;
    if (dragging && !dropping) {
      element.abortDrop?.();
    }
  }

  element.addEventListener("pointerdown", onDown);
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onCancel);

  function destroy() {
    element.removeEventListener("pointerdown", onDown);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onCancel);
    if (element._draggable) element._draggable = false;
  }

  return { onDragStart, onDragStop, onDragMove, onClick, destroy };
}

export function moveWithAnimation(element, newParent, nextSibling, options = {}) {
  const { animate = true, duration = 260, easing = "ease-out", endCallback = null } = options;
  const start = element.getBoundingClientRect();
  if (newParent && element.parentNode !== newParent) newParent.insertBefore(element, nextSibling ?? null);
  else if (!newParent) element.remove();
  const end = element.getBoundingClientRect();
  if (!animate) { endCallback?.(); return; }

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.top = `${end.top}px`;
  wrapper.style.left = `${end.left}px`;
  wrapper.style.pointerEvents = "none";
  wrapper.appendChild(element);
  document.body.appendChild(wrapper);

  const delta = { x: start.left - end.left, y: start.top - end.top };

  const anim = wrapper.animate(
    [{ transform: `translate(${delta.x}px, ${delta.y}px)` }, { transform: "translate(0, 0)" }],
    { duration, easing },
  );

  function cleanup() {
    const parent = newParent ?? document.body;
    parent.insertBefore(element, nextSibling ?? null);
    wrapper.remove();
    endCallback?.();
  }
  anim.oncancel = cleanup;
  anim.onfinish = cleanup;
  return anim;
}

export function containsDeep(element, target) {
  if (element === target) return true;
  for (const node of element.children) {
    if (containsDeep(node, target) || (node.shadowRoot && containsDeep(node.shadowRoot, target))) return true;
  }
  return false;
}
