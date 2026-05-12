import { Page, html, css } from "/core/base.mjs";
import "/components/cards/uno.mjs";
import "/components/card-fan.mjs";

export class UnoPage extends Page {
  static props = {
    game: null,
    hand: [
      { color: "red", kind: "number", value: 7 },
      { color: "blue", kind: "number", value: 3 },
      { color: "yellow", kind: "skip" },
      { color: "green", kind: "reverse" },
      { color: "red", kind: "draw2" },
      { color: "blue", kind: "number", value: 9 },
      { color: "black", kind: "wild" },
      { color: "black", kind: "wilddraw4" },
      { color: "yellow", kind: "number", value: 5 },
      { color: "green", kind: "number", value: 1 },
    ],
  };

  #pendingPlay = null;
  #playerMap = {};

  styles() {
    return css`
      uno-page {
        background: linear-gradient(155deg, #6a9b75, #2e2e2e);
        display: flex; flex-direction: column; height: 100vh;
      }
      #board {
        flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 1rem; color: #fff;
      }
      #play-area {
        display: flex; gap: 2rem; align-items: center; margin: 2rem 0;
      }
      #draw-pile { cursor: pointer; position: relative; }
      #draw-pile .count {
        position: absolute; bottom: -1.5rem; left: 50%; transform: translateX(-50%);
        font-size: 0.9rem; color: rgba(255,255,255,0.7);
      }
      #info { text-align: center; margin: 1rem 0; }
      #info .turn { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
      .players { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
      .player {
        background: rgba(255,255,255,0.1); padding: 0.25rem 0.75rem;
        border-radius: 999px; font-size: 0.85rem;
      }
      .game-over {
        text-align: center; margin-top: 2rem; font-size: 1.5rem; font-weight: 700;
      }
      .prompt { color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-top: 2rem; }
      card-fan { position: fixed; bottom: 0; left: 0; right: 0; }
    `;
  }

  #playerName(id) {
    return this.#playerMap[id] ?? `Player ${id}`;
  }

  render() {
    const g = this.state.game;
    const hand = this.state.hand ?? [];
    const cards = hand.map(c => ({
      tag: "uno-card",
      color: c.color || "black",
      value: String(c.value ?? ""),
      type: c.kind || "number",
    }));

    return html`
      <div id="board">
        ${g
          ? g.state === "over"
            ? html`
              <div class="game-over">
                <div>Game Over!</div>
                <div>Winner: ${this.#playerName(g.winner)}</div>
              </div>`
            : html`
              <div id="play-area">
                <div id="draw-pile" class="pile" data-action="draw">
                  <uno-card face-down></uno-card>
                  <span class="count">${g.drawPile}</span>
                </div>
                <div id="discard">
                  <uno-card color="${g.topCard?.color}" type="${g.topCard?.kind}" value="${g.topCard?.value}"></uno-card>
                </div>
              </div>
              <div id="info">
                <div class="turn">${this.#playerName(g.turn)}'s turn</div>
                <div class="players">
                  ${(g.players ?? []).map(p => html`<span class="player">${this.#playerName(p.id)} (${p.card_count})</span>`)}
                </div>
              </div>`
          : html`<div class="prompt">Join a game to start playing</div>`}
      </div>
      <card-fan cards='${cards}'></card-fan>
    `;
  }

  mounted() {
    const fan = this._root.querySelector("card-fan");
    if (fan) {
      fan.model.insert = async (from, to) => {
        this.send({ action: "game", payload: { action: "reorder", from, to } });
        return { from, to };
      };
    }

    this.on("card-click", (e) => {
      const slot = e.detail.card.closest(".card-slot");
      const idx = parseInt(slot?.dataset.index);
      if (isNaN(idx)) return;
      this.#playCard(idx);
    });

    this.on("click", (e) => {
      if (e.target.closest("[data-action='draw']")) {
        this.send({ action: "game", payload: { action: "draw_card" } });
      }
    });

    this.onMessage("status", (data) => {
      if (data.players) {
        for (const p of data.players) {
          this.#playerMap[p.id] = p.name;
        }
      }
      if (!data.game) return;
      this.#applyGameState(data.game);
    });

    this.onMessage("players", (data) => {
      if (data.players) {
        for (const p of data.players) {
          this.#playerMap[p.id] = p.name;
        }
      }
    });

    this.onMessage("draw", (data) => {
      const drawn = data.cards ?? [];
      this.silent.hand = [...(this.silent.hand ?? []), ...drawn];
      this.#pendingPlay = null;
      this._update();
    });

    this.onMessage("keep_or_play", (data) => {
      this.silent._playableIdx = data.played_at_index;
      this._update();
    });

    this.onMessage("card_played", (data) => {
      if (this.silent.game) {
        this.silent.game.topCard = data.card;
        const p = this.silent.game.players?.find(p => p.id === data.player);
        if (p) p.card_count = Math.max(0, (p.card_count ?? 1) - 1);
      }
      this.#pendingPlay = null;
      this._update();
    });

    this.onMessage("turn", (data) => {
      if (this.silent.game) this.silent.game.turn = data.player;
      this._update();
    });

    this.onMessage("game_over", (data) => {
      if (this.silent.game) {
        this.silent.game.state = "over";
        this.silent.game.winner = data.winner;
      }
      this._update();
    });

    this.onMessage("error", (data) => {
      if (this.#pendingPlay) {
        this.silent.hand.splice(this.#pendingPlay.idx, 0, this.#pendingPlay.card);
        this.#pendingPlay = null;
        this._update();
      }
    });

    this.send({ action: "status" });
  }

  #playCard(idx) {
    const cards = this.silent.hand;
    if (!cards || idx < 0 || idx >= cards.length) return;
    const [card] = cards.splice(idx, 1);
    if (!card) return;
    this.#pendingPlay = { card, idx };
    this._update();

    const payload = {
      action: "play_card",
      card: { color: card.color, kind: card.kind, value: card.value },
    };
    if (this.silent._playableIdx === idx) {
      payload.hand_index = idx;
      delete this.silent._playableIdx;
    }
    this.send({ action: "game", payload });
  }

  #applyGameState(data) {
    this.silent.game = {
      state: data.state,
      turn: data.turn,
      direction: data.direction,
      drawPile: data.drawPile,
      topCard: data.topCard,
      players: data.players,
    };
    if (data.hand) {
      this.silent.hand = data.hand;
    }
    this._update();
  }
}

UnoPage.registerTag("uno-page");
