import type { BoardState } from "./board_state.js";
import { EngineClient, type EngineAnalyzeResponse } from "./engine_client.js";
export interface PlayMoveOptions {
    thinkTime?: number;
    whiteEnginePath?: string | null;
    blackEnginePath?: string | null;
}
export interface AutoMatchOptions extends PlayMoveOptions {
    getBoardState: () => BoardState;
    applyMove: (uciMove: string) => void;
    renderBoard?: () => void;
    delayMs?: number;
    onUpdate?: (payload: AutoMatchUpdate) => void;
}
export interface AutoMatchUpdate {
    state: BoardState;
    fen: string;
    move: string | null;
    evaluation: string | null;
    moveList: string[];
    done: boolean;
    result: string;
}
export declare class BridgeController {
    private readonly engineClient;
    private running;
    constructor(engineClient: EngineClient);
    analyzeBoardState(state: BoardState, thinkTime?: number): Promise<{
        fen: string;
        engine: EngineAnalyzeResponse;
    }>;
    playOneEngineMove(boardState: BoardState, options?: PlayMoveOptions): Promise<{
        move: string | null;
        fen: string;
        evaluation: string | null;
    }>;
    runAutoMatch(options: AutoMatchOptions): Promise<void>;
    stopAutoMatch(): void;
}
