import { Page, html, css } from "/core/base.mjs";
import { basicStyle } from "/styles/styles.mjs";

class LobbyPage extends Page {
  static props = {
    lobbyId: "XXXXXX",
    players: [],
    ready: false,
  };

  render({ props }) {
    const playersHTML =
      props.players.length > 0
        ? props.players
            .map((p) => `<li>${p.name}${p.ready ? " ✅" : ""}</li>`)
            .join("")
        : "<li><em>Waiting for players...</em></li>";

    return html`
      <h1>Game Lobby</h1>
      <h3 class="lobby-id-container">
        Lobby ID: <span class="lobby-id">${props.lobbyId}</span>
      </h3>

      <h2>
        ${props.players.length > 0
          ? "Waiting for Players..."
          : "Preparing Lobby..."}
      </h2>

      <ol class="player-list">
        ${playersHTML}
      </ol>

      <div class="button-group">
        <button class="ready-button">
          ${props.ready ? "Ready ✔" : "Ready"}
        </button>
        <button class="leave-button">Leave</button>
      </div>
    `;
  }

  mounted() {
    this.on("click", (e) => {
      if (e.target.closest(".ready-button")) {
        this.props.ready = !this.props.ready;

        // TODO: remove
        this.navigate("/games/uno");
      }

      if (e.target.closest(".leave-button")) {
        this.dispatchMessage("leave");

        // TODO: remove
        this.navigate("login");
      }
    });

    this.dispatchMessage("status");

    onMessage("status", (msg) => {
      this.setState({
        players: msg.players,
        ready: msg.ready,
        lobbyId: msg.lobbyId,
      });
    });
  }

  styles({ props }) {
    return css`
      ${basicStyle}
      h3.lobby-id-container {
        color: #fff;
        margin-bottom: 1rem;
        font-weight: 500;
      }

      .lobby-id {
        font-weight: 700;
        background: rgba(255, 255, 255, 0.15);
        padding: 0.25rem 0.75rem;
        border-radius: 8px;
        letter-spacing: 2px;
      }

      h2 {
        color: #fff;
        margin-bottom: 1rem;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
      }

      .player-list {
        background: rgba(255, 255, 255, 0.9);
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        list-style: decimal;
        width: 280px;
        max-width: 90%;
        text-align: left;
        margin-bottom: 2rem;
      }

      .player-list li {
        margin: 0.5rem 0;
        font-size: 1rem;
        color: #333;
        ${props.players.length > 0 ? "" : "list-style-type: none;"}
      }

      .player-list li.waiting {
        color: #999;
        font-style: italic;
        text-align: center;
      }

      .button-group {
        display: flex;
        gap: 1rem;
        justify-content: center;
      }

      button {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition:
          background 0.3s,
          transform 0.2s;
      }

      .ready-button {
        background: #764ba2;
        color: #fff;
      }

      .ready-button:hover {
        background: #667eea;
        transform: translateY(-2px);
      }

      .leave-button {
        background: rgba(255, 255, 255, 0.9);
        color: #764ba2;
      }

      .leave-button:hover {
        background: #fff;
        transform: translateY(-2px);
      }

      @media (max-width: 400px) {
        .player-list {
          width: 90%;
          padding: 1rem;
        }

        button {
          padding: 0.6rem 1rem;
        }
      }
    `;
  }
}

LobbyPage.registerTag("lobby-page");
