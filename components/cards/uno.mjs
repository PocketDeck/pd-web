import { html, css } from "/core/base.mjs";
import { Card } from "/components/card.mjs";

export function decodeCardId(id) {
  if (id >= 52) {
    return { kind: id === 52 ? "wild" : "wilddraw4", color: "black", value: 0 };
  }
  const colors = ["red", "blue", "green", "yellow"];
  const color = colors[Math.floor(id / 13)];
  const ki = id % 13;
  if (ki <= 9) return { color, kind: "number", value: ki };
  const specials = ["skip", "reverse", "draw2"];
  return { color, kind: specials[ki - 10], value: 0 };
}

export class UnoCard extends Card {
  static props = {
    ...Card.props,
    type: "number",
    color: "red",
    value: "5",
  };

  styles() {
    const base = super.styles();

    return base + css`
      .face {
        background: #fff;
        border-radius: 12px;
        border: 2px solid rgba(255, 255, 255, 0.9);
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
      }

      .banner {
        position: absolute;
        inset: 6px;
        border-radius: 10px;
      }

      .corner {
        position: absolute;
        font: 700 20px system-ui, sans-serif;
        color: #fff;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      }
      .tl { top: 8px; left: 10px; }
      .br { bottom: 8px; right: 10px; transform: rotate(180deg); }

      .center {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font: 800 56px system-ui, sans-serif;
        color: #fff;
        text-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
      }

      .wild {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
      }
      .wild .pips {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        width: 56px;
        height: 56px;
      }
      .pip { border-radius: 6px; }
      .pip.red { background: #f44336; }
      .pip.green { background: #4caf50; }
      .pip.blue { background: #2196f3; }
      .pip.yellow { background: #ffb300; }

      .card.face-down {
        background: linear-gradient(145deg, #1c1c4a, #0a0a20);
        border-radius: 12px;
        border: 2px solid rgba(255,255,255,0.12);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        overflow: hidden;
      }

      .card.face-down::before {
        content: ""; position: absolute; inset: 6px;
        border-radius: 8px;
        border: 1.5px solid rgba(255,255,255,0.06);
      }

      .card.face-down::after {
        content: "UNO";
        position: absolute; inset: 0;
        display: grid; place-items: center;
        font: 800 1.1rem system-ui, sans-serif;
        color: rgba(255,255,255,0.08);
        letter-spacing: 0.2em;
      }
    `;
  }

  #label() {
    const { type, value } = this.state;
    if (type === "number") return String(value ?? "");
    if (type === "skip") return "⦸";
    if (type === "reverse") return "↺";
    if (type === "draw2") return "+2";
    if (type === "wild") return "W";
    if (type === "wild4" || type === "wilddraw4") return "+4";
    return "";
  }

  renderFace() {
    const { color, type } = this.state;
    const palette = {
      red: "#f44336", green: "#4caf50", blue: "#2196f3",
      yellow: "#ffb300", black: "#111",
    };
    const c = palette[color] || palette.red;
    const label = this.#label();
    const isWild = type === "wild" || type === "wild4" || type === "wilddraw4";

    return html`
      <div class="banner" style="background:${c}"></div>
      ${!isWild
        ? html`
          <div class="corner tl">${label}</div>
          <div class="center">${label}</div>
          <div class="corner br">${label}</div>
        `
        : html`
          <div class="corner tl">${label}</div>
          <div class="wild">
            <div class="pips">
              <div class="pip red"></div>
              <div class="pip yellow"></div>
              <div class="pip green"></div>
              <div class="pip blue"></div>
            </div>
          </div>
          <div class="corner br">${label}</div>
        `}
    `;
  }

  renderBack() { return ""; }
}

UnoCard.registerTag("uno-card");
