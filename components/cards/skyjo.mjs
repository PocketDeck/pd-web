import { html, css } from "/core/base.mjs";
import { Card } from "/components/card.mjs";

export class SkyjoCard extends Card {
  static props = {
    ...Card.props,
    value: 0, // -2 to 12 for number cards
    isHidden: false, // true for face-down cards
  };

  styles({ props }) {
    const base = super.styles(this);
    const { isHidden } = props;

    const bgColor = isHidden ? "#4a6fa5" : "#f8f9fa";
    const textColor = isHidden ? "#fff" : "#333";
    const borderColor = isHidden ? "#3a5a80" : "#dee2e6";

    return (
      base +
      css`
        .face {
          background: ${bgColor};
          border-radius: 8px;
          border: 2px solid ${borderColor};
          overflow: hidden;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
        }

        .content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 8px;
          font-family: "Arial Rounded MT Bold", "Arial", sans-serif;
          color: ${textColor};
        }

        .value {
          font-size: ${isHidden ? "24px" : "40px"};
          font-weight: ${isHidden ? "400" : "800"};
          line-height: 1;
          text-align: center;
          ${isHidden ? "letter-spacing: 2px;" : ""}
        }

        .corner {
          position: absolute;
          width: 20px;
          height: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 12px;
          font-weight: 700;
        }

        .top-left {
          top: 4px;
          left: 4px;
        }
        .top-right {
          top: 4px;
          right: 4px;
        }
        .bottom-left {
          bottom: 4px;
          left: 4px;
        }
        .bottom-right {
          bottom: 4px;
          right: 4px;
        }

        .skyjo-logo {
          position: absolute;
          bottom: 6px;
          font-size: 10px;
          font-weight: 700;
          color: ${isHidden ? "rgba(255,255,255,0.7)" : "#6c757d"};
          letter-spacing: 0.5px;
        }
      `
    );
  }

  #getDisplayValue(value) {
    if (value < 0) return value; // Negative numbers like -2
    if (value === 0) return "0";
    return `+${value}`; // Positive numbers with + sign
  }

  renderFace() {
    const { value, isHidden } = this.props;
    const displayValue = isHidden ? "SKYJO" : this.#getDisplayValue(value);

    return html`
      <div class="content">
        <div class="value">${displayValue}</div>
        ${!isHidden
          ? html`
              <div class="corner top-left">${value}</div>
              <div class="corner top-right">${value}</div>
              <div class="corner bottom-left">${value}</div>
              <div class="corner bottom-right">${value}</div>
              <div class="skyjo-logo">SKYJO</div>
            `
          : ""}
      </div>
    `;
  }
}

SkyjoCard.registerTag("skyjo-card");
