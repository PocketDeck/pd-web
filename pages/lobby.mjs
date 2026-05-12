import { Page, html, css } from "/core/base.mjs";

class LobbyPage extends Page {
  static props = {
    lobbyId: "XXXXXX",
    players: [],
    ready: false,
    game: null,
  };

  render() {
    const playersHTML = this.state.players.length > 0
      ? this.state.players.map(p => `<li>${p.name}${p.ready ? " ✅" : ""}</li>`).join("")
      : "<li><em>Waiting for players...</em></li>";

    return html`
      <h1>Game Lobby</h1>
      <h3 class="lobby-id-container">Lobby ID: <span class="lobby-id">${this.state.lobbyId}</span></h3>
      <h2>${this.state.players.length > 0 ? "Waiting for Players..." : "Preparing Lobby..."}</h2>
      <ol class="player-list">${playersHTML}</ol>
      <div class="button-group">
        <button class="ready-button">${this.state.ready ? "Ready ✔" : "Ready"}</button>
        <button class="leave-button">Leave</button>
      </div>
    `;
  }

  styles() {
    return css`
      lobby-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
      h3.lobby-id-container { color: #fff; margin-bottom: 1rem; font-weight: 500; }
      .lobby-id { font-weight: 700; background: rgba(255, 255, 255, 0.15); padding: 0.25rem 0.75rem; border-radius: 8px; letter-spacing: 2px; }
      h2 { color: #fff; margin-bottom: 1rem; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2); }
      .player-list {
        background: rgba(255, 255, 255, 0.9); padding: 1.5rem; border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); width: 280px; max-width: 90%;
        text-align: left; margin-bottom: 2rem;
      }
      .player-list li { margin: 0.5rem 0; font-size: 1rem; color: #333; }
      .button-group { display: flex; gap: 1rem; justify-content: center; }
      button {
        padding: 0.75rem 1.5rem; border: none; border-radius: 8px;
        font-size: 1rem; font-weight: 600; cursor: pointer;
        transition: background 0.3s, transform 0.2s;
      }
      .ready-button { background: #764ba2; color: #fff; }
      .ready-button:hover { background: #667eea; transform: translateY(-2px); }
      .leave-button { background: rgba(255, 255, 255, 0.9); color: #764ba2; }
      .leave-button:hover { background: #fff; transform: translateY(-2px); }
      @media (max-width: 400px) {
        .player-list { width: 90%; padding: 1rem; }
        button { padding: 0.6rem 1rem; }
      }
    `;
  }

  mounted() {
    this.on("click", (e) => {
      if (e.target.closest(".ready-button")) {
        this.send({ action: this.state.ready ? "unready" : "ready" });
      }
      if (e.target.closest(".leave-button")) {
        this.send({ action: "leave" });
      }
    });

    this.onMessage("status", (data) => {
      this.setState({
        lobbyId: data.roomID,
        players: data.players,
        game: data.game,
      });
    });

    this.onMessage("players", (data) => {
      this.setState({ players: data.players });
    });

    this.onMessage("ready", () => {
      this.silent.ready = true;
      this._update();
    });

    this.onMessage("unready", () => {
      this.silent.ready = false;
      this._update();
    });

    this.onMessage("start", () => {
      // Server sends navigate to game page
    });

    this.onMessage("error", (data) => {
      console.warn("Server error:", data.error);
    });

    this.send({ action: "status" });
  }
}

LobbyPage.registerTag("lobby-page");
