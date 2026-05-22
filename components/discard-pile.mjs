import { Component, html, css } from "/core/base.mjs";

export class DiscardPile extends Component {
  render() {
    return html`<slot></slot>`;
  }

  styles() {
    return css`
      :host {
        display: flex; flex-direction: column; align-items: center; gap: 0.375rem;
        transition: transform .2s, filter .2s;
      }
      :host(.drag-over) {
        transform: scale(1.08); filter: brightness(1.3);
      }
    `;
  }

  #onDrop = (e) => {
    if (!e.detail.el.classList.contains("card-slot")) return;
    e.preventDefault();
    this.classList.remove("drag-over");
    this.dispatchEvent(new CustomEvent("discard-drop", {
      bubbles: true, composed: true,
      detail: { slot: e.detail.el },
    }));
  };

  #onDragEnter = () => {
    this.classList.add("drag-over");
  };

  #onDragLeave = () => {
    this.classList.remove("drag-over");
  };

  mounted() {
    this.addEventListener("dragdrop", this.#onDrop);
    this.addEventListener("dragenter", this.#onDragEnter);
    this.addEventListener("dragleave", this.#onDragLeave);
  }

  unmounted() {
    this.removeEventListener("dragdrop", this.#onDrop);
    this.removeEventListener("dragenter", this.#onDragEnter);
    this.removeEventListener("dragleave", this.#onDragLeave);
  }
}

if (!customElements.get("discard-pile")) customElements.define("discard-pile", DiscardPile);
