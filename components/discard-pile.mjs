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
}

if (!customElements.get("discard-pile")) customElements.define("discard-pile", DiscardPile);
