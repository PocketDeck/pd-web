const cache = new Map()

export async function fetchStyles(name) {
  if (cache.has(name)) return cache.get(name)
  const res = await fetch(`/styles/${name}`)
  if (!res.ok) { cache.set(name, ""); return "" }
  const text = await res.text()
  cache.set(name, text)
  return text
}

const sources = new Map()
const targets = new Map()
let active = null

export function getActiveWrapper() { return active?.wrapper ?? null }

export function makeDraggable(element, { start, move, end, click } = {}) {
  if (element._draggable) return { destroy() {} }
  element._draggable = true

  const source = { start, move, end, click }
  sources.set(element, source)
  let pending = null

  function onDown(e) {
    if (active) return
    if (element._dragAnimating) return
    pending = { x: e.clientX, y: e.clientY }
  }

  function onMove(e) {
    if (pending && !active) {
      const dx = e.clientX - pending.x
      const dy = e.clientY - pending.y
      if (dx * dx + dy * dy > 25) {
        _begin(element, pending.x, pending.y, e.clientX, e.clientY)
        pending = null
      }
      return
    }
    if (!active || active.source !== element) return
    if (active.dropping) return
    _track(e.clientX, e.clientY)
  }

  function onUp(e) {
    if (pending) {
      pending = null
      click?.(e)
      return
    }
    if (!active || active.source !== element) return
    _drop(e.clientX, e.clientY)
  }

  function onCancel() {
    if (active?.source === element && !active?.dropping) _cancel()
  }

  element.addEventListener("pointerdown", onDown)
  document.addEventListener("pointermove", onMove)
  document.addEventListener("pointerup", onUp)
  document.addEventListener("pointercancel", onCancel)

  return {
    destroy() {
      element.removeEventListener("pointerdown", onDown)
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      document.removeEventListener("pointercancel", onCancel)
      element._draggable = false
      sources.delete(element)
    },
  }
}

export function makeDroppable(element, { accept, over, leave, drop } = {}) {
  targets.set(element, { accept, over, leave, drop })
  return {
    destroy() { targets.delete(element) },
  }
}

function _begin(element, px, py, x, y) {
  const config = sources.get(element)
  if (!config) return

  const wrapper = document.createElement("div")
  wrapper.style.position = "fixed"
  wrapper.style.top = "0"
  wrapper.style.left = "0"
  wrapper.style.pointerEvents = "none"
  wrapper.style.zIndex = "10000"

  const originalParent = element.parentNode
  const originalSibling = element.nextSibling

  document.body.appendChild(wrapper)
  wrapper.appendChild(element)
  _pos(wrapper, x, y)

  active = {
    source: element, element, wrapper, config,
    originalParent, originalSibling,
    x, y, dropping: false, ended: false,
    overTarget: null,
  }

  config.start?.(element, x, y)
}

function _track(x, y) {
  if (!active) return
  active.x = x
  active.y = y
  _pos(active.wrapper, x, y)

  const target = _find(x, y)
  if (target !== active.overTarget) {
    const old = active.overTarget
    active.overTarget = target
    if (old) targets.get(old)?.leave?.(active.element, x, y)
    if (target) targets.get(target)?.over?.(active.element, x, y)
  }

  active.config.move?.(active.element, x, y, active.overTarget)
}

function _drop(x, y) {
  if (!active || active.ended) return
  active.dropping = true

  const { element, wrapper, config, originalParent, originalSibling, overTarget } = active
  const target = overTarget ?? _find(x, y)
  let consumed = false

  if (target) {
    const tc = targets.get(target)
    consumed = tc?.drop(element, x, y) !== false
  }

  if (consumed) {
    wrapper.remove()
  } else {
    if (originalParent && element.parentNode !== originalParent) {
      originalParent.insertBefore(element, originalSibling ?? null)
    }
    wrapper.remove()
  }

  config.end?.(element, consumed ? target : null)
  active = null
}

function _cancel() {
  if (!active || active.ended) return
  active.ended = true
  const { element, wrapper, config, originalParent, originalSibling } = active

  if (originalParent && element.parentNode !== originalParent) {
    originalParent.insertBefore(element, originalSibling ?? null)
  }
  wrapper.remove()
  config.end?.(element, null)
  active = null
}

function _find(x, y) {
  if (targets.size === 0) return null
  const points = document.elementsFromPoint(x, y)
  for (const el of points) {
    const t = _drill(el, x, y)
    if (t) return t
  }
  return null
}

function _drill(el, x, y) {
  const t = _climb(el)
  if (t) return t
  if (el.shadowRoot && el.shadowRoot.mode === 'open') {
    const inner = el.shadowRoot.elementFromPoint(x, y)
    if (inner && inner !== el) {
      return _drill(inner, x, y)
    }
  }
  return null
}

function _climb(el) {
  let cur = el
  while (cur) {
    if (targets.has(cur)) return cur
    if (cur instanceof ShadowRoot) cur = cur.host
    else cur = cur.parentElement ?? cur.parentNode
    if (cur instanceof DocumentFragment) break
  }
  return null
}

function _pos(wrapper, x, y) {
  wrapper.style.transform = `translate(${x - wrapper.offsetWidth / 2}px, ${y - wrapper.offsetHeight / 2}px)`
}

export function moveWithAnimation(element, newParent, nextSibling, options = {}) {
  const { animate = true, duration = 260, easing = "ease-out", endCallback = null } = options
  const start = element.getBoundingClientRect()
  if (newParent && element.parentNode !== newParent) newParent.insertBefore(element, nextSibling ?? null)
  else if (!newParent) element.remove()
  const end = element.getBoundingClientRect()
  if (!animate) { endCallback?.(); return }

  const wrapper = document.createElement("div")
  wrapper.style.position = "fixed"
  wrapper.style.top = `${end.top}px`
  wrapper.style.left = `${end.left}px`
  wrapper.style.pointerEvents = "none"
  wrapper.appendChild(element)
  document.body.appendChild(wrapper)

  const delta = { x: start.left - end.left, y: start.top - end.top }

  const anim = wrapper.animate(
    [{ transform: `translate(${delta.x}px, ${delta.y}px)` }, { transform: "translate(0, 0)" }],
    { duration, easing },
  )

  function cleanup() {
    const parent = newParent ?? document.body
    parent.insertBefore(element, nextSibling ?? null)
    wrapper.remove()
    endCallback?.()
  }
  anim.oncancel = cleanup
  anim.onfinish = cleanup
  return anim
}
