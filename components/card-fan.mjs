import { Component, html, css } from '/core/base.mjs';
import { makeDraggable } from '/utils/utils.mjs';

export class CardFan extends Component {
  styles() {
    return css`
      :host {
        --raise: -225%;
        --hover-raise: -32%;
        position: relative;
        display: block;
      }

      slot::slotted(*) {
        display: none;
      }

      #fan, #invisible-fan {
        position: relative;
        width: 100%;
        display: flex;
        justify-content: center;
        transform-style: preserve-3d;
      }
      
      #invisible-fan {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 1;
      }
      
      #invisible-fan.dragging {
        z-index: 1000;
      }
      
      .card-placeholder {
        border: 2px dashed #999;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        opacity: 0.8;
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

  constructor() {
    super();
    this._draggedIndex = -1;
    this._placeholderIndex = -1;
    this._dragOverIndex = -1;
  }

  mounted() {
    this._slot = this.shadowRoot.querySelector('slot');
    this._fan = this.shadowRoot.querySelector('#fan');
    this._invisibleFan = this.shadowRoot.querySelector('#invisible-fan');
    
    this.addShadowListener('slotchange', this.#layout.bind(this));
    queueMicrotask(this.#layout.bind(this));

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

  #wrapCard(card, n, i, isInvisible = false) {
    const wrapper = document.createElement('div');
    const curvatureDeg = 70; // fan curvature
    const center = (n - 1) / 2;
    const curveDeg = curvatureDeg * ((i - center) / n);
    const curve = `${curveDeg}deg`;

    wrapper.classList.add('card-wrapper');
    if (isInvisible) {
      wrapper.style.pointerEvents = 'auto';
      wrapper.style.opacity = '0';
      wrapper.dataset.index = i;
    }

    // Provide layout via CSS custom properties
    wrapper.style.setProperty('--angle', curve);
    wrapper.style.zIndex = String(100 + i);

    // Ensure inner card can be targeted for hover rotation
    if (card) {
      wrapper.appendChild(card);
    } else if (isInvisible) {
      // For invisible fan, add a placeholder div with the same dimensions
      const placeholder = document.createElement('div');
      placeholder.style.width = '100%';
      placeholder.style.height = '100%';
      wrapper.appendChild(placeholder);
    }
    
    return wrapper;
  }

  #updateInvisibleFan() {
    // Clear invisible fan
    this._invisibleFan.innerHTML = '';
    
    const cards = this._fan.children;
    const n = cards.length;
    
    // Create invisible cards for all cards except the one being dragged
    for (let i = 0; i < n; i++) {
      if (i !== this._draggedIndex) {
        const invisibleCard = this.#wrapCard(null, n, i, true);
        this._invisibleFan.appendChild(invisibleCard);
      }
    }
  }

  #updatePlaceholder(index) {
    if (this._placeholderIndex === index) return;
    
    // Remove existing placeholder
    const existingPlaceholder = this._fan.querySelector('.card-placeholder');
    if (existingPlaceholder) {
      existingPlaceholder.remove();
    }
    
    if (index >= 0 && index < this._fan.children.length) {
      // Create and insert new placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'card-wrapper card-placeholder';
      const targetCard = this._fan.children[index];
      this._fan.insertBefore(placeholder, targetCard);
      this._placeholderIndex = index;
    } else {
      this._placeholderIndex = -1;
    }
  }

  #handleDragStart(e, index) {
    this._draggedIndex = index;
    this._invisibleFan.classList.add('dragging');
    this.#updateInvisibleFan();
    
    // Add drag enter/leave handlers to invisible fan
    const invisibleCards = this._invisibleFan.querySelectorAll('.card-wrapper');
    invisibleCards.forEach((card, i) => {
      const cardIndex = parseInt(card.dataset.index);
      
      card.addEventListener('pointerenter', () => {
        this._dragOverIndex = cardIndex >= this._draggedIndex ? cardIndex + 1 : cardIndex;
        this.#updatePlaceholder(this._dragOverIndex);
      });
      
      card.addEventListener('pointerleave', () => {
        if (this._dragOverIndex >= 0) {
          this.#updatePlaceholder(-1);
          this._dragOverIndex = -1;
        }
      });
    });
  }

  #handleDragStop(e) {
    if (this._dragOverIndex >= 0) {
      // Move the dragged card to the new position
      const draggedCard = this._fan.children[this._draggedIndex];
      const targetPos = this._dragOverIndex > this._draggedIndex ? 
        this._dragOverIndex - 1 : this._dragOverIndex;
      
      this._fan.insertBefore(draggedCard, this._fan.children[targetPos]);
      
      // Dispatch event to notify about the reorder
      this.dispatchEvent(new CustomEvent('reorder', {
        detail: {
          from: this._draggedIndex,
          to: targetPos
        }
      }));
      
      this.#updatePlaceholder(-1);
    }
    
    this._invisibleFan.classList.remove('dragging');
    this._draggedIndex = -1;
    this._dragOverIndex = -1;
    this._invisibleFan.innerHTML = '';
  }

  #layout() {
    // Clear existing content
    this._fan.innerHTML = '';
    
    const cards = this._slot.assignedElements();
    const n = cards.length;

    cards.forEach((el, i) => {
      el = el.cloneNode(true);
      const wrapped = this.#wrapCard(el, n, i);
      this._fan.appendChild(wrapped);
      
      const { onDragStart, onDragStop } = makeDraggable(wrapped);
      onDragStart((e) => this.#handleDragStart(e, i));
      onDragStop(() => this.#handleDragStop());
    });
    
    // Update invisible fan
    this.#updateInvisibleFan();
  }

  render() {
    return html`
      <div id="fan"></div>
      <div id="invisible-fan"></div>
      <slot></slot>
    `;
  }
}

CardFan.registerTag('card-fan');
