import { Component, html, css } from '/components/base.mjs';
import { makeDraggable } from '/utils/utils.mjs';

export class CardFan extends Component {
  styles() {
    return css`
      :host {
        --raise: -225%;
        --hover-raise: -32%;
      }

      #fan {
        position: relative;
        width: 100%;
        display: flex;
        justify-content: center;
        transform-style: preserve-3d;
      }

      /* Wrapper: rotated and translated to create the fan */
      #fan .card-wrapper {
        position: absolute;
        bottom: 0;
        transform-origin: 50% 100%;
        cursor: pointer;
        transform-style: preserve-3d;
        --angle: 0deg;
        transform: translateY(calc(-1 * var(--raise))) rotate(var(--angle)) translateY(var(--raise));
        z-index: 0;
      }

      /* The actual card element fills wrapper */
      #fan .card-wrapper > * {
        width: 100%;
        height: 100%;
        display: block;
        transform-origin: 50% 50%;
        transition: transform 160ms ease;
        position: relative;
        z-index: 3;
      }

      #fan .card-wrapper::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: auto;
        background: transparent;
      }

      #fan .card-wrapper:not(:hover) > * {
        pointer-events: auto;
      }

      #fan .card-wrapper:hover > * {
        transform:
        rotate(calc(-1 * var(--angle)))
        translateY(var(--hover-raise))
        translateZ(1px)
        scale(1.2);
      }
    `;
  }

  mounted() {
    this._slot = this.shadowRoot.querySelector('slot');
    this._fan = this.shadowRoot.querySelector('#fan')
    this.addShadowListener('slotchange', this.#layout());
    queueMicrotask(() => this.#layout());

    this.addShadowListener('card-click', (e) => {
      e.detail.index = this.#getCardIndex(e.detail.card);
    });
  }

  #getCardIndex(card) {
    const children = this._fan.children;
    for (let i = 0; i < children.length; i++) {
      if (children[i].contains(card)) return i;
    }
    return -1;
  }

  #wrapCard(card, n, i) {
    const wrapper = document.createElement('div');
    const curvatureDeg = 70; // fan curvature
    const center = (n - 1) / 2;
    const curveDeg = curvatureDeg * ((i - center) / n);
    const curve = `${curveDeg}deg`;

    wrapper.classList.add('card-wrapper');

    // Provide layout via CSS custom properties
    wrapper.style.setProperty('--angle', curve);
    wrapper.style.zIndex = String(100 + i);

    // Ensure inner card can be targeted for hover rotation
    wrapper.appendChild(card);
    return wrapper;
  }

  #layout() {
    const cards = this._slot.assignedElements();
    const n = cards.length;

    cards.forEach((el, i) => {
      const wrapped = this.#wrapCard(el, n, i);
      this._fan.appendChild(wrapped);
      makeDraggable(wrapped);
    });
  }

  render() {
    return html`
      <div id="fan"></div>
      <slot></slot>
    `;
  }
}

CardFan.registerTag('card-fan');
