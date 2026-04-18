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

export class RealPageConnector {
  private running = false;

  constructor(private readonly controller: BridgeController) {}

  stop(): void {
    this.running = false;
    this.controller.stopAutoMatch();
  }

  async startAuto(options: RealPageAutoOptions = {}): Promise<void> {
    this.running = true;
    const delayMs = options.delayMs ?? 350;
    const pollMs = options.pollMs ?? 120;
    const engineSide = options.engineSide ?? "both";

    while (this.running) {
      const bridge = (window as Window & { chessBridge?: RealPageBridge }).chessBridge;
      if (!bridge) {
        options.onStatus?.("chessBridge unavailable");
        await sleep(pollMs);
        continue;
      }

      const state = bridge.getBoardState();
      if (isGameOver(state)) {
        options.onStatus?.(`game over: ${(state as { result?: string }).result ?? "unknown"}`);
        this.running = false;
        break;
      }

      const turn = state.sideToMove;
      if (!engineShouldMove(turn, engineSide)) {
        await sleep(pollMs);
        continue;
      }

      const step = await this.controller.playOneEngineMove(state, options);
      if (!step.move) {
        options.onStatus?.("game over: no legal moves");
        this.running = false;
        break;
      }

      bridge.applyMove(step.move);
      bridge.renderBoard();
      options.onStatus?.(`moved: ${step.move}`);

      await sleep(delayMs);
    }
  }
}

function engineShouldMove(turn: "w" | "b", engineSide: EngineSide): boolean {
  if (engineSide === "both") return true;
  return turn === engineSide;
}

function isGameOver(state: BoardState & { isGameOver?: boolean; result?: string; noLegalMoves?: boolean }): boolean {
  if (state.isGameOver === true) return true;
  if (state.noLegalMoves === true) return true;
  if (state.result && state.result !== "*" && state.result !== "running") return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
