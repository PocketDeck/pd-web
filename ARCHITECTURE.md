# PocketDeck Architecture

A zero-dependency card game frontend. Native ES Modules (`.mjs`), no build step.

## Core Files

```
core/base.mjs   — Framework: Component, Page, FormComponent, html, css, deepReactive
core/socket.mjs — WebSocket singleton with reconnection
core/router.mjs — SPA router (dynamic import-based)
core/main.mjs   — Entry point
core/util.mjs   — makeDraggable, makeDroppable, moveWithAnimation
```

## State: Three-Tier Model

Every `Component` has three state layers:

| Layer | Accessor | Behavior |
|---|---|---|
| **Schema** | `static props = {}` | Default values, cloned into `silent` at construction |
| **Silent** | `this.silent` | Plain object. Direct mutations do NOT trigger re-render | 
| **Reactive** | `this.state` | Proxy over `silent`. Any mutation schedules an auto-patch |
| **Batch** | `setState(partial)` | `Object.assign(silent, partial)` + batched `_update()` |

### When to Use Each

```
setState({...})      → Server message arrives, new game state
                       batched update → auto-patch preserves DOM
this.state.x = y     → Quick prop toggle that should auto-render
this.silent.x = y    → Server state assignment, drag cycling, animation prep
                       no auto-patch, you own the DOM
```

Note: `attributeChangedCallback` writes to `this.silent` directly (avoids Proxy wrapping), then calls `#requestUpdate()` if already mounted.

## Rendering (Shadow DOM)

Components use native Shadow DOM for style encapsulation:

```js
this.attachShadow({ mode: "open" });
```

`_update()` patches `this.shadowRoot` with `<style>${styles()}</style>${render()}`.

### Auto-Patching (`_patch`)

Walks old and new children in parallel, updating in-place:

```
_patch(parent, htmlString)
  ├─ Parse html via <template>
  ├─ Walk old and new children matched by position + nodeName
  ├─ SAME nodeType + nodeName:
  │   ├─ TEXT: update textContent
  │   └─ ELEMENT: update attributes, then recurse into children
  │      After morph, call _childrenUpdated() on hyphenated elements
  ├─ ONLY OLD → remove()
  └─ ONLY NEW → appendChild()
```

Custom elements are **not** skipped during morph — `_morphNode` recurses into them so template children reach light DOM. After morphing children, `_childrenUpdated()` is called if the method exists on the old element. This lets components like `CardFan` react to parent-driven re-renders by wrapping new light DOM children in shadow DOM wrappers.

### Overriding `_update()`

Components with complex DOM management override `_update()` completely.

### Style Scoping

Shadow DOM provides native scoping — `:host` selector targets the element itself. Component-specific styles are inside the shadow root.

### External Styles (`stylesLink`)

Page-level CSS can be outsourced to `styles/` files and linked into the shadow root via the static `stylesLink` property:

```js
class UnoPage extends Page {
  static stylesLink = "/styles/pages/uno.css";
}
```

The base class `_update()` checks for `this.constructor.stylesLink` on first render and appends a `<link rel="stylesheet">` element to the shadow root. The external stylesheet is loaded natively by the browser — no JS fetch or caching needed.

## WebSocket (`core/socket.mjs`)

- Singleton connection to `ws[s]://<host>/ws/`
- Exponential backoff reconnection: `1s → 2s → 4s → 8s → 16s → 30s (cap)`
- Fires `ws:connected` / `ws:disconnected` events on `document`

**Message routing (in `Page`):** Dispatch by `data.action` field.

**Client requests state on mount:**
- Both `lobby-page` and `uno-page` send `{ action: "status" }` on mount

### Protocol

Full protocol spec in `WS_PROTOCOL.md`.

## Router (`core/router.mjs`)

URL → tag name mapping (last segment + `-page` suffix):
```
/           → login-page
/lobby      → lobby-page
/games/uno  → uno-page
/games/skipbo → skipbo-page
/games/skyjo → skyjo-page
```

Dynamic `import()`, creates element, injects socket.

## `html` Tagged Template

Objects are JSON-serialized:

```js
const html = (strings, ...values) => String.raw(
  { raw: strings },
  ...values.map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v)
)
```

## Component Tree

