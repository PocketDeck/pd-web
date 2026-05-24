import { Component, html, css } from "/core/base.mjs";

export class ColorPicker extends Component {
  static props = { visible: false };

  render({ visible }) {
    if (!visible) return "";
    return html`
      <div id="overlay" on:click="onOverlayClick">
        <div id="box">
          <div class="pips">
            <div class="pip red" data-color="red"></div>
            <div class="pip yellow" data-color="yellow"></div>
            <div class="pip green" data-color="green"></div>
            <div class="pip blue" data-color="blue"></div>
          </div>
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
      #box {
        background: rgba(0,0,0,0.55);
        border-radius: 24px;
        padding: 24px;
      }
      .pips {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        width: 160px;
        height: 160px;
      }
      .pip {
        border-radius: 12px;
        cursor: pointer;
        transition: transform .15s, filter .15s;
        box-shadow: 0 4px 16px rgba(0,0,0,0.35);
      }
      .pip:hover { transform: scale(1.15); filter: brightness(1.25); }
      .pip:active { transform: scale(0.95); }
      .pip.red { background: #f44336; }
      .pip.yellow { background: #ffb300; }
      .pip.green { background: #4caf50; }
      .pip.blue { background: #2196f3; }
    `;
  }

  show() {
    this.state.visible = true;
  }

  hide() {
    this.state.visible = false;
  }

  onOverlayClick(e) {
    const pip = e.target.closest(".pip");
    if (pip) {
      this.dispatchEvent(new CustomEvent("color-selected", {
        bubbles: true, composed: true,
        detail: { color: pip.dataset.color },
      }));
    } else if (e.target.id === "overlay") {
      this.dispatchEvent(new CustomEvent("color-cancel", {
        bubbles: true, composed: true,
      }));
    }
  }
}

ColorPicker.registerTag("color-picker");
