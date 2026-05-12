# PocketDeck Architecture

A zero-dependency card game frontend. Native ES Modules (`.mjs`), no build step.

## Core Files

```
core/base.mjs   — Framework: Component, Page, FormComponent, html, css, deepReactive
core/socket.mjs — WebSocket singleton with reconnection
core/router.mjs — SPA router (dynamic import-based)
core/main.mjs   — Entry point
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
this.silent.x = y    → User typing, drag cycling, animation prep
                       no auto-patch, you own the DOM
```

## Rendering (No Shadow DOM)

Components render into `this._root` — a `<div>` appended to the element in the constructor.

```
<uno-page>
  <div class="uno-page-root">   ← this._root
    <style>...</style>
    <card-fan>...</card-fan>
  </div>
</uno-page>
```

### Auto-Patching (`_patch`)

Replaces `innerHTML = render()`. Walks old and new children in parallel, updating in-place.

```
_patch(parent, htmlString)
  ├─ Parse html via <template>
  ├─ Walk old and new children matched by position + tagName
  ├─ SAME nodeType + nodeName:
  │   ├─ TEXT: update textContent
  │   └─ ELEMENT: update attributes, recurse children
  │      Element preserved → CSS transitions work naturally
  ├─ ONLY OLD → remove()
  └─ ONLY NEW → appendChild()
```

### Style Scoping

Without Shadow DOM, `<style>` inside `_root` is global. Use tag-name prefix selectors:

```css
login-page .tab { }
login-page form { }
```

Pages are mutually exclusive (one at a time), so no collisions occur.

### Overriding `_update()`

Components with complex DOM management (e.g., `CardFan`) override `_update()` completely for manual control.

## WebSocket (`core/socket.mjs`)

- Singleton connection to `ws[s]://<host>/ws/`
- Exponential backoff reconnection: `1s → 2s → 4s → 8s → 16s → 30s (cap)`
- Fires `ws:connected` / `ws:disconnected` events on `document`

**Message format (client → server):**
```json
{ "action": "create", "name": "Alice", "game": "uno" }
```

**Message format (server → client):**
```json
{ "action": "joined", "roomID": "abc123" }
```

**Message routing (in `Page`):** Dispatch by `data.action` field.

### Actions

| Client Action | Server Response(s) | Purpose |
|---|---|---|
| `create` | `joined`, `players`, `error` | Create room |
| `join` | `joined`, `players`, `error` | Join room |
| `ready` / `unready` | `ready` / `unready`, `players`, `start`, `error` | Toggle ready |
| `leave` | `left`, `players`, `error` | Leave room |
| `status` | `status`, `error` | Get current state |
| `game` | (varies), `error` | Game-specific action |

**Server → Client (unsolicited):**
- `players` — Player list changed (join/leave/ready/disconnect)
- `start` — All players ready, game started

**Client requests state on mount:**
- Both `lobby-page` and `uno-page` send `{ action: "status" }` on mount to fetch initial room/game state
- Game state (including hand) is returned in the `game` field of the `status` response

Full protocol spec in `WS_PROTOCOL.md`.

## Router (`core/router.mjs`)

URL → tag name mapping (last segment + `-page` suffix):
```
/           → login-page
/lobby      → lobby-page
/games/uno  → uno-page
```

Dynamic `import()`, creates element, injects socket.

## `html` Tagged Template

Objects are JSON-serialized (no UUID/store hack):

```js
const html = (strings, ...values) => String.raw(
  { raw: strings },
  ...values.map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v)
)
```

`attributeChangedCallback` parses JSON:
```js
try { this.state[name] = JSON.parse(value) }
catch { this.state[name] = value }
```

## Component Tree

```
Pages: login-page, lobby-page, uno-page, skipbo-page, skyjo-page
Components:
  card-base ← UnoCard, SkipboCard, SkyjoCard
  card-fan  — fan layout, drag-drop, WS sync model
  game-config — dropdown + sub-config form
  config-uno / config-skipbo / config-skyjo
```

### `CardFan` + Drag-Drop

- Receives `cards` prop with card data array
- Creates card elements internally, arranges in fan
- Drag-and-drop via `makeDraggable` (pointer-based)
- On drop: dispatches `fan-insert` event with `{from, to}`
- Page sets `fan.model.insert` as a function returning a Promise
- Promise resolves → card animates to new position
- Promise rejects → card animates back (revert)

### `Card` Base

```js
Card extends Component
  props: { width, height, faceup, interactive }
  Subclasses override renderFace()
  Dispatches `card-click` (bubbles, composed)
```

## Data Flow

```
User Action (click card)
  → Card dispatches card-click event
  → Page handler sends send({ action: "game", payload: { ... } })
  → WS message to server
  → Server responds with { action: "...", ... }
  → Page handler calls setState(newState)
  → Auto-patch updates affected DOM elements
  → CSS transitions animate the change
```

## Drag-Drop Data Flow

```
User drops card at position
  → CardFan emits fan-insert {from, to}
  → Page calls model.insert(from, to)
  → send({ action: "game", payload: { type: "fan.insert", from, to } })
  → Returns Promise
  → Server responds with { action: "game", payload: { type: "fan.insert.success", ... } }
  → Promise resolves → CardFan animates to new position
  → Promise rejects → CardFan reverts
```

## File Map

```
index.html               HTML shell
ARCHITECTURE.md          This file
serve                    Dev server

core/
  main.mjs               Entry: initSocket() → navigate()
  base.mjs               deepReactive, Component, Page, FormComponent, html, css
  socket.mjs             WS singleton + reconnection
  router.mjs             SPA router

styles/
  (styles in index.html)  Global CSS

components/
  card.mjs               Card base class
  card-fan.mjs           Fan layout + drag-drop
  game-config.mjs        Game selector + sub-config
  cards/
    uno.mjs              UNO card
    skipbo.mjs           Skip-Bo card
    skyjo.mjs            Skyjo card
  config/
    uno.mjs              UNO config form
    skipbo.mjs           Skip-Bo config
    skyjo.mjs            Skyjo config

pages/
  login.mjs              Login / Create Room
  lobby.mjs              Game lobby
  games/
    uno.mjs              UNO game
    skipbo.mjs           Skip-Bo game
    skyjo.mjs            Skyjo game
```
