import { Page, html } from "/core/base.mjs";

class LobbyPage extends Page {
  static props = {
    lobbyId: "XXXXXX",
    players: [],
    ready: false,
    game: null,
  };
  static stylesLink = "/styles/pages/lobby.css";

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

  }

  mounted() {
    this.on("click", (e) => {
      const root = e.composedPath().find(el => el.nodeType === 1);
      if (root?.closest(".ready-button")) {
        this.send({ action: this.state.ready ? "unready" : "ready" });
      }
      if (root?.closest(".leave-button")) {
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
