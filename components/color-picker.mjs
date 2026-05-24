import { Component, html, css } from "/core/base.mjs";

const COLORS = ["red", "blue", "green", "yellow"];

export class ColorPicker extends Component {
  static props = { visible: false };

  render({ visible }) {
    if (!visible) return "";
    return html`
      <div id="overlay" on:click="onOverlayClick">
        <div id="picker">
          ${COLORS.map(c => `<div class="color" style="background:${c}" data-color="${c}"></div>`).join("")}
        </div>
      </div>
    `;
  }

  styles() {
    return css`
      :host { display: contents; }
      #overlay {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
      }
      #picker {
        display: flex; gap: 1rem; padding: 1.75rem;
        background: rgba(0,0,0,0.55);
        border-radius: 2rem;
      }
      .color {
        width: 64px; height: 64px; border-radius: 50%;
        cursor: pointer;
        transition: transform .15s, filter .15s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .color:hover { transform: scale(1.2); filter: brightness(1.3); }
      .color:active { transform: scale(0.95); }
    `;
  }

  show() {
    this.state.visible = true;
  }

  hide() {
    this.state.visible = false;
  }

  onOverlayClick(e) {
    const color = e.target.dataset?.color;
    if (color) {
      this.dispatchEvent(new CustomEvent("color-selected", {
        bubbles: true, composed: true,
        detail: { color },
      }));
    } else if (e.target.id === "overlay") {
      this.dispatchEvent(new CustomEvent("color-cancel", {
        bubbles: true, composed: true,
      }));
    }
  }
}

ColorPicker.registerTag("color-picker");
