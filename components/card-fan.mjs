import { Component, css } from "/core/base.mjs";

function fanLayout(container, curvatureDeg) {
  const cards = Array.from(container.children);
  const n = cards.length;
  cards.forEach((card, i) => {
    const center = (n - 1) / 2;
    const angle = curvatureDeg * ((i - center) / n);
    card.style.setProperty("--angle", `${angle}deg`);
    card.dataset.index = i;
    card.style.zIndex = i;
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
  return Array.from(container.children).map(
    c => parseFloat(c.style.getPropertyValue("--angle")),
  );
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

function getCardData(slot) {
  const el = slot?.firstElementChild;
  if (!el) return { tag: "div" };
  const data = { tag: el.tagName.toLowerCase() };
  for (const attr of el.attributes) data[attr.name] = attr.value;
  return data;
}

export class CardFan extends Component {
  static props = {
    cards: [],
    curvature: 70,
  };

  model = { insert: null };

  #dragIdx = -1;
  #dragData = null;
  #dragW = 0;
  #dragH = 0;
  #stash = null;
  #ghost = null;
  #ghostCx = 0;
  #ghostCy = 0;
  #dropIdx = -1;
  #indicator = null;
  #zonesRoot = null;

  _update() {
    const root = this._root;
    let style = root.querySelector("style");
    if (!style) {
      style = document.createElement("style");
      root.appendChild(style);
    }
    style.textContent = this.styles();

    let fan = root.querySelector("#fan");
    if (!fan) {
      fan = document.createElement("div");
      fan.id = "fan";
      root.appendChild(fan);
    }
    this._fan = fan;

    if (this.#indicator && this.#indicator.parentNode === fan) {
      this.#indicator.remove();
    }

    this.#reconcile();

    if (this.#indicator && this.#dropIdx >= 0) {
      const ref = fan.children[this.#dropIdx] ?? null;
      fan.insertBefore(this.#indicator, ref);
    }

    fanLayout(fan, this.state.curvature);
  }

  #reconcile() {
    const cards = this.state.cards;

    if (this.#dragIdx >= 0) {
      const want = cards.length - 1;
      while (this._fan.children.length > want) this._fan.lastChild.remove();
      let di = 0;
      for (let si = 0; si < cards.length; si++) {
        if (si === this.#dragIdx) continue;
        const ex = this._fan.children[di];
        if (ex && ex.classList.contains("card-slot")) {
          this.#syncSlot(ex, cards[si]);
        } else {
          const slot = buildCard(cards[si]);
          if (ex) ex.replaceWith(slot);
          else this._fan.appendChild(slot);
        }
        di++;
      }
    } else {
      while (this._fan.children.length > cards.length) this._fan.lastChild.remove();
      for (let i = 0; i < cards.length; i++) {
        const ex = this._fan.children[i];
        if (ex && ex.classList.contains("card-slot")) {
          this.#syncSlot(ex, cards[i]);
        } else {
          const slot = buildCard(cards[i]);
          if (ex) ex.replaceWith(slot);
          else this._fan.appendChild(slot);
        }
      }
    }
  }

  #syncSlot(slot, data) {
    const tag = data.tag ?? "div";
    let el = slot.firstElementChild;
    if (!el || el.tagName.toLowerCase() !== tag) {
      el = document.createElement(tag);
      slot.innerHTML = "";
      slot.appendChild(el);
    }
    for (const [k, v] of Object.entries(data)) {
      if (k !== "tag") el.setAttribute(k, v);
    }
  }

  mounted() {
    let pending = null;
    const onMove = (e) => {
      if (!pending) return;
      const dx = e.clientX - pending.x;
      const dy = e.clientY - pending.y;
      if (dx * dx + dy * dy > 25) {
        this.#startDrag(pending.idx, pending.slot, e);
        pending = null;
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      }
    };
    const onUp = () => { pending = null; document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
    this._root.addEventListener("pointerdown", (e) => {
      const slot = e.target.closest(".card-slot");
      if (!slot || !this._fan?.contains(slot)) return;
      if (this.#dragIdx >= 0) return;
      const idx = parseInt(slot.dataset.index);
      if (isNaN(idx)) return;
      pending = { idx, slot, x: e.clientX, y: e.clientY };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    });
  }

  #startDrag(idx, slot, e) {
    e.preventDefault();
    this.#dragIdx = idx;
    this.#dragData = getCardData(slot);
    this.#stash = slot;

    const rect = slot.getBoundingClientRect();
    this.#dragW = rect.width;
    this.#dragH = rect.height;
    this.#ghost = document.createElement("div");
    this.#ghost.className = "drag-ghost";
    this.#ghost.style.width = rect.width + "px";
    this.#ghost.style.height = rect.height + "px";
    this.#ghost.appendChild(buildCard(this.#dragData));
    document.body.appendChild(this.#ghost);
    this.#ghostCx = rect.width / 2;
    this.#ghostCy = rect.height / 2;
    this.#moveGhost(e.clientX, e.clientY);

    slot.remove();
    fanLayout(this._fan, this.state.curvature);

    this.#buildZones();
    document.addEventListener("pointermove", this.#pm);
    document.addEventListener("pointerup", this.#pu);
  }

  #pm = (e) => this.#onMove(e);
  #pu = (e) => this.#onUp(e);

  #moveGhost(cx, cy) {
    if (!this.#ghost) return;
    this.#ghost.style.transform = `translate(${cx - this.#ghostCx}px, ${cy - this.#ghostCy}px)`;
  }

  #onMove(e) {
    if (!this.#ghost) return;
    this.#moveGhost(e.clientX, e.clientY);
    const hits = document.elementsFromPoint(e.clientX, e.clientY);
    const zone = hits.find(el => el.classList.contains("drop-zone"));
    const zi = zone ? parseInt(zone.dataset.index) : -1;
    if (zi !== this.#dropIdx) this.#switchDropZone(zi);
  }

  #onUp() {
    const droppedIdx = this.#dropIdx;
    const dragIdx = this.#dragIdx;

    if (droppedIdx >= 0) {
      this.dispatchEvent(new CustomEvent("fan-insert", {
        bubbles: true,
        detail: { from: dragIdx, to: droppedIdx },
      }));
      if (this.model.insert) {
        this.model.insert(dragIdx, droppedIdx);
      }
      // Card was removed from fan, now stashed.
      // Server response will trigger _update with new hand order.
      this.#stash = null;
    } else {
      // Abort: put the card back
      if (this.#stash) {
        const ref = this._fan.children[Math.min(dragIdx, this._fan.children.length)] ?? null;
        this._fan.insertBefore(this.#stash, ref);
        this.#stash = null;
      }
    }

    this.#cleanup();
  }

  #cleanup() {
    this.#dragIdx = -1;
    this.#dropIdx = -1;
    if (this.#ghost) { this.#ghost.remove(); this.#ghost = null; }
    if (this.#indicator) { this.#indicator.remove(); this.#indicator = null; }
    this.#destroyZones();
    document.removeEventListener("pointermove", this.#pm);
    document.removeEventListener("pointerup", this.#pu);
    this._update();
  }

  #buildZones() {
    this.#destroyZones();
    this.#zonesRoot = document.createElement("div");
    this.#zonesRoot.id = "drop-zones";
    this.#zonesRoot.classList.add("active");
    this._root.appendChild(this.#zonesRoot);

    const fan = this._fan;
    const n = fan.children.length;
    const angles = getAngles(fan);

    for (let i = 0; i <= n; i++) {
      const angle = interpolateAngle(angles, i);
      const zone = document.createElement("div");
      zone.className = "drop-zone";
      zone.style.setProperty("--angle", `${angle}deg`);
      zone.style.width = this.#dragW + "px";
      zone.style.height = this.#dragH + "px";
      zone.dataset.index = i;
      zone.style.zIndex = i;
      this.#zonesRoot.appendChild(zone);
    }
  }

  #destroyZones() {
    if (this.#zonesRoot) { this.#zonesRoot.remove(); this.#zonesRoot = null; }
  }

  #switchDropZone(idx) {
    if (this.#indicator) { this.#indicator.remove(); this.#indicator = null; }
    this.#dropIdx = idx;
    if (idx < 0) {
      fanLayout(this._fan, this.state.curvature);
      return;
    }
    this.#indicator = buildCard(this.#dragData ?? getCardData(this._fan.children[0]));
    this.#indicator.classList.add("drop-indicator");
    const ref = this._fan.children[idx] ?? null;
    this._fan.insertBefore(this.#indicator, ref);
    fanLayout(this._fan, this.state.curvature);
  }

  styles() {
    return css`
      card-fan {
        --raise: -225%;
        --hover-raise: -42.5%;
        display: grid;
        width: 100%;
      }

      #fan, #drop-zones {
        grid-column: 1 / 2;
        position: absolute;
        width: 100%;
        display: flex;
        justify-content: center;
      }

      #fan { z-index: 2; }
      #drop-zones { z-index: 5; pointer-events: none; }
      #drop-zones.active { pointer-events: auto; }

      .card-slot, .drop-zone {
        position: absolute;
        bottom: 0;
        transform-origin: 50% 100%;
        --angle: 0deg;
        transform: translateY(calc(-1 * var(--raise))) rotate(var(--angle)) translateY(var(--raise));
      }

      .card-slot {
        cursor: pointer;
        transition: transform 300ms;
        z-index: 0;
      }

      .card-slot > * {
        display: block;
        transition: transform 200ms;
        pointer-events: none;
      }

      .card-slot:hover > * {
        transform: translateY(var(--hover-raise)) rotate(calc(-1 * var(--angle))) scale(1.2);
      }

      .drop-zone {
        opacity: 0;
        pointer-events: auto;
      }

      .drop-indicator {
        opacity: 0.55;
        pointer-events: none;
      }

      .drag-ghost {
        position: fixed;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 10000;
      }

      .drag-ghost > .card-slot {
        position: static;
        transform: none;
      }

      .drag-ghost > .card-slot > * {
        transform: scale(1.1);
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.35));
      }
    `;
  }
}

CardFan.registerTag("card-fan");
