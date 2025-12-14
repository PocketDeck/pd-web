import { Component, html, css } from "/core/base.mjs";
import { makeDraggable, containsDeep } from "/core/utils.mjs";

export class CardFan extends Component {
  styles() {
    return css`
      :host {
        --raise: -225%;
        --hover-raise: -42.5%;
        position: relative;
        display: grid;
      }

      slot::slotted(*) {
        display: none;
      }

      #fan,
      #placeholders {
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
        opacity: 0.5;
      }

      /* Wrapper: rotated and translated to create the fan */
      #fan .card-wrapper,
      #placeholders .card-wrapper {
        position: absolute;
        bottom: 0;
        transform-origin: 50% 100%;
        cursor: pointer;
        transform-style: preserve-3d;
        --angle: 0deg;
        transform: translateY(calc(-1 * var(--raise))) rotate(var(--angle))
          translateY(var(--raise));
        z-index: 0;
        transition:
          transform 300ms,
          translate 0s;
      }

      #fan .card-wrapper:hover:not(.card-placehoder) {
        animation: hover 1s ease-in-out infinite alternate forwards;
      }

      #placeholders {
        opacity: 0;
      }

      /* The actual card element fills wrapper */
      #fan .card-wrapper > *,
      #placeholders .card-wrapper > * {
        width: 100%;
        height: 100%;
        display: block;
        transition-duration: 200ms;
        position: relative;
        z-index: 3;
        pointer-events: none;
      }

      #fan .card-wrapper:hover:not(.card-placeholder) > * {
        transform: translateZ(1px) translateY(var(--hover-raise))
          rotate(calc(-1 * var(--angle))) scale(1.2);
      }

      @keyframes hover {
        to {
          translate: 0px 12px;
        }
      }
    `;
  }

  mounted({ on }) {
    this._slot = this.shadowRoot.querySelector("slot");
    this._fan = this.shadowRoot.querySelector("#fan");
    this._placeholders = this.shadowRoot.querySelector("#placeholders");

    on("slotchange", this.#layout.bind(this));
    queueMicrotask(this.#layout.bind(this));

    on("card-click", (e) => {
      e.detail.index = e.detail.card.closest(".card-wrapper").dataset.index;
    });
    this.#layout();
  }

  #wrapCard(card) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("card-wrapper");
    wrapper.appendChild(card);
    return wrapper;
  }

  #createPlaceholder(card) {
    const placeholder = this.#wrapCard(card.cloneNode(true));
    placeholder.classList.add("card-placeholder");
    return placeholder;
  }

  #updatePlaceholders(card) {
    const n = this._slot.assignedElements().length + 1;

    this._placeholders.innerHTML = "";

    // Create invisible cards for all cards except the one being dragged
    for (let i = 0; i < n; i++) {
      const placeholder = this.#createPlaceholder(card);
      placeholder.dataset.index = i;
      placeholder.style.zIndex = n - i;
      this._placeholders.appendChild(placeholder);
    }

    this.#layout2(this._placeholders);
  }

  placeholderCopy = null;

  #handleDragStart(e, index) {
    this.#updatePlaceholders(this._slot.assignedElements()[index]);
    this._placeholders.classList.add("dragging");

    const placeholders = this._placeholders.querySelectorAll(".card-wrapper");
    placeholders.forEach((card, i) => {
      card.addEventListener("dragenter", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (containsDeep(card, e.detail.old)) return true;

        if (this.placeholderCopy) this.placeholderCopy.remove();
        this.placeholderCopy = card.cloneNode(true);
        this.placeholderCopy.style.zIndex = 0;
        this._fan.insertBefore(this.placeholderCopy, this._fan.children[i]);
        this.#layout2(this._fan);
      });
      card.addEventListener("dragleave", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (containsDeep(card, e.detail.new)) return true;

        if (this.placeholderCopy) {
          this.placeholderCopy.remove();
          this.placeholderCopy = null;
          this.#layout2(this._fan);
        }
      });
    });
  }

  #handleDragStop() {
    if (this.placeholderCopy) {
      this.placeholderCopy.remove();
      this.placeholderCopy = null;
    }
    this._placeholders.classList.remove("dragging");
    this.#layout2(this._fan);
  }

  #layout() {
    // Clear existing content
    this._fan.innerHTML = "";
    this._placeholders.innerHTML = "";

    const cards = this._slot.assignedElements();
    const n = cards.length;

    cards.forEach((el, i) => {
      el = el.cloneNode(true);
      const wrapped = this.#wrapCard(el);
      wrapped.dataset.index = i;
      wrapped.style.zIndex = i;
      this._fan.appendChild(wrapped);

      const { onDragStart, onDragStop } = makeDraggable(wrapped);
      onDragStart((e) => this.#handleDragStart(e, i));
      onDragStop((e) => this.#handleDragStop(e));
    });

    this.#layout2(this._fan);
  }

  #layout2(container) {
    const n = container.children.length;
    const curvatureDeg = 70; // fan curvature

    const cards = Array.from(container.children);

    // convert htmlcollection to array
    cards.forEach((card, i) => {
      const center = (n - 1) / 2;
      const curveDeg = curvatureDeg * ((i - center) / n);
      const curve = `${curveDeg}deg`;

      card.style.setProperty("--angle", curve);
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

CardFan.registerTag("card-fan");
