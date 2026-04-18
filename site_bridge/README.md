# site_bridge (semi-independent subproject)

A merge-friendly bridge layer for your **own local test chess website**.

## What this demo now supports
### Analysis chain
1. BoardState JSON input
2. Convert BoardState -> FEN
3. Call backend `POST /api/engine/move`
4. Show `best_move` + `evaluation`

### Automatic match chain
1. BoardState -> engine move
2. Execute move through `window.chessBridge.applyMove(uci)`
3. `window.chessBridge.renderBoard()` updates view
4. Continue loop until Stop or no move (game likely over)

No image recognition. No mouse automation by default. No third-party site automation.

## Stable input format (fixed contract)
```ts
type PieceCode =
  | "wp" | "wn" | "wb" | "wr" | "wq" | "wk"
  | "bp" | "bn" | "bb" | "br" | "bq" | "bk";

type BoardState = {
  squares: Record<string, PieceCode | null>;
  sideToMove: "w" | "b";
  castling: string;
  enPassant: string | "-";
  halfmove: number;
  fullmove: number;
};
```

## Bridge API exposed on page
```ts
window.chessBridge = {
  getBoardState(): BoardState,
  applyMove(uci: string): void,
  renderBoard(): void,
};
```

This is the preferred integration path for your own website.

## Quick run
### 1) Start backend (main project)
```bash
# from repository root
python scripts/stage2_run_server.py
```

### 2) Start site_bridge demo
```bash
cd site_bridge
npm install
npm run demo
```
Open: `http://127.0.0.1:4173`

### 3) Use demo controls
- **Analyze**: one-shot analysis only
- **Step Once**: execute one engine move
- **Start Auto Match**: continuous engine-vs-engine loop
- **Stop**: stop auto loop

Configure:
- think time
- white engine path (optional)
- black engine path (optional)


## Userscript panel (for your own site)
A ready script is provided at:
- `site_bridge/adapter/chess_bridge_panel.user.js`

It injects:
- a small control panel (Select / Move / State)
- square click binding using `[data-square]`
- selected-square highlight

Use this only on your own local chess page where `window.chessBridge` is available.

## DOM click fallback policy
Only used if direct integration is unavailable.
Fallback requires board square DOM nodes with selectors like:
```html
<div data-square="e2"></div>
```

## Backend URL configuration
Default backend URL is `http://127.0.0.1:8000`.

If needed, set in browser console before reloading demo page:
```js
globalThis.SITE_BRIDGE_ENGINE_BASE_URL = "http://127.0.0.1:8000";
```

## Integration notes (for your own website)
Preferred path:
1. expose `window.chessBridge.getBoardState/applyMove/renderBoard`
2. let controller call `playOneEngineMove` / `runAutoMatch`
3. execute moves via `applyMove(uci)`

Core modules:
- `boardStateToFen` (`src/fen.ts`)
- `applyUciMove` (`src/move_apply.ts`)
- `EngineClient` (`src/engine_client.ts`)
- `BridgeController` (`src/controller.ts`)
- `attachChessBridge` (`src/chess_bridge_global.ts`)
- `RealPageConnector` (`src/real_page_connector.ts`)

## File layout
- `src/board_state.ts`: stable board contract
- `src/fen.ts`: board -> FEN conversion
- `src/move_apply.ts`: apply UCI move -> next BoardState
- `src/engine_client.ts`: backend engine API client
- `src/controller.ts`: play one move / auto match loop
- `src/chess_bridge_global.ts`: expose `window.chessBridge` helper
- `src/real_page_connector.ts`: connect auto loop to a real page bridge
- `src/ui.ts`: demo page binding and rendering
- `src/demo_page.ts`: browser entry
- `dev_server.mjs`: tiny static server for demo
- `public/demo.html`: local demo page
