import { Page, html, css } from "/core/base.mjs";
import { basicStyle } from "/styles/styles.mjs";
import "/components/cards/skyjo.mjs";
import "/components/card-fan.mjs";

export class SkyjoPage extends Page {
  static props = {
    hand: Array.from({ length: 12 }, (_, i) => ({
      value: Math.floor(Math.random() * 15) - 2, // Values from -2 to 12
      isHidden: Math.random() < 0.5, // 50% chance of being face down
    })),
  };

  styles() {
    return css`
      ${basicStyle}
      :host {
        background: linear-gradient(155deg, #4a6fa5, #2e2e2e);
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
      }

      h1 {
        color: white;
        margin-bottom: 2rem;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .game-container {
        width: 100%;
        max-width: 1200px;
      }
    `;
  }

  render({ props }) {
    const cardsHtml = (props.hand ?? [])
      .map((card) => {
        const value = card.value ?? 0;
        const isHidden = card.isHidden ?? false;
        return html`<skyjo-card
          value="${value}"
          ?is-hidden="${isHidden}"
        ></skyjo-card>`;
      })
      .join("");

    return html`
      <div class="game-container">
        <h1>Skyjo</h1>
        <card-fan>${cardsHtml}</card-fan>
      </div>
    `;
  }

  mounted() {
    this.on("card-click", (e) => {
      console.log("Card clicked:", e.detail.index);
      // Toggle card visibility on click
      this.updateProps({
        hand: this.props.hand.map((card, i) =>
          i === e.detail.index ? { ...card, isHidden: !card.isHidden } : card,
        ),
      });
    });
  }
}

SkyjoPage.registerTag("skyjo-page");
