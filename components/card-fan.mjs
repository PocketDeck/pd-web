import { Component, html, css } from "/core/base.mjs";
import { makeDraggable } from "/core/drag.mjs";

function fanLayout(container, curvatureDeg) {
  const cards = Array.from(container.children);
  const n = cards.length;
  cards.forEach((card, i) => {
    const center = (n - 1) / 2;
    const angle = curvatureDeg * ((i - center) / (n || 1));
    card.style.setProperty("--angle", `${angle}deg`);
    card.dataset.index = i;
    card.style.setProperty("--z", i);
    if (card.firstElementChild) card.firstElementChild.dataset.index = i;
  });
}

function interpolateAngle(angles, i) {
  const n = angles.length;
  if (n <= 1) return 0;
  if (i === 0) return angles[0] - (angles[1] - angles[0]) / 2;
  if (i === n) return angles[n - 1] + (angles[n - 1] - angles[n - 2]) / 2;
  return (angles[i - 1] + angles[i]) / 2;
}

function getAngles(container) {
  return Array.from(container.children).filter(c => c.classList.contains("card-slot")).map(
    c => parseFloat(c.style.getPropertyValue("--angle")),
  );
}

function getCardData(slot) {
  const el = slot?.firstElementChild;
  if (!el) return { tag: "div" };
  const data = { tag: el.tagName.toLowerCase() };
  for (const attr of el.attributes) data[attr.name] = attr.value;
  return data;
}

function buildCard(cardData) {
  const slot = document.createElement("div");
  slot.className = "card-slot";
  const tag = cardData.tag ?? "div";
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(cardData)) {
    if (k !== "tag") el.setAttribute(k, v);
  }
  slot.appendChild(el);
  return slot;
}

export class CardFan extends Component {
  static props = { curvature: 70 };

  _skipBodyMorph = true;

  model = { insert: null };

  #dragState = null;
  #ghost = null;

  render() {
    return html`<div id="fan"></div><div id="drop-zones"></div>`;
  }

  onMount() {
    this.#installSlots();
    this.#setupDrag();
  }

  onRender() {
    this.#setupDrag();
  }

  onChildrenChanged() {
    const fan = this.getElementById("fan");
    for (const slot of fan.querySelectorAll(".card-slot")) slot.remove();
    for (const child of [...this.children]) {
      const slot = document.createElement("div");
      slot.className = "card-slot";
      slot.appendChild(child);
      fan.appendChild(slot);
      this.#addSlotListeners(slot);
    }
    fanLayout(fan, this.state.curvature);
  }

