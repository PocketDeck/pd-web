import { FormComponent, html, css } from '/components/base.mjs';

class GameConfig extends FormComponent {
  static props = {
    game: '',
    config: null,
  }

  static games = ['Skipbo', 'Skyjo', 'UNO'];

  render({ props }) {
    const selected = (game) => props.game === game ? 'selected' : '';
    const options = GameConfig.games.map(game =>
      html`<option value="${game.toLowerCase()}" ${selected(game.toLowerCase())}>${game}</option>`
    ).join('');

    let configPass = props.config ? html`config="${props.config}"` : '';

    return html`
      <select id="gameSelect" name="game" class="game-select" required>
        <option value="" disabled ${selected('')}>Select a Game</option>
        ${options}
      </select>
      <config-${props.game} name="config" ${configPass}></config-${props.game}>
    `;
  }

  styles({ props }) {
    return css`
      :host {
        display: block;
        width: 100%;
      }

      .game-select {
        width: 100%;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        border: 1px solid #ccc;
        font-size: 1rem;
        outline: none;
        transition: border 0.2s, box-shadow 0.2s;
        background-color: #fff;
        color: #333;
        appearance: none;
        background-image: url('data:image/svg+xml;utf8,<svg fill="%23764ba2" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>');
        background-repeat: no-repeat;
        background-position: right 0.8rem center;
        background-size: 1rem;
      }

      .game-select:focus {
        border-color: #764ba2;
        box-shadow: 0 0 0 3px rgba(118,75,162,0.2);
      }

      config-skipbo,
      config-skyjo,
      config-uno {
        display: block;
        margin-top: 1.5rem;
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
  }

  mounted() {
    this.addShadowListener('change', (e) => {
      if (e.target.closest('#gameSelect')) {
        const defaultConfig = () => structuredClone(this.constructor.props.config);

        // Update game config form
        this.silentProps.config = defaultConfig();
        this.props.game = e.target.value;

        // Get config
        const config = this.shadowRoot.querySelector(`config-${this.props.game}`)?.props.config ?? defaultConfig();
        this.silentProps.config = structuredClone(config);

        const configEvent = new CustomEvent('config-change', { bubbles: true, detail: { config: structuredClone(this.props.config) } });
        const selectEvent = new CustomEvent('game-select', { bubbles: true, detail: { game: this.props.game } });
        this.dispatchEvent(configEvent);
        this.dispatchEvent(selectEvent);
      }
    });
    this.addShadowListener('config-change', (e) => {
      this.silentProps.config = structuredClone(e.detail.config);
      this.dispatchEvent(new e.constructor(e.type, e))
    });
  }
}

await Promise.all(GameConfig.games.map(game => import(`/components/config/${game.toLowerCase()}.mjs`)));
GameConfig.registerTag('game-config');
