import { applyUciMove } from "./move_apply.js";
/**
 * Helper for local pages that don't yet expose chessBridge.
 * Call this once with your state container and render function.
 */
export function attachChessBridge(params) {
    const api = {
        getBoardState: () => params.getState(),
        applyMove: (uciMove) => {
            const next = applyUciMove(params.getState(), uciMove);
            params.setState(next);
        },
        renderBoard: () => {
            params.render();
        },
    };
    window.chessBridge = api;
    return api;
}
