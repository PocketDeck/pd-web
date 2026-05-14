# PocketDeck Architecture

A zero-dependency card game frontend. Native ES Modules (`.mjs`), no build step.

## Core Files

```
core/base.mjs   — Framework: Component, Page, FormComponent, html, css, deepReactive
core/socket.mjs — WebSocket singleton with reconnection
core/router.mjs — SPA router (dynamic import-based)
core/main.mjs   — Entry point
core/drag.mjs   — makeDraggable, moveWithAnimation, containsDeep
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
- Drag-and-drop built on `makeDraggable` from `core/drag.mjs`:
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

## Data Flow

```
User clicks draw pile
  → Page sends { action: "game", payload: { action: "draw_card" } }
  → WS message to server
  → Server responds with { action: "draw", cards: [...] }
  → Page handler appends to silent.hand + calls fan.addCards()
  → Page calls _update() to refresh board/opponents
```

```
User drags card → drops on zone
  → CardFan calls model.insert(from, to) → returns Promise
  → Page sends reorder_hand to server
  → Server responds hand_reordered → resolve promise → CardFan finalizes
  → Server responds error → reject promise → CardFan reverts
```

```
User clicks card to play
  → Card dispatches card-click event
  → Page removes card from silent.hand + fan.removeCard()
  → Page sends { action: "game", payload: { action: "play_card", card: {...} } }
  → Server responds card_played → Page updates game.topCard + player counts
  → Server responds error → Page restores card via fan.insertCard()
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
  drag.mjs               makeDraggable, moveWithAnimation, containsDeep

components/
  card.mjs               Card base class (renderFace/renderBack, card-click)
  card-fan.mjs           Fan layout + drag-drop (light-DOM children, model.insert)
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
```
