import { boardStateToFen } from "./fen.js";
export class BridgeController {
    engineClient;
    running = false;
    constructor(engineClient) {
        this.engineClient = engineClient;
    }
    async analyzeBoardState(state, thinkTime = 0.1) {
        const fen = boardStateToFen(state);
        const engine = await this.engineClient.bestMove(fen, { thinkTime });
        return { fen, engine };
    }
    async playOneEngineMove(boardState, options = {}) {
        const fen = boardStateToFen(boardState);
        const enginePath = boardState.sideToMove === "w" ? options.whiteEnginePath : options.blackEnginePath;
        const engine = await this.engineClient.bestMove(fen, {
            thinkTime: options.thinkTime,
            enginePath: enginePath ?? undefined,
        });
        return { move: engine.best_move, fen, evaluation: engine.evaluation };
    }
    async runAutoMatch(options) {
        if (this.running)
            return;
        this.running = true;
        const moves = [];
        while (this.running) {
            const stateBefore = options.getBoardState();
            const step = await this.playOneEngineMove(stateBefore, options);
            const done = !step.move;
            if (step.move) {
                options.applyMove(step.move);
                options.renderBoard?.();
                moves.push(step.move);
            }
            const currentState = options.getBoardState();
            options.onUpdate?.({
                state: currentState,
                fen: boardStateToFen(currentState),
                move: step.move,
                evaluation: step.evaluation,
                moveList: [...moves],
                done,
                result: done ? "engine returned no move (likely game over)" : "running",
            });
            if (done) {
                this.running = false;
                break;
            }
            const delay = options.delayMs ?? 400;
            if (delay > 0)
                await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    stopAutoMatch() {
        this.running = false;
    }
}
