import { makeDraggable } from "/core/drag.mjs";

export class DrawPile extends HTMLElement {
  connectedCallback() {
    this.#setup();
  }

  _childrenUpdated() {
    if (!this.querySelector("uno-card")) this.#setup();
  }

  #setup() {
    if (this.querySelector("uno-card")?._draggable) return;
    const card = this.querySelector("uno-card") ?? this.#addCard();
    this.#makeDraggable(card);
  }

  #addCard() {
    const card = document.createElement("uno-card");
    card.setAttribute("faceup", "false");
    this.appendChild(card);
    return card;
  }

  #makeDraggable(card) {
    const drag = makeDraggable(card);

    drag.onClick(() => {
      this.dispatchEvent(new CustomEvent("draw-click", { bubbles: true, composed: true }));
    });

    drag.onDragStart(() => {
      this.dispatchEvent(new CustomEvent("draw-drag-start", { bubbles: true, composed: true }));
    });

    drag.onDragMove((e) => {
      this.dispatchEvent(new CustomEvent("draw-drag-move", {
        bubbles: true, composed: true,
        detail: { x: e.clientX, y: e.clientY },
      }));
    });

    drag.onDragStop(() => {
      card.finalizeDrop?.();
      this.#ensureCard();
      this.dispatchEvent(new CustomEvent("draw-drag-end", { bubbles: true, composed: true }));
    });
  }

  #ensureCard() {
    if (this.querySelector("uno-card")) return;
    const card = document.createElement("uno-card");
    card.setAttribute("faceup", "false");
    this.appendChild(card);
    this.#makeDraggable(card);
  }
}

if (!customElements.get("draw-pile")) customElements.define("draw-pile", DrawPile);
