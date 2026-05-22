import { Component, html, css } from "/core/base.mjs";
import { makeDraggable } from "/core/drag.mjs";

export class DrawPile extends Component {
  render() {
    return html`<uno-card faceup="false"></uno-card>`;
  }

  styles() {
    return css`
      :host {
        display: flex; flex-direction: column; align-items: center; gap: 0.375rem;
        cursor: pointer; transition: transform .2s, filter .2s;
      }
    `;
  }

  mounted() {
    this.#setupDrag();
  }

  #setupDrag() {
    const card = this.querySelector("uno-card");
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
        this.#ensureCard();
      } else {
        this.appendChild(card);
        card.finalizeDrop?.();
      }
    });
  }

  #ensureCard() {
    if (this.querySelector("uno-card")) return;
    this._update();
    this.#setupDrag();
  }
}

if (!customElements.get("draw-pile")) customElements.define("draw-pile", DrawPile);
