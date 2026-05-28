import { Page, html } from "/core/base.mjs";
import { moveWithAnimation, makeDroppable } from "/core/util.mjs";
import "/components/cards/uno.mjs";
import { decodeCardId } from "/components/cards/uno.mjs";
import "/components/card-fan.mjs";
import "/components/draw-pile.mjs";
import "/components/discard-pile.mjs";
import "/components/color-picker.mjs";
import "/components/keep-prompt.mjs";

export class UnoPage extends Page {
  static stylesLink = "/styles/pages/uno.css";
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
    return "";
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
      <color-picker></color-picker>
      <keep-prompt></keep-prompt>
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

    makeDroppable(this.querySelector("discard-pile"), {
      accept: (source) => source.classList.contains("card-slot"),
      over: () => this.querySelector("discard-pile")?.classList.add("drag-over"),
      leave: () => this.querySelector("discard-pile")?.classList.remove("drag-over"),
      drop: (source, x, y) => {
        const idx = parseInt(source.dataset.index);
        if (isNaN(idx)) return false;
        const cards = this.silent.hand;
        if (cards && idx >= 0 && idx < cards.length) {
          const info = decodeCardId(cards[idx].id);
          if (info.kind === "wild" || info.kind === "wilddraw4") {
            this.#playCard(idx);
            return false;
          }
        }
        const r = source.getBoundingClientRect();
        this.#pendingDragDrop = { slot: source, idx, rect: { top: r.top, left: r.left, width: r.width, height: r.height } };
        this.#playCard(idx);
      },
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
      if (fan) { fan.hideGhost(); fan.hideDropZones(); }
      const idx = this.#drawState?.idx ?? -1;
      this.#drawState = null;
      if (idx >= 0) {
        this.#pendingDraw = { idx };
        this.send({ action: "game", payload: { action: "draw_card" } });
      }
    });

    this.on("color-selected", (e) => {
      if (!this.#pendingPlay) return;
      this.#playCard(this.#pendingPlay.idx, e.detail.color);
      this.querySelector("color-picker")?.hide();
    });

    this.on("color-cancel", () => {
      this.#pendingPlay = null;
      this.querySelector("color-picker")?.hide();
    });

    this.on("keep-play", () => {
      if (!this.#pendingPlay) return;
      this.#playCard(this.#pendingPlay.idx);
      this.querySelector("keep-prompt")?.hide();
    });

    this.on("keep-keep", () => {
      if (!this.#pendingPlay) return;
      this.send({ action: "game", payload: { action: "keep" } });
      this.#pendingPlay = null;
      this.querySelector("keep-prompt")?.hide();
    });

    this.on("keep-cancel", () => {
      this.#pendingPlay = null;
      this.querySelector("keep-prompt")?.hide();
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
      const idx = data.played_at_index;
      if (idx == null) return;
      const card = data.card?.[0];
      if (!card) return;
      const info = decodeCardId(card.id);
      const prompt = this.querySelector("keep-prompt");
      if (prompt) {
        prompt.show({ color: info.color, type: info.kind, value: String(info.value ?? "") });
        this.#pendingPlay = { idx, card };
      }
    });

    this.onMessage("card_played", (data) => {
      if (this.#pendingPlay) {
        const idx = this.#pendingPlay.idx;
        if (this.#pendingDragDrop) {
          const { slot, rect } = this.#pendingDragDrop;
          this.#pendingDragDrop = null;
          const pile = this.querySelector("discard-pile");
          if (slot && pile && rect) {
            slot.style.position = "fixed";
            slot.style.top = `${rect.top}px`;
            slot.style.left = `${rect.left}px`;
            slot.style.width = `${rect.width}px`;
            slot.style.height = `${rect.height}px`;
            document.body.appendChild(slot);
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
      this.state.game.state = "over";
      this.state.game.winner = data.winner;
    });

    this.onMessage("error", (data) => {
      if (this.#pendingPlay) {
        this.#pendingPlay = null;
        if (this.#pendingDragDrop) {
          const { slot } = this.#pendingDragDrop;
          this.#pendingDragDrop = null;
          if (slot && slot.parentNode) slot.remove();
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

  #playCard(idx, chosenColor) {
    const cards = this.silent.hand;
    if (!cards || idx < 0 || idx >= cards.length) return;
    const card = cards[idx];
    if (!card) return;

    if (!chosenColor) {
      const info = decodeCardId(card.id);
      if (info.kind === "wild" || info.kind === "wilddraw4") {
        this.#pendingPlay = { card, idx };
        this.querySelector("color-picker")?.show();
        return;
      }
    }

    this.#pendingPlay = { card, idx };

    const payload = { action: "play_card", hand_index: idx };
    if (chosenColor) payload.wildColor = chosenColor;
    this.send({ action: "game", payload });
  }

  #failDraw(error) {
    this.#pendingDraw = null;
  }
}

UnoPage.registerTag("uno-page");
