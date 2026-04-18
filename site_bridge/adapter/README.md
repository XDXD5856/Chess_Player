# Adapter integration notes

For your own website, implement and expose:

```js
window.chessBridge = {
  selectedSquare: null,
  getBoardState() { return currentBoardState; },
  selectSquare(square) { this.selectedSquare = square; },
  movePiece(from, to) { applyMove({ from, to }); },
  renderBoard() { renderBoard(); },
};
```

Then you can use `chess_bridge_panel.user.js` (Tampermonkey) to:
- click-select squares (`[data-square]`)
- move by input (`from`, `to`)
- inspect bridge state panel

## Requirements
- your board squares should include `data-square="e2"` style attributes
- direct integration is preferred (`movePiece` + `renderBoard`)
- DOM click logic is only a fallback behavior

## Local-only scope
This adapter script is for your own local test website.
