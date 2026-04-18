import type { BoardState } from "./board_state.js";
export interface ChessBridgeAPI {
    getBoardState(): BoardState;
    applyMove(uciMove: string): void;
    renderBoard(): void;
}
declare global {
    interface Window {
        chessBridge?: ChessBridgeAPI;
    }
}
/**
 * Helper for local pages that don't yet expose chessBridge.
 * Call this once with your state container and render function.
 */
export declare function attachChessBridge(params: {
    getState: () => BoardState;
    setState: (next: BoardState) => void;
    render: () => void;
}): ChessBridgeAPI;
