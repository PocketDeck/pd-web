import { html, css } from "/core/base.mjs";
import { Card } from "/components/card.mjs";

export class SkipboCard extends Card {
  static props = {
    ...Card.props,
    value: 1, // 1-12 for number cards, 0 for Skip-Bo cards
    isSkipbo: false, // true for Skip-Bo wild cards
  };

  styles({ props }) {
    const base = super.styles(this);
    const { isSkipbo } = props;

    const bgColor = isSkipbo ? "#ff6b6b" : "#f8f9fa";
    const textColor = isSkipbo ? "#fff" : "#333";
    const borderColor = isSkipbo ? "#e03131" : "#dee2e6";

    return (
      base +
      css`
        .face {
          background: ${bgColor};
          border-radius: 12px;
          border: 2px solid ${borderColor};
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 8px;
          font-family: system-ui, sans-serif;
          color: ${textColor};
        }

        .value {
          font-size: 32px;
          font-weight: 800;
          line-height: 1;
        }

        .label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }

        .corners {
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px;
          pointer-events: none;
        }

        .corner {
          font-size: 14px;
          font-weight: 700;
          transform: rotate(-90deg);
          transform-origin: center;
        }

        .corner:last-child {
          align-self: flex-end;
          transform: rotate(90deg);
        }
      `
    );
  }

  renderFace() {
    const { value, isSkipbo } = this.props;
    const displayValue = isSkipbo ? "SB" : value;
    const label = isSkipbo ? "Wild" : "Points";

    return html`
      <div class="content">
        <div class="value">${displayValue}</div>
        <div class="label">${label}</div>
      </div>
      <div class="corners">
        <div class="corner">${displayValue}</div>
        <div class="corner">${displayValue}</div>
      </div>
    `;
  }
}

SkipboCard.registerTag("skipbo-card");
