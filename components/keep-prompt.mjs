import { Component, html, css } from "/core/base.mjs";

export class KeepPrompt extends Component {
  static props = { visible: false, cardAttrs: {} };

  render({ visible, cardAttrs }) {
    if (!visible) return "";
    return html`
      <div id="overlay" on:click="onOverlayClick">
        <div id="box">
          <div id="card-area">
            <uno-card color="${cardAttrs.color}" type="${cardAttrs.type}" value="${cardAttrs.value}"></uno-card>
          </div>
          <div id="message">Play this card or keep it?</div>
          <div id="buttons">
            <button class="btn play" on:click="onPlay">Play</button>
            <button class="btn keep" on:click="onKeep">Keep</button>
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
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      #card-area {
        width: 120px; height: 180px;
      }
      #card-area uno-card {
        width: 100%; height: 100%;
      }
      #message {
        font-size: 1rem;
        color: rgba(255,255,255,0.7);
        font-weight: 500;
      }
      #buttons {
        display: flex; gap: 12px;
      }
      .btn {
        padding: 10px 28px;
        border-radius: 10px;
        border: none;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: transform .12s, filter .12s;
      }
      .btn:hover { transform: scale(1.08); filter: brightness(1.15); }
      .btn:active { transform: scale(0.95); }
      .btn.play {
        background: linear-gradient(135deg, #4caf50, #388e3c);
        color: #fff;
      }
      .btn.keep {
        background: rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.7);
        border: 1px solid rgba(255,255,255,0.12);
      }
    `;
  }

  show(cardAttrs) {
    this.state.cardAttrs = cardAttrs;
    this.state.visible = true;
  }

  hide() {
    this.state.visible = false;
  }

  onOverlayClick(e) {
    if (e.target.id === "overlay") {
      this.dispatchEvent(new CustomEvent("keep-cancel", {
        bubbles: true, composed: true,
      }));
    }
  }

  onPlay() {
    this.dispatchEvent(new CustomEvent("keep-play", {
      bubbles: true, composed: true,
    }));
  }

  onKeep() {
    this.dispatchEvent(new CustomEvent("keep-keep", {
      bubbles: true, composed: true,
    }));
  }
}

KeepPrompt.registerTag("keep-prompt");
