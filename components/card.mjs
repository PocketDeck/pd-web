import { Component, html, css } from "/core/base.mjs";

export class Card extends Component {
  static props = {
    width: 96,
    height: 136,
    faceup: true,
    interactive: true,
  };

  styles() {
    const { width, height, interactive } = this.state;
    return css`
      .card {
        width: ${width}px;
        height: ${height}px;
        position: relative;
        transition: transform 120ms ease;
        ${interactive === "false" || interactive === false
          ? "cursor: default;"
          : "cursor: pointer;"}
        will-change: transform;
        user-select: none;
      }

      .face {
        position: absolute;
        inset: 0;
        display: grid;
        grid-template-rows: auto 1fr auto;
        user-select: none;
      }
    `;
  }

  renderFace() { return ""; }

  render() {
    return html`
      <div class="card">
        ${this.state.faceup ? html`<div class="face">${this.renderFace()}</div>` : ""}
      </div>
    `;
  }

  mounted() {
    this.on("click", () => {
      this.dispatchEvent(new CustomEvent("card-click", {
        bubbles: true,
        detail: { card: this },
      }));
    });
  }
}
