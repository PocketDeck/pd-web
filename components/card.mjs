import { Component, html, css } from '/core/base.mjs';

export class Card extends Component {
  static props = {
    width: 96,    // px
    height: 136,  // px
    faceup: true,
    interactive: true,
  };

  styles({ props }) {
    const { width, height, interactive } = props;
    return css`
      :host {
        display: block;
        --card-w: ${width}px;
        --card-h: ${height}px;
        contain: content;
        user-select: none;
        -webkit-user-select: none;
      }

      .card {
        width: var(--card-w);
        height: var(--card-h);
        position: relative;
        transition: transform 120ms ease;
        ${interactive === 'false' || interactive === false ? 'cursor: default;' : 'cursor: pointer;'}
        will-change: transform;
        user-select: none;
        -webkit-user-select: none;
      }

      .face {
        position: absolute;
        inset: 0;
        display: grid;
        grid-template-rows: auto 1fr auto;
        user-select: none;
        -webkit-user-select: none;
      }
    `;
  }

  // Override in subclasses to draw the face
  renderFace() { return ''; }

  render({ props }) {
    const { faceup } = props;
    return html`
      <div class="card">
        ${faceup ? html`<div class="face">${this.renderFace()}</div>` : ''}
      </div>
    `;
  }

  mounted({ on, dispatchEvent }) {
    on('click', () => {
      const event = new CustomEvent('card-click', {
        bubbles: true,
        composed: true,
        detail: { card: this }
      });
      dispatchEvent(event);
    });
  }
}

