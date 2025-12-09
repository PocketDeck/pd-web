import { FormComponent, html, css } from '/core/base.mjs';

class UNOConfig extends FormComponent {
  static props = {
    config: {
      play_after_draw: true,
      aggregate_draws: true,
      black_on_black: true,
    }
  }

  render() {
    const nameAndCheckedAttr = (name) => `name="${name}" ${this.props.config[name] ? 'checked' : ''}`;

    return html`
      <label>
        <input type="checkbox" ${nameAndCheckedAttr("play_after_draw")}>
        Play after draw
      </label>
      <br>
      <label>
        <input type="checkbox" ${nameAndCheckedAttr("aggregate_draws")}>
        Aggregate draws
      </label>
      <br>
      <label>
        <input type="checkbox" ${nameAndCheckedAttr("black_on_black")}>
        Black on black
      </label>
      <br>
    `;
  }

  styles() {
    return css`
      :host {
        display: block;
        padding: 1rem;
        background: rgba(255,255,255,0.8);
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        animation: fadeIn 0.3s ease-out;
      }

      label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.95rem;
        color: #333;
        margin-bottom: 0.75rem;
        cursor: pointer;
        transition: color 0.2s;
      }

      label:hover {
        color: #764ba2;
      }

      input[type="checkbox"] {
        accent-color: #764ba2;
        width: 1rem;
        height: 1rem;
        cursor: pointer;
        transform: scale(1.1);
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
  }

  mounted({ on, dispatchEvent }) {
    on('change', (e) => {
      const input = e.target.closest('input');
      if (!input || !input.name) return;

      this.silentProps.config[input.name] = input.checked;
      const event = new CustomEvent('config-change', { bubbles: true, detail: { config: this.props.config } });
      dispatchEvent(event);
    });
  }
}

UNOConfig.registerTag('config-uno');
