import { Page, html, css } from "/core/base.mjs";
import { basicStyle } from "/styles/styles.mjs";
import "/components/cards/uno.mjs";
import "/components/card-fan.mjs";

export class UnoPage extends Page {
  static props = {
    players: [],
    hand: Array.from({ length: 7 }, (_, i) => ({
      type: i === 0 ? "wild" : "number",
      color:
        i === 0
          ? "black"
          : Math.random() < 0.25
            ? "red"
            : Math.random() < 0.5
              ? "green"
              : Math.random() < 0.75
                ? "blue"
                : "yellow",
      value: i === 0 ? "" : Math.floor(Math.random() * 10).toString(),
    })),
  };

  styles() {
    return css`
      ${basicStyle}
      :host {
        background: linear-gradient(155deg, #6a9b75, #2e2e2e);
      }
    `;
  }

  render({ props }) {
    const cardsHtml = (props.hand ?? [])
      .map((card) => {
        const type = card.type ?? "number";
        const color = card.color ?? (type.includes("wild") ? "black" : "red");
        const value = card.value ?? "";
        return html`<uno-card
          type="${type}"
          color="${color}"
          value="${value}"
        ></uno-card>`;
      })
      .join("");

    return html` <card-fan>${cardsHtml}</card-fan> `;
  }

  mounted({ on }) {
    on("card-click", (e) => {
      console.log("Card clicked:", e.detail.index);
    });
  }
}

UnoPage.registerTag("uno-page");
