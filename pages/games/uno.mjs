import { Page, html, css } from "/core/base.mjs";
import { moveWithAnimation } from "/core/drag.mjs";
import "/components/cards/uno.mjs";
import { decodeCardId } from "/components/cards/uno.mjs";
import "/components/card-fan.mjs";
import "/components/draw-pile.mjs";
import "/components/discard-pile.mjs";

export class UnoPage extends Page {
  static props = {
    state: 'playing',
    players: [],
    turn: 0,
    direction: 0,
    topCard: { id: 0 },
    hand: [],
  };

  #pendingPlay = null;
  #pendingReorder = null;
  #pendingDragDrop = null;
  #pendingDraw = null;
  #drawState = null;
  #playerMap = {};

  #opponentHtml(players, turnId) {
    return (players ?? []).map(p => {
      const active = p.id === turnId ? " active" : "";
      const name = this.#playerName(p.id);
      const count = p.card_count ?? 0;
      const shown = Math.min(count, 3);
      let mini = "";
      for (let i = 0; i < shown; i++) {
        mini += "<div class=\"mini-card\"></div>";
      }
      return `<div class="opponent${active}"><div class="avatar"></div><div><div class="name">${name}</div><div class="hand-row"><div class="mini-fan">${mini}</div><span class="badge">${count}</span></div></div></div>`;
    }).join("");
  }

  styles() {
    return css`
      :host {
        background: radial-gradient(ellipse at 50% 30%, #3a3a6a, #252540);
        display: flex; flex-direction: column; height: 100vh;
        color: #fff; font-family: system-ui, -apple-system, sans-serif;
        overflow: hidden;
      }

      #opponents {
        display: flex; gap: 1rem; padding: 1rem 2rem;
        flex-shrink: 0; justify-content: center; flex-wrap: wrap;
      }

      .opponent {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 14px; padding: 0.75rem 1.25rem;
        display: flex; align-items: center; gap: 0.75rem;
        transition: border-color .35s, box-shadow .35s, background .35s;
      }

      .opponent.active {
        border-color: #ffb300;
        box-shadow: 0 0 24px rgba(255,179,0,0.15);
        background: rgba(255,179,0,0.06);
      }

      .avatar {
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(255,255,255,0.06);
        border: 2px solid rgba(255,255,255,0.08);
        flex-shrink: 0;
      }

      .opponent.active .avatar {
        border-color: #ffb300;
        box-shadow: 0 0 10px rgba(255,179,0,0.3);
      }

      .name {
        font-size: 1.1rem; font-weight: 600; white-space: nowrap;
        color: rgba(255,255,255,0.75);
      }

      .opponent.active .name { color: #ffb300; }

      .hand-row {
        display: flex; align-items: center; gap: 0.375rem; margin-top: 0.2rem;
      }

      .mini-fan { display: flex; align-items: center; }

      .mini-card {
        width: 16px; height: 24px;
        background: linear-gradient(145deg, #252560, #0f0f35);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 2px; margin-right: -8px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.4);
      }

      .mini-card:last-child { margin-right: 0; }

      .badge {
        font-size: 0.9rem; font-weight: 700;
        background: rgba(255,255,255,0.06);
        padding: 0.125rem 0.4rem; border-radius: 999px;
        color: rgba(255,255,255,0.45);
        min-width: 1.25rem; text-align: center;
      }

      #board {
        flex: 1; display: flex;
        align-items: center; justify-content: center;
        padding: 1rem;
        min-height: 0;
      }

      #play-area {
        display: flex; gap: 2.5rem; align-items: center;
      }

      .dir {
        font-size: 1.5rem; color: rgba(255,255,255,0.1);
        user-select: none; font-weight: 300;
      }

      #turn-indicator {
        font-size: 1.25rem;
        color: rgba(255,255,255,0.35); font-weight: 500;
        padding: 0.75rem;
        text-align: center;
      }

      #turn-indicator strong {
        color: #ffb300; font-weight: 700;
      }

      card-fan {
        height: 200px; flex-shrink: 0;
        margin-top: -200px;
      }

      .game-over { text-align: center; }

      .game-over .title {
        font-size: 2rem; font-weight: 800; margin-bottom: 0.375rem;
        background: linear-gradient(135deg, #ffb300, #ff6b00);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .game-over .winner {
        font-size: 1.1rem; color: rgba(255,255,255,0.5);
      }

      .prompt {
        color: rgba(255,255,255,0.25); font-size: 0.95rem;
      }
    `;
  }

  #playerName(id) {
    return this.#playerMap[id] ?? `Player ${id}`;
  }

  #cardAttrs(card) {
    if (!card) return { color: "black", type: "number", value: "" };
    const info = decodeCardId(card.id);
    return {
      color: card.color || info.color || "black",
      type: info.kind || "number",
      value: String(info.value ?? ""),
    };
  }

  render({ state, hand, players, winner, turn, direction, topCard }) {
    if (!state) {
      return html`
        <div id="board"><div class="prompt">Join a game to start playing</div></div>
      `;
    }

    if (state === "over") {
      return html`
        <div id="opponents">${this.#opponentHtml(players, winner)}</div>
        <div id="board">
          <div class="game-over">
            <div class="title">Game Over</div>
            <div class="winner">${this.#playerName(winner)} wins!</div>
          </div>
        </div>
      `;
    }

    let cardsHtml = hand.map(c => {
      const info = decodeCardId(c.id);
      return `<uno-card color="${info.color}" value="${info.value ?? ""}" type="${info.kind}"></uno-card>`;
    }).join("");

    const top = this.#cardAttrs(topCard);

    return html`
      <div id="opponents">${this.#opponentHtml(players, turn)}</div>
      <div id="turn-indicator"><strong>${this.#playerName(turn)}</strong>'s turn</div>
      <div id="board">
        <div id="play-area">
          <draw-pile><uno-card faceup="false"></uno-card></draw-pile>
          <div class="dir">${direction > 0 ? "→" : "←"}</div>
          <discard-pile>
            <uno-card color="${top.color}" type="${top.type}" value="${top.value}"></uno-card>
          </discard-pile>
        </div>
      </div>
      <card-fan>${cardsHtml}</card-fan>
    `;
  }

  mounted() {
    this.querySelector("card-fan").model.insert = (from, to) => {
      return new Promise((resolve, reject) => {
        this.#pendingReorder = { from, to, resolve, reject };
        this.send({ action: "game", payload: { action: "reorder_hand", from, to } });
        setTimeout(() => {
          if (this.#pendingReorder) {
            const r = this.#pendingReorder.reject;
            this.#pendingReorder = null;
            r(new Error("timeout"));
          }
        }, 5000);
      });
    };

    this.on("card-click", (e) => {
      const idx = parseInt(e.detail.card?.dataset?.index);
      if (isNaN(idx)) return;
      this.#playCard(idx);
    });

    this.on("dragdrop", (e) => {
      const inDiscardPile = e.composedPath().some(el =>
        el instanceof HTMLElement && el.tagName === "DISCARD-PILE"
      );
      if (!inDiscardPile) return;
      if (!e.detail.el.classList.contains("card-slot")) return;
      e.preventDefault();
      const slot = e.detail.el;
      const idx = parseInt(slot.dataset.index);
      if (isNaN(idx)) return;
      this.#pendingDragDrop = { slot, idx };
      this.#playCard(idx);
    });

    this.shadowRoot.addEventListener("dragenter", (e) => {
      if (e.composedPath().some(el => el instanceof HTMLElement && el.tagName === "DISCARD-PILE")) {
        this.querySelector("discard-pile")?.classList.add("drag-over");
      }
    });

    this.shadowRoot.addEventListener("dragleave", (e) => {
      if (e.composedPath().some(el => el instanceof HTMLElement && el.tagName === "DISCARD-PILE")) {
        this.querySelector("discard-pile")?.classList.remove("drag-over");
      }
    });

    this.on("draw-click", () => {
      this.send({ action: "game", payload: { action: "draw_card" } });
    });

    this.on("draw-drag-start", () => {
      this.#drawState = { idx: -1 };
    });

    this.on("draw-drag-move", (e) => {
      if (!this.#drawState) return;
      const fan = this.querySelector("card-fan");
      if (!fan) return;
      const idx = fan.getDropIndex(e.detail.x, e.detail.y);
      if (idx !== this.#drawState.idx) {
        fan.hideGhost();
        this.#drawState.idx = idx;
        if (idx >= 0) fan.showGhost(idx, { tag: "uno-card", faceup: "false" });
      }
    });

    this.on("draw-drag-end", () => {
      const fan = this.querySelector("card-fan");
      if (fan) fan.hideGhost();
      const idx = this.#drawState?.idx ?? -1;
      this.#drawState = null;
      this.#pendingDraw = { idx };
      this.send({ action: "game", payload: { action: "draw_card" } });
    });

    this.onMessage("status", (data) => {
      if (data.players) {
        for (const p of data.players) {
          this.#playerMap[p.id] = p.name;
        }
      }
      this.setState(data.game);
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
      if (this.#pendingDraw) {
        const { idx } = this.#pendingDraw;
        this.#pendingDraw = null;
        if (drawn.length > 0) {
          const cardInfo = decodeCardId(drawn[0].id);
          const fan = this.querySelector("card-fan");
          if (fan && idx >= 0) {
            fan.insertCard(idx, { tag: "uno-card", color: cardInfo.color, type: cardInfo.kind, value: String(cardInfo.value ?? "") });
          } else if (fan) {
            fan.addCards([{ tag: "uno-card", color: cardInfo.color, type: cardInfo.kind, value: String(cardInfo.value ?? "") }]);
          }
          if (this.silent.hand) {
            if (idx >= 0) {
              this.silent.hand.splice(idx, 0, drawn[0]);
            } else {
              this.silent.hand = [...(this.silent.hand ?? []), ...drawn];
            }
          }
        }
      } else {
        this.silent.hand = [...(this.silent.hand ?? []), ...drawn];
        const fan = this.querySelector("card-fan");
        if (fan && drawn.length) {
          fan.addCards(drawn.map(c => {
            const info = decodeCardId(c.id);
            return { tag: "uno-card", color: info.color, type: info.kind, value: String(info.value ?? "") };
          }));
        }
      }
      this.#pendingPlay = null;
    });

    this.onMessage("hand_reordered", () => {
      if (this.#pendingReorder) {
        const { from, to, resolve } = this.#pendingReorder;
        this.#pendingReorder = null;
        const hand = this.silent.hand;
        if (hand) {
          const [card] = hand.splice(from, 1);
          hand.splice(to, 0, card);
        }
        resolve();
      }
    });

    this.onMessage("keep_or_play", (data) => {
      this.silent._playableIdx = data.played_at_index;
      this._update();
    });

    this.onMessage("card_played", (data) => {
      if (this.#pendingPlay) {
        const idx = this.#pendingPlay.idx;
        if (this.#pendingDragDrop) {
          const { slot } = this.#pendingDragDrop;
          this.#pendingDragDrop = null;
          const pile = this.querySelector("discard-pile");
          if (slot && pile) {
            moveWithAnimation(slot, pile, null, {
              duration: 300, easing: "ease-out",
              endCallback: () => { slot.remove(); },
            });
          }
          if (this.silent.hand) this.silent.hand.splice(idx, 1);
        } else {
          const fan = this.querySelector("card-fan");
          const pile = this.querySelector("discard-pile");
          if (fan && pile) {
            const slot = fan.getCardSlot(idx);
            if (slot) {
              moveWithAnimation(slot, pile, null, {
                duration: 300, easing: "ease-out",
                endCallback: () => { slot.remove(); },
              });
              this.silent.hand.splice(idx, 1);
            } else {
              fan.removeCard(idx);
              this.silent.hand.splice(idx, 1);
            }
          } else {
            if (this.silent.hand) this.silent.hand.splice(idx, 1);
            if (fan) fan.removeCard(idx);
          }
        }
      }

      this.state.topCard = data.card;
      const p = this.state.players.find(p => p.id === data.player);
      p.card_count = Math.max(0, (p.card_count ?? 1) - 1);
      this.#pendingPlay = null;
    });

    this.onMessage("turn", (data) => {
      this.state.turn = data.player;
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
        this.#pendingPlay = null;
        if (this.#pendingDragDrop) {
          const { slot } = this.#pendingDragDrop;
          this.#pendingDragDrop = null;
          if (slot) slot.abortDrop?.();
        }
      }
      if (this.#pendingReorder) {
        const r = this.#pendingReorder.reject;
        this.#pendingReorder = null;
        r(new Error(data.error ?? "reorder_failed"));
      }
      if (this.#pendingDraw) {
        this.#failDraw(data.error);
      }
      this._update();
    });

    this.send({ action: "status" });
  }

  #playCard(idx) {
    const cards = this.silent.hand;
    if (!cards || idx < 0 || idx >= cards.length) return;
    const card = cards[idx];
    if (!card) return;
    this.#pendingPlay = { card, idx };

    const info = decodeCardId(card.id);
    const payload = {
      action: "play_card",
      card: { color: info.color, kind: info.kind, value: info.value },
    };
    if (this.silent._playableIdx === idx) {
      payload.hand_index = idx;
      delete this.silent._playableIdx;
    }
    this.send({ action: "game", payload });
  }

  #failDraw(error) {
    this.#pendingDraw = null;
  }
}

UnoPage.registerTag("uno-page");
