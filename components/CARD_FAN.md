# CardFan Component

The `<card-fan>` component displays a set of cards in a fanned (curved) horizontal layout. It supports drag-and-drop reordering with backend sync.

## Architecture

### Light DOM Children → Shadow DOM Wrappers

Cards are passed as light-DOM children:

```html
<card-fan>
  <uno-card color="red" value="7"></uno-card>
  <uno-card color="blue" value="3"></uno-card>
</card-fan>
```

On `mounted()`, `#installSlots()` wraps each child in a `.card-slot` div and moves it into the shadow root's `#fan` container:

```
<card-fan>
  #shadow-root
    <div id="fan">
      <div class="card-slot" style="--angle: 10deg; --z: 0">
        <uno-card color="red" value="7"></uno-card>
      </div>
      <div class="card-slot" style="--angle: -10deg; --z: 1">
        <uno-card color="blue" value="3"></uno-card>
      </div>
    </div>
```

The host element `<card-fan>` has no visible light-DOM children after mount — all cards are moved to shadow DOM.

### Fan Layout (`fanLayout`)

`fanLayout()` distributes cards evenly across the fan's curvature:

```
            __--__--__--__
          /               \
         /                 \
    --0----1----2----3----4-- → index
       <- curvature deg ->
```

- Each card gets `--angle` (rotation around bottom center), `--z` (stacking order), and `dataset.index`
- Cards rotate outward from center using `transform: translateX(-50%) translateY(calc(-1 * var(--raise))) rotate(var(--angle)) translateY(var(--raise))`
- The "raise" pattern (translate down, rotate, translate back up) keeps the rotation pivot at the card's bottom center while the card extends upward

### Hover Behavior

`.card-slot:hover > *` counter-rotates the card to straight and raises it with `translateY(var(--hover-raise)) scale(1.2)`. The `translate: 0 0 1px` combined with `perspective` on `#fan` and `transform-style: preserve-3d` on `.card-slot` raises the hovered card above others in 3D space without changing `z-index`.

## Drag & Drop

The drag system is built on `makeDraggable` from `core/drag.mjs` — a general-purpose framework for making any element draggable.

### Parent Morph Handling (`_childrenUpdated`)

When a parent component re-renders, the morph process recurses into `<card-fan>` and calls `_childrenUpdated()` on it. This method clears all old `.card-slot` wrappers, wraps each new light DOM child in a fresh `.card-slot`, registers drag listeners via `#addSlotListeners()`, and recalculates layout with `fanLayout()`.

This is how the UNO page updates its hand after receiving a `status` message — `setState(data.game)` triggers re-render, morph adds new `<uno-card>` children to `<card-fan>` light DOM, and `_childrenUpdated()` moves them into shadow DOM wrappers. It also corrects the fan layout after a card is animated out via `moveWithAnimation`.

### Per-Slot Registration (`#addSlotListeners`)

Each `.card-slot` is registered with `makeDraggable()` once (at mount or when added via `addCards()`/`insertCard()`):

```js
const drag = makeDraggable(slot);
drag.onClick(callback);     // press+release without drag threshold
drag.onDragStart(callback);
drag.onDragMove(callback);
drag.onDragStop(callback);
```

`makeDraggable` handles:
- `pointerdown` on the slot → threshold check (25px²)
- Creating a fixed-position wrapper on `document.body` and moving the slot into it
- Following the cursor with the wrapper centered (`cx - offsetWidth/2, cy - offsetHeight/2`)
- Setting `slot._skipAbort` support for external drop decision
- `onClick`: fires on `pointerup` when no drag was initiated (below threshold). Dispatches `card-click` on the card element with `bubbles: true, composed: true`.

### Drag Start (`onDragStart`)

1. **Card removed from fan**: `slot.remove()` takes the `.card-slot` out of the fan (it's now in `makeDraggable`'s wrapper). `fanLayout()` recalculates remaining card positions.
2. **Drop zones built**: `#buildDropZones()` creates invisible fanned zone elements at every gap position.

### Drop Zones (`#drop-zones` container)

- Placed inside `#fan` with `z-index: 9999` and `position: absolute`
- Each zone is an `opacity: 0` element at a gap angle (computed by `interpolateAngle`)
- Zones have `pointer-events: auto` — they're invisible but hit-testable via `getBoundingClientRect`
- Number of zones = remaining cards + 1 (every gap position)

### Drag Move (`onDragMove`)

