import type { BoardState } from "./board_state.js";
import { BridgeController, type PlayMoveOptions } from "./controller.js";
export type EngineSide = "w" | "b" | "both";
export interface RealPageBridge {
    getBoardState(): BoardState & {
        isGameOver?: boolean;
        result?: string;
        noLegalMoves?: boolean;
    };
    applyMove(uci: string): void;
    renderBoard(): void;
}
export interface RealPageAutoOptions extends PlayMoveOptions {
    engineSide?: EngineSide;
    delayMs?: number;
    pollMs?: number;
    onStatus?: (message: string) => void;
}
export declare class RealPageConnector {
    private readonly controller;
    private running;
    constructor(controller: BridgeController);
    stop(): void;
    startAuto(options?: RealPageAutoOptions): Promise<void>;
}