```
Pages: login-page, lobby-page, uno-page, skipbo-page, skyjo-page
Components:
  card-base ← UnoCard, SkipboCard, SkyjoCard
  card-fan  — fan layout, drag-drop, public addCards/removeCard/insertCard
  game-config — dropdown + sub-config form (top-level await for dynamic import)
  config-uno / config-skipbo / config-skyjo
```

### `Card` Base

```js
Card extends Component
  props: { width, height, faceup, interactive }
  Subclasses override renderFace() / renderBack()
  Dispatches `card-click` (bubbles, composed)
```

### `CardFan` + Drag-Drop

- `render()` returns empty string; children come from **light DOM** (`<*-card>`) or via `addCards()` API
- `mounted()` reads `this.children`, wraps each in `.card-slot` div, moves to shadow root
- `_childrenUpdated()` — called by parent morph (via `_morphNode` in `base.mjs`) after new light DOM children are added. Clears old slots, wraps new children, registers drag listeners, recalculates layout.
- Drag-and-drop built on `makeDraggable` from `core/util.mjs`:
  - Each `.card-slot` registered via `makeDraggable(slot)` in `#addSlotListeners()`
  - `onDragStart`: card removed from fan (moved to fixed wrapper), drop zones built
  - `onDragMove`: zone hit-test via `getBoundingClientRect()`, clone indicator at gap
  - `onDragStop`: commit via `slot.finalizeDrop()` or reject via `slot.abortDrop()`
  - `_skipAbort` flag lets CardFan handle drop logic externally
- Drop zones are `opacity: 0` elements at interpolated gap angles
- Clone indicator (semi-transparent card) appears at hovered zone; real card stays at cursor
- On drop: emits `fan-insert` event + calls `fan.model.insert(from, to)`
- `model.insert` returns a Promise:
  - Resolves → slot moved to target position permanently
  - Rejects → slot animated back to original position via `moveWithAnimation`
- Public API: `addCards([{tag, ...attrs}])`, `removeCard(idx)`, `insertCard(idx, {tag, ...attrs})`, `setCards([{tag, ...attrs}])`

### `game-config`

- Top-level `await` dynamically imports sub-config components
- `config-change` / `game-select` events bubble up to login page
- Sub-configs mirror server schema (camelCase keys for UNO)

## WebSocket Message Flows

All game actions use `{ action: "game", payload: {...} }` wrapper. Server responds with `data.action` matching the payload action (e.g. `play_card` → `card_played`).

### 🃏 Draw Card

```
User clicks draw pile
  → Page sends { action: "game", payload: { action: "draw_card" } }
  → Server responds with { action: "draw", cards: [...], hand: [...] }
      → Page sets silent.hand = data.hand, calls fan.setCards()
  → Server responds with { action: "keep_or_play", hand_index: <idx>, card: [{ id }] }
      (only when drawn card is immediately playable)
      → Page shows keep-prompt overlay with the drawn card
```

### ✋ Keep or Play (drawn card is playable)

```
User clicks "Play" on keep-prompt
  → Page sends { action: "game", payload: { action: "play_card", hand_index: <idx> } }
  → flows into normal play_card response (card_played)

User clicks "Keep" on keep-prompt
  → Page sends { action: "game", payload: { action: "keep" } }
  → Server advances turn

User clicks outside to cancel
  → keep-prompt hides, no action sent (turn remains)
```

### ▶️ Play Card (click)

```
User clicks card in hand
  → Card dispatches card-click event (bubbles, composed)
  → Page checks if it's the user's turn
  → Page sends { action: "game", payload: { action: "play_card", hand_index: <idx> } }
  → Server responds card_played:
      {
        action: "card_played",
        player_idx: <n>,
        card: { ... },
        hand: [...] | null,       // null if not your hand
        topCard: { color, kind, value },
        direction: "fwd" | "rev",
        players: [{ ... }]        // updated player state for display
      }
      → Page sets silent.hand = data.hand (if present), fan.setCards()
      → Page updates silent.topCard, direction, players
      → flag_last_card() checks for UNO call
  → Server responds error:
      { action: "error", message: "..." }
      → Page shows error overlay with errorMessage
```

### ▶️ Play Card (drag-drop)

