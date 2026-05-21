export class DiscardPile extends HTMLElement {
  connectedCallback() {
    this.addEventListener("dragdrop", this.#onDrop);
    this.addEventListener("dragenter", this.#onDragEnter);
    this.addEventListener("dragleave", this.#onDragLeave);
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
}

if (!customElements.get("discard-pile")) customElements.define("discard-pile", DiscardPile);
