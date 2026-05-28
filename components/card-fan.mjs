import { Component, html } from "/core/base.mjs";
import { makeDraggable, getActiveWrapper, makeDroppable } from "/core/util.mjs";

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
  static stylesLink = "/styles/components/card-fan.css";

  _skipBodyMorph = true;

  model = { insert: null };

  #dragState = null;
  #ghost = null;
  #dropSetup = null;

  render() {
    return html`<div id="fan"></div><div id="drop-zones"></div>`;
  }

  onMount() {
    this.#installSlots();
    this.#setupDrag();
    this.#setupDrop();
  }

  onRender() {
    this.#setupDrag();
    this.#setupDrop();
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

  #setupDrop() {
    if (this.#dropSetup) this.#dropSetup.destroy();
    const zones = this.getElementById("drop-zones");
    if (!zones) return;
    this.#dropSetup = makeDroppable(zones, {
      over: () => {},
      leave: () => { this.#removeGhost(); },
      drop: (source, x, y) => {
        if (!source.classList.contains("card-slot")) return false;
        const zone = this.shadowRoot.elementFromPoint(x, y);
        const to = parseInt(zone?.dataset?.index);
        if (isNaN(to)) return false;
        const from = parseInt(source.dataset.index);
        if (isNaN(from)) return false;
        const fan = this.getElementById("fan");
        const ref = fan.children[Math.min(to, fan.children.length)] ?? null;
        fan.insertBefore(source, ref);
        fanLayout(fan, this.state.curvature);
        if (this.#dragState) this.#dragState.dropIdx = to;
        return true;
      },
    });
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
        this.#removeGhost();
        this.#clearDropZones();

        if (!this.#dragState) return;

        if (target === this.getElementById("drop-zones")) {
          const from = this.#dragState.idx;
          const to = this.#dragState.dropIdx;
          if (to >= 0 && to !== from) {
            this.dispatchEvent(new CustomEvent("fan-insert", {
              bubbles: true, composed: true,
              detail: { from, to },
            }));
            if (this.model.insert) {
              const promise = this.model.insert(from, to);
              if (promise && typeof promise.then === "function") {
                promise.catch(() => {
                  const f = this.getElementById("fan");
                  const ref = f.children[Math.min(from, f.children.length)] ?? null;
                  f.insertBefore(slot, ref);
                  fanLayout(f, this.state.curvature);
                });
              }
            }
          }
          this.#dragState = null;
        } else if (target) {
          this.#dragState = null;
        } else if (this.#dragState.dropIdx >= 0 && this.#dragState.dropIdx !== this.#dragState.idx) {
          const from = this.#dragState.idx;
          const to = this.#dragState.dropIdx;
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
          this.#placeCard(slot, this.#dragState.idx);
          this.#dragState = null;
        }
      },
    });
  }

  #findDropTarget(x, y) {
    const zonesRoot = this.getElementById("drop-zones");
    if (!zonesRoot || zonesRoot.children.length === 0) {
      if (!getActiveWrapper()) return -1;
      this.#populateDropZones();
    }
    const el = this.shadowRoot?.elementFromPoint(x, y);
    if (el?.classList?.contains("drop-zone")) return parseInt(el.dataset.index);
    let cur = el;
    while (cur && cur !== this.shadowRoot) {
      if (cur.classList?.contains("drop-zone")) return parseInt(cur.dataset.index);
      cur = cur.parentElement;
    }
    return -1;
  }

  #populateDropZones() {
    const zonesRoot = this.getElementById("drop-zones");
    zonesRoot.innerHTML = "";
    zonesRoot.classList.add("dragging");
    const slots = this.#getSlots();
    const n = slots.length;
    let w = this.#dragState?.dragW;
    let h = this.#dragState?.dragH;
    if (!w || !h) {
      const s = slots[0];
      if (s) { const r = s.getBoundingClientRect(); w = r.width; h = r.height; }
    }
    w ??= 68; h ??= 100;
    for (let i = 0; i <= n; i++) {
      const zone = document.createElement("div");
      zone.className = "drop-zone";
      zone.style.width = w + "px";
      zone.style.height = h + "px";
      zone.dataset.index = i;
      zonesRoot.appendChild(zone);
    }
    fanLayout(zonesRoot, this.state.curvature);
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

  hideDropZones() {
    this.#clearDropZones();
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

}

CardFan.registerTag("card-fan");