CardFan's own zone detection (not `makeDraggable`'s `findDragOverElement`, since zones are invisible to `elementFromPoint`):

1. `#findDropTarget(x, y)` iterates each zone's `getBoundingClientRect()` and checks cursor containment
2. If hovering over NOT over a zone → `dropIdx = -1`
3. If hovering over a zone → `dropIdx = zone.dataset.index`

On zone change:
- **Clone indicator appears**: `#positionIndicator(idx)` creates a card clone (`buildCard`) at the zone's gap angle. The clone has `opacity: 0.55` and `z-index: 9999`. **The original card stays free-floating in the wrapper at the cursor.**
- **Clone indicator removed**: When leaving a zone, the clone is destroyed.

### Drag End (`onDragStop`)

1. Remove clone indicator and drop zones
2. If valid drop (zone index >= 0 and different from source):
   - Dispatch `fan-insert` event (`{ detail: { from, to } }`)
   - Call `model.insert(from, to)` if set
   - On promise resolve: `fan.insertBefore(slot, ref)` moves slot to target position, `slot.finalizeDrop()` cleans wrapper
   - On promise reject: `slot.abortDrop()` animates back to original position via `moveWithAnimation`
3. If no valid drop: `slot.abortDrop()` returns card to original position

### `moveWithAnimation`

Used by `slot.abortDrop()` to smoothly animate the card from the wrapper (cursor position) back to its original position in the fan. Uses the Web Animations API with a `translate` delta and 260ms ease-out.

## Public API

### Methods

| Method | Description |
|--------|-------------|
| `addCards(cardDataArray)` | Append cards. Each entry: `{ tag: "uno-card", color: "...", ... }`. Registers drag listeners. |
| `removeCard(idx)` | Remove card at index. |
| `insertCard(idx, cardData)` | Insert card at index. Registers drag listeners. |
| `setCards(cardDataArray)` | Replace all cards. Removes old slots, creates new ones with drag listeners, single `fanLayout` call. |
| `_childrenUpdated()` | Lifecycle hook called by parent morph. Rebuilds all `.card-slot` wrappers from light DOM children, registers drag listeners, and recalculates layout. |

### Model

`fan.model.insert`

A function `(from, to) => Promise` called when a card is dragged to a new position. Returns a promise:
- **Resolve**: card stays at new position
- **Reject**: card snaps back to original position (with `moveWithAnimation`)

If `model.insert` is not set, the card moves immediately with no backend call.

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `fan-insert` | `{ from, to }` | Dispatched after a valid drop, before `model.insert` is called |

## CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--raise` | `-225%` | Amount each card lifts from bottom pivot |
| `--hover-raise` | `-42.5%` | Extra lift on hover |
| `--zone-w` | `68px` | Drop zone width |
| `--zone-h` | `100px` | Drop zone height |

## Key Design Decisions

### `makeDraggable` Framework (`core/drag.mjs`)

General-purpose drag system (not CardFan-specific):
- `makeDraggable(element)` — returns `{ onDragStart, onDragStop, onDragMove, destroy }`
- Attaches `element.finalizeDrop()` and `element.abortDrop()` during drag
- `element.finalizeDrop()` — removes wrapper, resets state
- `element.abortDrop()` — animates back to original position via `moveWithAnimation`, then finalizes
- `element._skipAbort` — when true, `onDragStop` fires directly without `abortDrop` (let the component handle placement)
- `moveWithAnimation(element, parent, sibling, options)` — Web Animations API smooth transition
- `containsDeep(element, target)` — recursive check through shadow DOM boundaries

### Clone, Not Snap

During drag, the **actual card stays in the free-floating wrapper** at all times. A **clone indicator** (semi-transparent card built from `buildCard()`) appears in the fan at the hovered zone position. This avoids constant DOM manipulation of the dragged element and keeps the cursor-following behavior smooth.

### Invisible Drop Zones

Drop zones are `opacity: 0` with `pointer-events: auto`. CardFan uses `getBoundingClientRect()` for hit detection (not `elementFromPoint`, which skips `opacity: 0` elements). This keeps zones invisible while allowing precise per-gap detection.

### Zone Z-Index

Drop zones sit at `z-index: 9999` within `#fan`. The zones themselves are invisible, but their container creates a stacking context above all cards. The clone indicator also uses `z-index: 9999` to paint above cards.

### No `data-id` Map

CardFan does not maintain a card element map. All operations (insert, remove, reorder) work by index. Backend-driven operations should use index-based methods.
