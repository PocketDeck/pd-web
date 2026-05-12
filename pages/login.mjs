import { Page, html, css } from "/core/base.mjs";
import "/components/game-config.mjs";

class LoginPage extends Page {
  static props = {
    mode: "join",
    game: "",
    name: "",
    room: "",
    config: null,
  };

  render() {
    const mode = this.state.mode;
    const activeClass = (tab) => (mode === tab ? "active" : "");

    const header = html`
      <h1>Game Room</h1>
      <div class="tab-container">
        <div class="tab ${activeClass("join")}" data-tab="join">Join Room</div>
        <div class="tab ${activeClass("create")}" data-tab="create">Create Room</div>
      </div>
    `;

    const form = mode === "join"
      ? html`
        <div><form id="joinForm">
          <h2>Join a Room</h2>
          <input type="text" name="Name" placeholder="Enter your name" value="${this.state.name}" required />
          <input type="text" name="Room ID" class="roomId" placeholder="Enter Room ID" value="${this.state.room}" required />
          <button type="submit">Join</button>
        </form></div>`
      : mode === "create"
        ? html`
          <div><form>
            <h2>Create a Room</h2>
            <input type="text" name="Name" placeholder="Enter your name" value="${this.state.name}" required />
            <game-config name="Config" game="${this.state.game}" config="${this.state.config}"></game-config>
            <button type="submit">Create</button>
          </form></div>`
        : "";

    return header + form;
  }

  styles() {
    return css`
      login-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
      .tab-container { display: flex; justify-content: center; margin-bottom: 2rem; gap: 1rem; }
      .tab {
        padding: 0.75rem 2rem; cursor: pointer; font-weight: 600; color: #fff;
        border-radius: 999px; background: rgba(255, 255, 255, 0.15);
        transition: background 0.3s, transform 0.2s;
      }
      .tab:hover { background: rgba(255, 255, 255, 0.25); transform: translateY(-2px); }
      .tab.active { background: #fff; color: #764ba2; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }

      form {
        background: rgba(255, 255, 255, 0.9); padding: 2rem; border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); width: 320px;
        display: flex; flex-direction: column; gap: 1rem; text-align: center;
      }
      form * { animation: fade 0.5s ease-in-out; }
      @keyframes fade {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      form h2 { margin-bottom: 1rem; font-size: 1.5rem; color: #333; }
      input[type="text"] {
        padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #ccc;
        font-size: 1rem; outline: none; transition: border 0.2s, box-shadow 0.2s;
        box-sizing: border-box; width: 100%;
      }
      input[type="text"]:focus { border-color: #764ba2; box-shadow: 0 0 0 3px rgba(118, 75, 162, 0.2); }
      button {
        padding: 0.75rem; border: none; border-radius: 8px; background: #764ba2;
        color: #fff; font-size: 1rem; font-weight: 600; cursor: pointer;
        transition: background 0.3s, transform 0.2s;
      }
      button:hover { background: #667eea; transform: translateY(-2px); }
      .roomId { text-transform: uppercase; }
      @media (max-width: 400px) {
        form { width: 90%; padding: 1.5rem; }
        .tab { padding: 0.5rem 1.5rem; }
      }
    `;
  }

  mounted() {
    this.on("click", (e) => {
      const tab = e.target.closest("[data-tab]");
      if (tab) {
        this.silent.mode = tab.dataset.tab;
        this._update();
      }
    });

    this.on("change", (e) => {
      const input = e.target.closest("input[name]");
      if (!input) return;
      this.silent[input.name === "Room ID" ? "room" : input.name.toLowerCase()] = input.value;
    });

    this.on("submit", (e) => {
      e.preventDefault();
      if (this.state.mode === "join") {
        this.send({ action: "join", name: this.state.name, roomID: this.state.room });
      } else {
        this.send({ action: "create", name: this.state.name, game: this.state.game });
      }
    });

    this.onMessage("joined", (data) => {
      this.silent.room = data.roomID;
    });

    this.onMessage("error", (data) => {
      console.warn("Server error:", data.error);
    });

    this.on("game-select", (e) => { this.silent.game = e.detail.game; });
    this.on("config-change", (e) => { this.silent.config = e.detail.config; });
  }
}

LoginPage.registerTag("login-page");
