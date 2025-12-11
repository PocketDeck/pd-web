import { html, css } from "/core/base.mjs";
import { Card } from "/components/card.mjs";

export class UnoCard extends Card {
  static props = {
    ...Card.props,
    type: "number", // number | skip | reverse | draw2 | wild | wild4
    color: "red", // red | green | blue | yellow | black (wild)
    value: "5", // 0-9 for number cards
  };

  styles({ props }) {
    const base = super.styles(this);
    const { color } = props;
    // Pick UNO-like color
    const palette = {
      red: "#f44336",
      green: "#4caf50",
      blue: "#2196f3",
      yellow: "#ffb300",
      black: "#111",
    };
    const c = palette[color] || palette.red;

    return (
      base +
      css`
        /* Single outer frame on the face */
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
          background: ${c};
        }

        .corner {
          position: absolute;
          font:
            700 20px system-ui,
            sans-serif;
          color: #fff;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        }
        .tl {
          top: 8px;
          left: 10px;
        }
        .br {
          bottom: 8px;
          right: 10px;
          transform: rotate(180deg);
        }

        .center {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          font:
            800 56px system-ui,
            sans-serif;
          color: #fff;
          text-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
        }

        /* Wild representation */
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
        .pip {
          border-radius: 6px;
        }
        .pip.red {
          background: ${palette.red};
        }
        .pip.green {
          background: ${palette.green};
        }
        .pip.blue {
          background: ${palette.blue};
        }
        .pip.yellow {
          background: ${palette.yellow};
        }
      `
    );
  }

  #label() {
    const { type, value } = this.props;
    if (type === "number") return String(value ?? "");
    if (type === "skip") return "⦸";
    if (type === "reverse") return "↺";
    if (type === "draw2") return "+2";
    if (type === "wild") return "W";
    if (type === "wild4") return "+4";
    return "";
  }

  renderFace() {
    const { type, color } = this.props;
    const label = this.#label();
    const isWild = type === "wild" || type === "wild4";

    return html`
      <div class="banner"></div>
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
}

UnoCard.registerTag("uno-card");
