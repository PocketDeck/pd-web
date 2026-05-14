import { Page, html, css } from "/core/base.mjs";
import "/components/cards/skipbo.mjs";
import "/components/card-fan.mjs";

export class SkipboPage extends Page {
  static props = {
    hand: Array.from({ length: 10 }, () => ({
      value: Math.floor(Math.random() * 12) + 1,
      isSkipbo: Math.random() < 0.1,
    })),
  };

  styles() {
    return css`
      :host {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        min-height: 100vh; width: 100vw;
        font-family: "Inter", sans-serif;
        background: linear-gradient(155deg, #5a8cff, #2e2e2e);
      }
    `;
  }

  render() {
    const cards = (this.state.hand ?? []).map(c => {
      return `<skipbo-card value="${c.value}" isskipbo="${c.isSkipbo}"></skipbo-card>`;
    }).join("");
    return html`<card-fan>${cards}</card-fan>`;
  }

  mounted() {
    this.on("card-click", (e) => {
      const idx = parseInt(e.detail.card?.dataset?.index);
      console.log("Card clicked:", idx);
    });
  }
}

SkipboPage.registerTag("skipbo-page");
