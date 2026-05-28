import { FormComponent, html, css } from "/core/base.mjs";

class UNOConfig extends FormComponent {
  static props = {
    cardsPerPlayer: 7,
    playAfterDraw: true,
    aggregateDraws: true,
    blackOnBlack: true,
  };

  static get observedAttributes() {
    return [...Object.keys(UNOConfig.props), "config"];
  }

  attributeChangedCallback(name, _, value) {
    if (name !== "config") { super.attributeChangedCallback(name, _, value); return; }
    try {
      const parsed = JSON.parse(value);
      for (const k of Object.keys(UNOConfig.props)) {
        if (k in parsed) this.state[k] = parsed[k];
      }
    } catch {}
  }

  render({ cardsPerPlayer, playAfterDraw, aggregateDraws, blackOnBlack }) {
    return html`
      <label>Cards per player: <input type="number" name="cardsPerPlayer" value="${cardsPerPlayer}" min="1" max="15" /></label>
      <label><input type="checkbox" name="playAfterDraw" ${playAfterDraw ? "checked" : ""} /> Play after draw</label>
      <label><input type="checkbox" name="aggregateDraws" ${aggregateDraws ? "checked" : ""} /> Aggregate draws</label>
      <label><input type="checkbox" name="blackOnBlack" ${blackOnBlack ? "checked" : ""} /> Black on black</label>
    `;
  }

  styles() {
    return css`
      config-uno {
        display: block;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 8px;
      }
      label {
        display: flex; align-items: center; gap: 0.5rem;
        font-size: 0.95rem; color: #333; margin-bottom: 0.75rem; cursor: pointer;
      }
      input[type="checkbox"] {
        accent-color: #764ba2; width: 1rem; height: 1rem; cursor: pointer;
      }
      input[type="number"] {
        width: 4rem; padding: 0.25rem; border: 1px solid #ccc; border-radius: 4px;
        font-size: 0.9rem; text-align: center;
      }
    `;
  }

  mounted() {
    this.on("change", (e) => {
      const input = e.target.closest("input");
      if (!input || !input.name) return;
      this.silent[input.name] = input.type === "checkbox" ? input.checked : parseInt(input.value) || 0;
      this.dispatchEvent(new CustomEvent("config-change", {
        bubbles: true,
        detail: { config: Object.fromEntries(
          Object.keys(this.constructor.props).map(k => [k, this.silent[k]])
        )},
      }));
    });
  }
}

UNOConfig.registerTag("config-uno");
