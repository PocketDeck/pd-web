import { Page, html, css } from "/core/base.mjs";
import "/components/cards/skyjo.mjs";
import "/components/card-fan.mjs";

export class SkyjoPage extends Page {
  static props = {
    hand: Array.from({ length: 12 }, () => ({
      value: Math.floor(Math.random() * 15) - 2,
      isHidden: Math.random() < 0.5,
    })),
  };

  styles() {
    return css`
      :host {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        min-height: 100vh; width: 100vw;
        font-family: "Inter", sans-serif;
        background: linear-gradient(155deg, #4a6fa5, #2e2e2e);
      }
      h1 {
        text-align: center; font-size: 2.5rem; color: #fff; margin-bottom: 1rem;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }
    `;
  }

  render() {
    const cards = (this.state.hand ?? []).map(c => {
      return `<skyjo-card value="${c.value}" ishidden="${c.isHidden}"></skyjo-card>`;
    }).join("");
    return html`
      <h1>Skyjo</h1>
      <card-fan>${cards}</card-fan>
    `;
  }

  mounted() {
    this.on("card-click", (e) => {
      const idx = parseInt(e.detail.card?.dataset?.index);
      if (isNaN(idx)) return;
      const card = this.silent.hand[idx];
      if (!card) return;
      card.isHidden = !card.isHidden;
      e.detail.card.setAttribute("ishidden", String(card.isHidden));
    });
  }
}

SkyjoPage.registerTag("skyjo-page");
