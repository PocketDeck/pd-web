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
      skipbo-page { background: linear-gradient(155deg, #5a8cff, #2e2e2e); }
    `;
  }

  render() {
    const cards = (this.state.hand ?? []).map(c => ({
      tag: "skipbo-card", value: c.value, isSkipbo: c.isSkipbo,
    }));
    return html`<card-fan cards='${cards}'></card-fan>`;
  }

  mounted() {
    this.on("card-click", (e) => {
      const idx = e.detail.card.closest(".card-wrapper")?.dataset.index;
      console.log("Card clicked:", idx);
    });
  }
}

SkipboPage.registerTag("skipbo-page");
