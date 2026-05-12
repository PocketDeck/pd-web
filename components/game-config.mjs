import { FormComponent, html, css } from "/core/base.mjs";

class GameConfig extends FormComponent {
  static props = {
    game: "",
    config: null,
  };

  static games = ["Skipbo", "Skyjo", "UNO"];

  render() {
    const selected = (game) => (this.state.game === game ? "selected" : "");
    const options = GameConfig.games
      .map(g => html`<option value="${g.toLowerCase()}" ${selected(g.toLowerCase())}>${g}</option>`)
      .join("");

    let configPass = this.state.config ? html`config="${this.state.config}"` : "";

    return html`
      <select id="gameSelect" name="game" class="game-select" required>
        <option value="" disabled ${selected("")}>Select a Game</option>
        ${options}
      </select>
      <config-${this.state.game} name="config" ${configPass}></config-${this.state.game}>
    `;
  }

  styles() {
    return css`
      game-config {
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
        box-sizing: border-box;
      }

      .game-select:focus {
        border-color: #764ba2;
        box-shadow: 0 0 0 3px rgba(118, 75, 162, 0.2);
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
    this.on("change", (e) => {
      if (!e.target.closest("#gameSelect")) return;
      this.silent.config = null;
      this.state.game = e.target.value;
      const child = this._root.querySelector(`config-${this.state.game}`);
      this.silent.config = structuredClone(child?.silent.config ?? {});
      this.dispatchEvent(new CustomEvent("config-change", {
        bubbles: true,
        detail: { config: structuredClone(this.silent.config) },
      }));
      this.dispatchEvent(new CustomEvent("game-select", {
        bubbles: true,
        detail: { game: this.state.game },
      }));
    });

    this.on("config-change", (e) => {
      if (e.target === this) return;
      this.silent.config = structuredClone(e.detail.config);
      this.dispatchEvent(new CustomEvent("config-change", {
        bubbles: true,
        detail: { config: structuredClone(this.silent.config) },
      }));
    });
  }
}

await Promise.all(
  GameConfig.games.map(g => import(`/components/config/${g.toLowerCase()}.mjs`)),
);
GameConfig.registerTag("game-config");
