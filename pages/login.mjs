import { Page, html } from "/core/base.mjs";
import "/components/game-config.mjs";

class LoginPage extends Page {
  static props = {
    mode: "join",
    game: "",
    name: "",
    room: "",
    config: null,
  };
  static stylesLink = "/styles/pages/login.css";

  render({ mode, config, name, room, game }) {
    const activeClass = (tab) => (mode === tab ? "active" : "");

    const configAttr = config ? `config='${JSON.stringify(config)}'` : "";

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
          <input type="text" name="Name" placeholder="Enter your name" value="${name}" required />
          <input type="text" name="Room ID" class="roomId" placeholder="Enter Room ID" value="${room}" required />
          <button type="submit">Join</button>
        </form></div>`
      : mode === "create"
        ? html`
          <div><form>
            <h2>Create a Room</h2>
            <input type="text" name="Name" placeholder="Enter your name" value="${name}" required />
            <game-config name="Config" game="${game}" ${configAttr}></game-config>
            <button type="submit">Create</button>
          </form></div>`
        : "";

    return header + form;
  }

  }

  mounted() {
    const _target = (e) => e.composedPath().find(el => el.nodeType === 1);

    this.on("click", (e) => {
      const tab = _target(e)?.closest("[data-tab]");
      if (tab) this.state.mode = tab.dataset.tab;
    });

    this.on("change", (e) => {
      const input = _target(e)?.closest("input[name]");
      if (!input) return;
      this.silent[input.name === "Room ID" ? "room" : input.name.toLowerCase()] = input.value;
    });

    this.on("submit", (e) => {
      e.preventDefault();
      if (this.state.mode === "join") {
        this.send({ action: "join", name: this.state.name, roomID: this.state.room });
      } else {
        const msg = { action: "create", name: this.state.name, game: this.state.game };
        if (this.silent.config) msg.config = this.silent.config;
        this.send(msg);
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
