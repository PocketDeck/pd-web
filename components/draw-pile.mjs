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
        <slot></slot>
        ${shims}
      </div>
    `;
  }

  styles() {
    return css`
      :host {
        display: flex; flex-direction: column; align-items: center; gap: 0.375rem;
        touch-action: none;
        transition: transform .2s, filter .2s;
      }
      :host(:hover) {
        transform: scale(1.08);
        filter: brightness(1.3);
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

  onRender() {
    this.#setupDrag();
  }

  onChildrenChanged() {
    this.#setupDrag();
  }

  #cardFromSlot() {
    const slot = this.querySelector("slot");
    if (!slot) return null;
    return slot.assignedElements()[0] ?? slot.firstElementChild;
  }

  #setupDrag() {
    const card = this.#cardFromSlot();
    if (!card || card._draggable) return;
    makeDraggable(card, {
      click: () => {
        this.dispatchEvent(new CustomEvent("draw-click", { bubbles: true, composed: true }));
      },
      start: () => {
        this.dispatchEvent(new CustomEvent("draw-drag-start", { bubbles: true, composed: true }));
      },
      move: (_el, x, y) => {
        this.dispatchEvent(new CustomEvent("draw-drag-move", {
          bubbles: true, composed: true,
          detail: { x, y },
        }));
      },
      end: () => {
        this.dispatchEvent(new CustomEvent("draw-drag-end", { bubbles: true, composed: true }));
      },
    });
  }
}

if (!customElements.get("draw-pile")) customElements.define("draw-pile", DrawPile);