  #getSlots() {
    const fan = this?.getElementById("fan");
    return fan ? Array.from(fan.children).filter(c => c.classList.contains("card-slot")) : [];
  }

  #installSlots() {
    const fan = this.getElementById("fan");
    for (const child of [...this.children]) {
      const slot = document.createElement("div");
      slot.className = "card-slot";
      slot.appendChild(child);
      fan.appendChild(slot);
    }
    fanLayout(fan, this.state.curvature);
  }

  #setupDrag() {
    for (const slot of this.#getSlots()) this.#addSlotListeners(slot);
  }

  #addSlotListeners(slot) {
    if (slot._dragSetup) return;
    slot._dragSetup = true;

    makeDraggable(slot, {
      click: () => {
        const card = slot.firstElementChild;
        if (card) {
          card.dispatchEvent(new CustomEvent("card-click", {
            bubbles: true, composed: true,
            detail: { card },
          }));
        }
      },
      start: () => {
        const idx = parseInt(slot.dataset.index);
        if (isNaN(idx)) return;
        const r = slot.getBoundingClientRect();
        this.#dragState = { idx, data: getCardData(slot), dropIdx: -1, dragW: r.width, dragH: r.height };
        fanLayout(this.getElementById("fan"), this.state.curvature);
        this.#populateDropZones();
      },
      move: (_el, x, y) => {
        if (!this.#dragState) return;
        const idx = this.#findDropTarget(x, y);
        if (idx === this.#dragState.dropIdx) return;
        this.#removeGhost();
        this.#dragState.dropIdx = idx;
        if (idx >= 0) this.#showGhost(idx);
      },
      end: (_el, target) => {
        if (!this.#dragState) return;
        const from = this.#dragState.idx;
        const to = this.#dragState.dropIdx;
        this.#removeGhost();
        this.#clearDropZones();

        if (target) {
          // Drop was consumed by an external target (e.g., discard-pile)
          // Coordinator moved slot back to original position.
          this.#dragState = null;
        } else if (to >= 0 && to !== from) {
          this.dispatchEvent(new CustomEvent("fan-insert", {
            bubbles: true, composed: true,
            detail: { from, to },
          }));

          const commit = () => {
            this.#placeCard(slot, to);
            this.#dragState = null;
          };

          if (this.model.insert) {
            const promise = this.model.insert(from, to);
            if (promise && typeof promise.then === "function") {
              promise.then(commit).catch(() => { this.#placeCard(slot, from); this.#dragState = null; });
            } else {
              commit();
            }
          } else {
            commit();
          }
        } else {
          this.#placeCard(slot, from);
          this.#dragState = null;
        }
      },
    });
  }

  #findDropTarget(x, y) {
    const zonesRoot = this.getElementById("drop-zones");
    if (zonesRoot && zonesRoot.children.length > 0) {
      const el = document.elementFromPoint(x, y);
      const zone = el?.closest?.(".drop-zone");
      if (zone) return parseInt(zone.dataset.index);
      return -1;
    }
    // Fallback for external drags (draw-pile hover) — no zones rendered
    const slots = this.#getSlots();
    const n = slots.length;
    if (n === 0) return 0;
    const fan = this.getElementById("fan");
    const fanRect = fan.getBoundingClientRect();
    const margin = (fanRect.bottom - fanRect.top) * 0.5;
    if (y < fanRect.top - margin || y > fanRect.bottom + margin) return -1;
    const midpoints = slots.map(s => {
      const r = s.getBoundingClientRect();
      return (r.left + r.right) / 2;
    });
    if (x < midpoints[0]) return 0;
    for (let i = 0; i < n - 1; i++) {
      if (x >= midpoints[i] && x < midpoints[i + 1]) return i + 1;
    }
    if (x >= midpoints[n - 1]) return n;
    return -1;
  }

  #populateDropZones() {
    const zonesRoot = this.getElementById("drop-zones");
    zonesRoot.innerHTML = "";
    zonesRoot.classList.add("dragging");
    const fan = this.getElementById("fan");
    const slots = this.#getSlots();
    const angles = getAngles(fan);
    const w = this.#dragState?.dragW ?? 0;
    const h = this.#dragState?.dragH ?? 0;
    for (let i = 0; i <= slots.length; i++) {
      const zone = document.createElement("div");
      zone.className = "drop-zone";
      zone.style.setProperty("--angle", `${interpolateAngle(angles, i)}deg`);
      zone.style.width = w + "px";
      zone.style.height = h + "px";
      zone.dataset.index = i;
      zonesRoot.appendChild(zone);
    }
  }

  #clearDropZones() {
    const zonesRoot = this.getElementById("drop-zones");
    if (zonesRoot) { zonesRoot.classList.remove("dragging"); zonesRoot.innerHTML = ""; }
  }

  #showGhost(idx, cardData) {
    this.#removeGhost();
    const fan = this.getElementById("fan");
    if (idx < 0 || idx > fan.children.length) return;
    this.#ghost = buildCard(cardData ?? this.#dragState?.data ?? { tag: "div" });
    this.#ghost.classList.remove("card-slot");
    this.#ghost.classList.add("drop-indicator");
    const ref = fan.children[idx] ?? null;
    fan.insertBefore(this.#ghost, ref);
    fanLayout(fan, this.state.curvature);
  }

  #removeGhost() {
    if (this.#ghost) {
      this.#ghost.remove();
      this.#ghost = null;
      const fan = this.getElementById("fan");
      if (fan) fanLayout(fan, this.state.curvature);
    }
  }

  #placeCard(slot, idx) {
    const fan = this.getElementById("fan");
    const ref = fan.children[Math.min(idx, fan.children.length)] ?? null;
    fan.insertBefore(slot, ref);
    fanLayout(fan, this.state.curvature);
  }

  addCards(cardDataArray) {
    const fan = this.getElementById("fan");
    for (const cardData of cardDataArray) {
      const slot = buildCard(cardData);
      fan.appendChild(slot);
      this.#addSlotListeners(slot);
    }
    fanLayout(fan, this.state.curvature);
  }

  removeCard(idx) {
    const slots = this.#getSlots();
    const slot = slots[idx];
    if (slot) slot.remove();
    fanLayout(this.getElementById("fan"), this.state.curvature);
  }

  getCardSlot(idx) {
    const slots = this.#getSlots();
    return slots[idx] ?? null;
  }

  insertCard(idx, cardData) {
    const fan = this.getElementById("fan");
    const slot = buildCard(cardData);
    const slots = this.#getSlots();
    const ref = slots[idx] ?? null;
    fan.insertBefore(slot, ref);
    this.#addSlotListeners(slot);
    fanLayout(fan, this.state.curvature);
  }

  setCards(cardDataArray) {
    const fan = this.getElementById("fan");
    for (const slot of this.#getSlots()) slot.remove();
    for (const cardData of cardDataArray) {
      const slot = buildCard(cardData);
      fan.appendChild(slot);
      this.#addSlotListeners(slot);
    }
    fanLayout(fan, this.state.curvature);
  }

  getDropIndex(x, y) {
    return this.#findDropTarget(x, y);
  }

  showGhost(idx, cardData) {
    this.#showGhost(idx, cardData);
  }

  hideGhost() {
    this.#removeGhost();
  }

  insertCardElement(idx, element) {
    const fan = this.getElementById("fan");
    const slot = document.createElement("div");
    slot.className = "card-slot";
    slot.appendChild(element);
    const ref = fan.children[Math.min(idx, fan.children.length)] ?? null;
    fan.insertBefore(slot, ref);
    this.#addSlotListeners(slot);
    fanLayout(fan, this.state.curvature);
    return slot;
  }

  styles() {
    return css`
      :host {
        --raise: -225%;
        --hover-raise: -42.5%;
        --zone-w: 68px;
        --zone-h: 100px;
        display: grid;
        width: 100%;
        height: 200px;
        touch-action: none;
        user-select: none;
      }

      #fan, #drop-zones {
        grid-column: 1 / 2;
        grid-row: 1 / 2;
      }

      #fan {
        position: relative;
        transform-style: preserve-3d;
      }

      #drop-zones {
        position: relative;
        pointer-events: none;
      }

      #drop-zones.dragging {
        z-index: 9999;
      }

      .card-slot, .drop-zone, .drop-indicator {
        position: absolute;
        bottom: 0;
        left: 50%;
        transform-origin: 50% 100%;
        --angle: 0deg;
        transform: translateX(-50%) translateY(calc(-1 * var(--raise))) rotate(var(--angle)) translateY(var(--raise));
        touch-action: none;
      }

      .card-slot {
        cursor: pointer;
        transition: transform 300ms;
        z-index: var(--z, 0);
        transform-style: preserve-3d;
      }

      .card-slot > * {
        display: block;
        transition: transform 200ms;
        pointer-events: none;
      }

      .card-slot:hover > * {
        transform: translateY(var(--hover-raise)) rotate(calc(-1 * var(--angle))) scale(1.2);
        translate: 0 0 1px;
      }

      .drop-zone {
        opacity: 0;
        pointer-events: auto;
      }

      .drop-indicator {
        opacity: 0.55;
        pointer-events: none;
        z-index: var(--z, 0);
      }

      .drop-indicator > * {
        display: block;
        pointer-events: none;
      }

    `;
  }
}

CardFan.registerTag("card-fan");
