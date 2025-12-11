import { Page, html, css } from "/core/base.mjs";
import { basicStyle } from "/styles/styles.mjs";
import "/components/cards/skipbo.mjs";
import "/components/card-fan.mjs";

export class SkipboPage extends Page {
  static props = {
    hand: Array.from({ length: 10 }, (_, i) => ({
      value: Math.floor(Math.random() * 12) + 1, // Values 1-12
      isSkipbo: Math.random() < 0.1, // 10% chance of being a Skip-Bo card
    })),
  };

  styles() {
    return css`
      ${basicStyle}
      :host {
        background: linear-gradient(155deg, #5a8cff, #2e2e2e);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `;
  }

  render({ props }) {
    const cardsHtml = (props.hand ?? [])
      .map((card) => {
        const value = card.value ?? 1;
        const isSkipbo = card.isSkipbo ?? false;
        return html`<skipbo-card
          value="${value}"
          ?is-skipbo="${isSkipbo}"
        ></skipbo-card>`;
      })
      .join("");

    return html`
      <div class="game-container">
        <h1>Skip-Bo</h1>
        <card-fan>${cardsHtml}</card-fan>
      </div>
    `;
  }

  mounted({ on }) {
    on("card-click", (e) => {
      console.log("Card clicked:", e.detail.index);
    });
  }
}

SkipboPage.registerTag("skipbo-page");
