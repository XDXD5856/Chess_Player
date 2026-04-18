import type { BoardState } from "./board_state.js";
import { EngineClient, type EngineAnalyzeResponse } from "./engine_client.js";
import { boardStateToFen } from "./fen.js";

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

export class BridgeController {
  private running = false;

  constructor(private readonly engineClient: EngineClient) {}

  async analyzeBoardState(state: BoardState, thinkTime = 0.1): Promise<{ fen: string; engine: EngineAnalyzeResponse }> {
    const fen = boardStateToFen(state);
    const engine = await this.engineClient.bestMove(fen, { thinkTime });
    return { fen, engine };
  }

  async playOneEngineMove(
    boardState: BoardState,
    options: PlayMoveOptions = {},
  ): Promise<{ move: string | null; fen: string; evaluation: string | null }> {
    const fen = boardStateToFen(boardState);
    const enginePath = boardState.sideToMove === "w" ? options.whiteEnginePath : options.blackEnginePath;
    const engine = await this.engineClient.bestMove(fen, {
      thinkTime: options.thinkTime,
      enginePath: enginePath ?? undefined,
    });

    return { move: engine.best_move, fen, evaluation: engine.evaluation };
  }

  async runAutoMatch(options: AutoMatchOptions): Promise<void> {
    if (this.running) return;
    this.running = true;

    const moves: string[] = [];

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
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  stopAutoMatch(): void {
    this.running = false;
  }
}
