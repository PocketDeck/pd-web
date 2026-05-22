import { Component, html, css } from "/core/base.mjs";
import { makeDraggable } from "/core/drag.mjs";

export class DrawPile extends Component {
  static props = { count: 100 };

  render({ count }) {
    if (count <= 0) {
      return html`<div class="empty"></div>`;
    }
    const shims = Array.from({ length: count }, (_, i) =>
      `<div class="shim" style="--i: ${i}"></div>`
    ).join("");
    return html`
      <div id="stack">
        <slot><uno-card faceup="false"></uno-card></slot>
        ${shims}
      </div>
    `;
  }

  styles() {
    return css`
      :host {
        display: flex; flex-direction: column; align-items: center; gap: 0.375rem;
        transition: transform .2s, filter .2s;
      }

      #stack {
        position: relative;
        width: 96px;
        height: 136px;
      }

      #stack ::slotted(*) {
        position: absolute;
        inset: 0;
        z-index: 4;
      }

      #stack > slot > * {
        position: absolute;
        inset: 0;
        z-index: 4;
      }

      .shim {
        position: absolute;
        inset: 0;
        border-radius: 4px;
        background: linear-gradient(145deg, #252560, #0f0f35);
        border: 1px solid rgba(255,255,255,0.1);
        z-index: calc(3 - var(--i, 0));
        transform: translate(calc(var(--i, 0) * -0.2px), calc(var(--i, 0) * -0.2px));
      }

      .empty {
        width: 96px; height: 136px;
        border: 2px dashed rgba(255,255,255,0.15);
        border-radius: 8px;
      }
    `;
  }

  mounted() {
    this.#setupDrag();
  }

  _update() {
    super._update();
    this.#setupDrag();
  }

  _childrenUpdated() {
    this.#setupDrag();
  }

  #cardFromSlot() {
    const slot = this.shadowRoot.querySelector("slot");
    if (!slot) return null;
    return slot.assignedElements()[0] ?? slot.firstElementChild;
  }

  #setupDrag() {
    const card = this.#cardFromSlot();
    if (!card || card._draggable) return;
    const drag = makeDraggable(card);

    drag.onClick(() => {
      this.dispatchEvent(new CustomEvent("draw-click", { bubbles: true, composed: true }));
    });

    drag.onDragStart(() => {
      card._skipAbort = true;
      this.dispatchEvent(new CustomEvent("draw-drag-start", { bubbles: true, composed: true }));
    });

    drag.onDragMove((e) => {
      this.dispatchEvent(new CustomEvent("draw-drag-move", {
        bubbles: true, composed: true,
        detail: { x: e.clientX, y: e.clientY },
      }));
    });

    drag.onDragStop(() => {
      this.dispatchEvent(new CustomEvent("draw-drag-end", { bubbles: true, composed: true }));

      if (card._dropHandled) {
        card.finalizeDrop?.();
        this._update();
      } else {
        this.appendChild(card);
        card.finalizeDrop?.();
      }
    });
  }
}

if (!customElements.get("draw-pile")) customElements.define("draw-pile", DrawPile);
