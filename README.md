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
components/          # Reusable Web Components
├── base.mjs         # Base component classes
├── card.mjs         # Card game component
├── uno.mjs          # UNO-specific card component
└── config/          # Game configuration components

pages/               # Route-based page components
├── base.mjs         # Base page class
├── login.mjs        # Login page
├── lobby.mjs        # Game lobby
└── games/           # Game-specific pages

main.mjs             # Application entry point
router.mjs           # Client-side routing
socket.mjs           # WebSocket connection management
styles.mjs           # Global styles
```

## Supported Games

- **UNO** - Fully implemented with card components and configuration
- **Skip-Bo** - Configuration support
- **Skyjo** - Configuration support

## Development

The application is served by nginx and runs entirely in the browser. It connects to a separate PocketDeck backend server for multiplayer functionality and game state management.

## Deployment

Containerized with Docker using nginx as the web server. The frontend is designed to be deployed alongside the PocketDeck backend service.
