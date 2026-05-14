# PocketDeck Web Frontend

The web frontend for PocketDeck, a multiplayer card game platform. This repository contains only the client-side application that connects to a separate PocketDeck backend server.

## What It Is

A browser-based multiplayer card game client that supports real-time gameplay through WebSocket connections. The frontend handles game rendering, user interactions, and client-side game state management while communicating with a backend server for game logic and multiplayer coordination.

## Framework

Built with **vanilla JavaScript Web Components** - no external frameworks or dependencies. The application uses:

- **ES Modules** (.mjs) for modern JavaScript module system
- **Web Components** for reusable UI components
- **Custom component framework** with base classes for Page and Form components
- **HTML templating** with a custom `html` tagged template literal
- **CSS-in-JS** styling approach
- **WebSocket API** for real-time multiplayer communication

## Architecture

```
core/                # Framework core
├── base.mjs         # Component, Page, FormComponent, deepReactive, html, css
├── main.mjs         # Application entry point
├── router.mjs       # SPA router with dynamic imports
└── socket.mjs       # WebSocket singleton with exponential backoff reconnection

components/          # Reusable Web Components
├── card.mjs         # Card base class (renderFace/renderBack)
├── card-fan.mjs     # Fan layout + drag-drop, light-DOM children API
├── game-config.mjs  # Game config dropdown + sub-config loader
├── cards/           # Game-specific card implementations
│   ├── uno.mjs
│   ├── skyjo.mjs
│   └── skipbo.mjs
└── config/          # Game-specific configuration components
    ├── uno.mjs
    ├── skyjo.mjs
    └── skipbo.mjs

pages/               # Route-based page components
├── login.mjs        # Create/join room
├── lobby.mjs        # Pre-game lobby
└── games/           # Game-specific pages
    ├── uno.mjs
    ├── skyjo.mjs
    └── skipbo.mjs
```

### Key Design Decisions

- **Shadow DOM** for style encapsulation (no global CSS leaks)
- **Reactive proxy state** via `deepReactive()` auto-patches DOM on mutation
- **CardFan uses light-DOM children** — parent renders `<*-card>` elements as children, CardFan wraps them in `.card-slot` divs internally
- **Events cross shadow boundaries** with `composed: true`; native events use `e.composedPath()` instead of `e.target.closest()`

## Supported Games

- **UNO** - Fully implemented with card components and configuration
- **Skip-Bo** - Configuration support
- **Skyjo** - Configuration support

## Development

The application is served by nginx and runs entirely in the browser. It connects to a separate PocketDeck backend server for multiplayer functionality and game state management.

## Deployment

Containerized with Docker using nginx as the web server. The frontend is designed to be deployed alongside the PocketDeck backend service.
