# site_bridge architecture

## Goal
Provide a stable bridge between a local website board state and the main chess backend engine API.

## Runtime flow
1. UI / website provides `BoardState`.
2. `boardStateToFen` converts BoardState to FEN.
3. `EngineClient` calls `/api/engine/move`.
4. Controller receives UCI move.
5. Move executes via `window.chessBridge.applyMove(uci)`.
6. UI updates via `window.chessBridge.renderBoard()`.

## Core APIs
- `BridgeController.analyzeBoardState(...)`
- `BridgeController.playOneEngineMove(...)`
- `BridgeController.runAutoMatch(...)`
- `BridgeController.stopAutoMatch()`

## Bridge contract
```ts
window.chessBridge = {
  getBoardState,
  applyMove,
  renderBoard,
};
```

## Fallback policy
DOM click fallback is optional and should be used only when direct move API integration is unavailable.

## Merge strategy later
- Keep `board_state.ts` and `move_apply.ts` contract stable
- Move `fen.ts` + `engine_client.ts` into shared package when mature
- Keep website-specific adapter code isolated under `adapter/`


## Real page integration helper
- `RealPageConnector` reads `window.chessBridge.getBoardState()`
- requests engine move
- applies via `window.chessBridge.applyMove(uci)`
- renders via `window.chessBridge.renderBoard()`