```
User drags card slot from fan → drops on discard pile
  → Coordinator calls discard pile's drop callback
  → drop handler captures slot's getBoundingClientRect()
  → Page calls #playCard(idx) which sends play_card WS message
  → drop handler returns true → coordinator consumes drop (wrapper removed, slot orphaned)
  → Server responds card_played:
      → card_played handler finds orphaned slot via this.#pendingDragDrop.slot
      → Repositions slot at saved rect (position: fixed, append to body)
      → Calls moveWithAnimation(slot, discardPile) to animate
      → Removes slot after animation
      → Updates hand / fan
  → Server responds error:
      → Removes orphaned slot
      → Restores card in fan
```

### 🎨 Wild Card Color Selection

```
User plays wild/wilddraw4 card (click or drag-drop)
  → #playCard detects kind === "wild" || "wilddraw4"
  → Shows color-picker overlay (full-screen, 4 color pips)
  → User clicks color pip
  → color-picker dispatches color-selected { detail: { color: "red"|"yellow"|"green"|"blue" } }
  → Page sends { action: "game", payload: { action: "play_card", hand_index: <idx>, wildColor: "..." } }
  → Server responds card_played
  → If drag-drop: wild cards return false from drop callback so coordinator does NOT consume
    (slot stays in fan until card_played response confirms play)
  → User clicks outside to cancel → color-picker dispatches color-cancel
    → Page clears #pendingPlay, #pendingDragDrop; card stays in hand
```

### 🔄 Reorder Hand

```
User drags card → drops on fan drop zone
  → CardFan drop callback sets #dragState.dropIdx = to, returns true (consumed)
  → CardFan end callback: target === "drop-zones" → model persistence
  → Page sends { action: "game", payload: { action: "reorder_hand", from: <n>, to: <m> } }
  → Server responds hand_reordered:
      { action: "hand_reordered", hand: [...] }
      → Page sets silent.hand, calls fan.setCards()
  → Server responds error:
      → CardFan rejects model.insert() Promise
      → CardFan reverts slot to original position via moveWithAnimation
```

### 📥 Game State

```
Page mounts
  → { action: "status" }  (on login-page and uno-page)
  → Server responds { action: "status", state: { gameState, players, ... } }
  → Page populates silent state, calls _update()

Server pushes game_started
  → { action: "game_started", state: { hand, players, ... } }
  → Page navigates to /games/uno with state

Server pushes hand_update
  → { action: "hand_update", hand: [...] }
  → Page sets silent.hand, calls fan.setCards()

Server pushes player_joined / player_left
  → Page updates silent.players

Server pushes turn_change
  → { action: "turn_change", player_idx: <n> }
  → Page highlights active player indicator
```

## File Map

```
index.html               HTML shell (style only for body/app)
ARCHITECTURE.md          This file

core/
  main.mjs               Entry: initSocket() → navigate('/')
  base.mjs               deepReactive, Component, Page, FormComponent, html, css
  socket.mjs             WS singleton + reconnection
  router.mjs             SPA router
  util.mjs               makeDraggable, makeDroppable, moveWithAnimation

components/
  card.mjs               Card base class (renderFace/renderBack, card-click)
  card-fan.mjs           Fan layout + drag-drop (light-DOM children, model.insert)
  color-picker.mjs       Wild color selection overlay
  keep-prompt.mjs        Keep-or-play prompt for drawn playable cards
  game-config.mjs        Game selector + sub-config loader
  cards/
    uno.mjs              UNO card (decodeCardId, renderFace)
    skipbo.mjs           Skip-Bo card
    skyjo.mjs            Skyjo card
  config/
    uno.mjs              UNO config form
    skipbo.mjs           Skip-Bo config (empty)
    skyjo.mjs            Skyjo config (empty)

pages/
  login.mjs              Create/join room, game config selection
  lobby.mjs              Player list, ready/unready/leave
  games/
    uno.mjs              UNO game (hand, opponents, play/draw/reorder)
    skipbo.mjs           Skip-Bo game (static demo)
    skyjo.mjs            Skyjo game (card reveal demo)

styles/
  pages/
    login.css            Login page styles (via stylesLink)
    lobby.css            Lobby page styles (via stylesLink)
    uno.css              UNO page styles (via stylesLink)
  components/
    card-fan.css         CardFan styles (via stylesLink)
```
