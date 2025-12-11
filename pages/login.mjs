import { Page, html, css } from "/core/base.mjs";
import { basicStyle } from "/styles/styles.mjs";
import "/components/game-config.mjs";

class LoginPage extends Page {
  static props = {
    mode: "join",
    game: "",
    name: "",
    room: "",
    tabChange: false,
    gameConfig: null,
  };

  render({ props }) {
    const mode = props.mode;
    const activeClass = (tab) => (mode === tab ? "active" : "");

    const header = html`
      <h1>Game Room</h1>
      <div class="tab-container">
        <div
          class="tab ${activeClass("join")}"
          id="joinTab"
          data-tab-value="join"
        >
          Join Room
        </div>
        <div
          class="tab ${activeClass("create")}"
          id="createTab"
          data-tab-value="create"
        >
          Create Room
        </div>
      </div>
    `;

    const gameConfig = props.gameConfig
      ? html`config="${props.gameConfig}"`
      : "";

    const form =
      mode === "join"
        ? html` <div>
            <form id="joinForm">
              <h2>Join a Room</h2>
              <input
                type="text"
                name="Name"
                placeholder="Enter your name"
                value="${props.name}"
                required
              />
              <input
                type="text"
                name="Room ID"
                class="roomId"
                placeholder="Enter Room ID"
                value="${props.room}"
                required
              />
              <button type="submit">Join</button>
            </form>
          </div>`
        : mode === "create"
          ? html`
              <div>
                <form>
                  <h2>Create a Room</h2>
                  <input
                    type="text"
                    name="Name"
                    placeholder="Enter your name"
                    value="${props.name}"
                    required
                  />
                  <game-config
                    name="Config"
                    game="${props.game}"
                    ${gameConfig}
                  ></game-config>
                  <button type="submit">Create</button>
                </form>
              </div>
            `
          : "";

    return header + form;
  }

  mounted({ on, dispatchMessage }) {
    on("click", (e) => {
      if (e.target.closest(".tab")) {
        this.silentProps.tabChange = true;
        this.props.mode = e.target.dataset.tabValue;
        this.silentProps.tabChange = false;
      }
    });
    on("change", (e) => {
      if (e.target.closest('input[name="Name"]'))
        this.silentProps.name = e.target.value;
      else if (e.target.closest('input[name="Room ID"]'))
        this.silentProps.room = e.target.value;
    });
    on("submit", (e) => {
      e.preventDefault();

      let msg = { name: this.props.name };
      if (this.props.mode === "join") {
        msg.room = this.props.room;
      } else if (this.props.mode === "create") {
        msg.game = this.props.game;
        msg.config = this.props.gameConfig;
      }
      dispatchMessage(this.props.mode, msg);

      // TODO: remove
      this.navigate("lobby");
    });
    on("game-select", (e) => {
      this.silentProps.game = e.detail.game;
    });
    on("config-change", (e) => {
      this.silentProps.gameConfig = e.detail.config;
    });
  }

  styles({ props }) {
    const popAnimation = props.tabChange
      ? css`
          @keyframes pop {
            0% {
              scale: 1;
            }
            50% {
              scale: 1.2;
            }
            100% {
              scale: 1;
            }
          }
        `
      : "";

    return css`
      ${basicStyle}
      .tab-container {
        display: flex;
        justify-content: center;
        margin-bottom: 2rem;
        gap: 1rem;
      }

      .tab {
        padding: 0.75rem 2rem;
        cursor: pointer;
        font-weight: 600;
        color: #fff;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.15);
        transition:
          background 0.3s,
          transform 0.2s;
        text-decoration: none;
      }

      .tab:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-2px);
      }

      .tab.active {
        background: #fff;
        color: #764ba2;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        ${props.tabChange
          ? css`
              animation: pop 0.2s ease-in-out;
            `
          : ""}
      }

      ${popAnimation}

      form {
        background: rgba(255, 255, 255, 0.9);
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        width: 320px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      form * {
        animation: fade 0.5s ease-in-out;
      }

      @keyframes fade {
        from {
          opacity: 0;
          transform: translateY(5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      form h2 {
        margin-bottom: 1rem;
        font-size: 1.5rem;
        color: #333;
      }

      input[type="text"] {
        padding: 0.75rem 1rem;
        border-radius: 8px;
        border: 1px solid #ccc;
        font-size: 1rem;
        outline: none;
        transition:
          border 0.2s,
          box-shadow 0.2s;
      }

      input[type="text"]:focus {
        border-color: #764ba2;
        box-shadow: 0 0 0 3px rgba(118, 75, 162, 0.2);
      }

      button {
        padding: 0.75rem;
        border: none;
        border-radius: 8px;
        background: #764ba2;
        color: #fff;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition:
          background 0.3s,
          transform 0.2s;
      }

      button:hover {
        background: #667eea;
        transform: translateY(-2px);
      }

      .roomId {
        text-transform: uppercase;
      }

      @media (max-width: 400px) {
        form {
          width: 90%;
          padding: 1.5rem;
        }

        .tab {
          padding: 0.5rem 1.5rem;
        }
      }
    `;
  }
}

LoginPage.registerTag("login-page");
