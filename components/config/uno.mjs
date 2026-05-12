import { FormComponent, html, css } from "/core/base.mjs";

class UNOConfig extends FormComponent {
  static props = {
    config: {
      play_after_draw: true,
      aggregate_draws: true,
      black_on_black: true,
    },
  };

  render() {
    const checked = (name) => this.state.config[name] ? "checked" : "";
    return html`
      <label><input type="checkbox" name="play_after_draw" ${checked("play_after_draw")} /> Play after draw</label>
      <label><input type="checkbox" name="aggregate_draws" ${checked("aggregate_draws")} /> Aggregate draws</label>
      <label><input type="checkbox" name="black_on_black" ${checked("black_on_black")} /> Black on black</label>
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
    `;
  }

  mounted() {
    this.on("change", (e) => {
      const input = e.target.closest("input");
      if (!input || !input.name) return;
      this.silent.config[input.name] = input.checked;
      this.dispatchEvent(new CustomEvent("config-change", {
        bubbles: true,
        detail: { config: structuredClone(this.silent.config) },
      }));
    });
  }
}

UNOConfig.registerTag("config-uno");
