import { Component, html, css } from '/components/base.mjs';

export class Card extends Component {
  static defaultProps = {
    width: 96,    // px
    height: 136,  // px
    faceup: true,
    interactive: true,
  };

  styles() {
    const { width, height, interactive } = this.props;
    return css`
      :host {
        display: inline-block;
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

  render() {
    const { faceup } = this.props;
    return html`
      <div class="card">
        ${faceup ? html`<div class="face">${this.renderFace()}</div>` : ''}
      </div>
    `;
  }

  mounted() {
    this.addShadowListener('click', () => {
      const event = new CustomEvent('card-click', {
        bubbles: true,
        composed: true,
        detail: { card: this }
      });
      this.dispatchEvent(event);
    });
  }
}

