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
      skyjo-page { background: linear-gradient(155deg, #4a6fa5, #2e2e2e); }
    `;
  }

  render() {
    const cards = (this.state.hand ?? []).map(c => ({
      tag: "skyjo-card", value: c.value, isHidden: c.isHidden,
    }));
    return html`
      <h1>Skyjo</h1>
      <card-fan cards='${cards}'></card-fan>
    `;
  }

  mounted() {
    this.on("card-click", (e) => {
      const idx = parseInt(e.detail.card.closest(".card-wrapper")?.dataset.index);
      if (isNaN(idx)) return;
      this.silent.hand[idx] = { ...this.state.hand[idx], isHidden: !this.state.hand[idx].isHidden };
      this._update();
    });
  }
}

SkyjoPage.registerTag("skyjo-page");
