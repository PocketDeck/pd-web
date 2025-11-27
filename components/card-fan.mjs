import { Component, html, css } from '/core/base.mjs';
import { makeDraggable, containsDeep } from '/utils/utils.mjs';

export class CardFan extends Component {
  styles() {
    return css`
      :host {
        --raise: -225%;
        --hover-raise: -32%;
        position: relative;
        display: grid;
      }

      slot::slotted(*) {
        display: none;
      }

      #fan, #placeholders {
        grid-column: 1 / 2;
        position: absolute;
        width: 100%;
        display: flex;
        justify-content: center;
        transform-style: preserve-3d;
      }

      #fan {
        z-index: 2;
      }
      
      #placeholders {
        z-index: 1;
      }
      
      #placeholders.dragging {
        z-index: 3;
      }
      
      .card-placeholder {
        border: 2px dashed #999;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        opacity: 0.8;
      }

      /* Wrapper: rotated and translated to create the fan */
      #fan .card-wrapper, #placeholders .card-wrapper {
        position: absolute;
        bottom: 0;
        transform-origin: 50% 100%;
        cursor: pointer;
        transform-style: preserve-3d;
        --angle: 0deg;
        transform: translateY(calc(-1 * var(--raise))) rotate(var(--angle)) translateY(var(--raise));
        z-index: 0;
      }

      #placeholders {
        opacity: 0;
      }

      #fan .card-wrapper {
        opacity: 1;
      }

      /* The actual card element fills wrapper */
      #fan .card-wrapper > *, #placeholders .card-wrapper > * {
        width: 100%;
        height: 100%;
        display: block;
        transform-origin: 50% 50%;
        transition: transform 160ms ease;
        position: relative;
        z-index: 3;
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
    this._fan = this.shadowRoot.querySelector('#fan');
    this._placeholders = this.shadowRoot.querySelector('#placeholders');
    
    this.addShadowListener('slotchange', this.#layout.bind(this));
    queueMicrotask(this.#layout.bind(this));

    this.addShadowListener('card-click', (e) => {
      e.detail.index = e.detail.card.closest('.card-wrapper').dataset.index;
    });
  }

  #wrapCard(card, n, i) {
    const wrapper = document.createElement('div');
    const curvatureDeg = 70; // fan curvature
    const center = (n - 1) / 2;
    const curveDeg = curvatureDeg * ((i - center) / n);
    const curve = `${curveDeg}deg`;

    wrapper.classList.add('card-wrapper');
    wrapper.dataset.index = i;
    wrapper.style.setProperty('--angle', curve);
    wrapper.style.zIndex = i;
    wrapper.appendChild(card);
    return wrapper;
  }

  #createPlaceholder(card, n, i) {
    const placeholder = this.#wrapCard(card.cloneNode(true), n, i);
    placeholder.classList.add('card-placeholder');
    placeholder.style.opacity = '0.5';
    return placeholder;
  }

  #updatePlaceholders(card) {
    const n = this._slot.assignedElements().length + 1;

    this._placeholders.innerHTML = '';
    
    // Create invisible cards for all cards except the one being dragged
    for (let i = 0; i < n; i++) {
      const placeholder = this.#createPlaceholder(card, n, i);
      this._placeholders.appendChild(placeholder);
    }
  }

  #handleDragStart(e, index) {
    this.#updatePlaceholders(this._slot.assignedElements()[index]);
    this._placeholders.classList.add('dragging');

    const placeholders = this._placeholders.querySelectorAll('.card-wrapper');
    let copy = null;
    placeholders.forEach((card, i) => {
      card.addEventListener('dragenter', (e) => {
        if (containsDeep(card, e.detail.old)) return true;
        copy = card.cloneNode(true);
        this._fan.insertBefore(copy, this._fan.children[i]);
      });
      card.addEventListener('dragleave', (e) => {
        if (containsDeep(card, e.detail.new)) return true;
        copy.remove();
        copy = null;
      });
    });
  }

  #handleDragStop(e) {
    this._placeholders.classList.remove('dragging');
  }

  #layout() {
    // Clear existing content
    this._fan.innerHTML = '';
    this._placeholders.innerHTML = '';
    
    const cards = this._slot.assignedElements();
    const n = cards.length;

    cards.forEach((el, i) => {
      el = el.cloneNode(true);
      const wrapped = this.#wrapCard(el, n, i);
      this._fan.appendChild(wrapped);
      
      const { onDragStart, onDragStop } = makeDraggable(wrapped);
      onDragStart((e) => this.#handleDragStart(e, i));
      onDragStop((e) => this.#handleDragStop(e));
    });
  }

  render() {
    return html`
      <div id="fan"></div>
      <div id="placeholders"></div>
      <slot></slot>
    `;
  }
}

CardFan.registerTag('card-fan');
