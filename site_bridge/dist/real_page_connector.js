export class RealPageConnector {
    controller;
    running = false;
    constructor(controller) {
        this.controller = controller;
    }
    stop() {
        this.running = false;
        this.controller.stopAutoMatch();
    }
    async startAuto(options = {}) {
        this.running = true;
        const delayMs = options.delayMs ?? 350;
        const pollMs = options.pollMs ?? 120;
        const engineSide = options.engineSide ?? "both";
        while (this.running) {
            const bridge = window.chessBridge;
            if (!bridge) {
                options.onStatus?.("chessBridge unavailable");
                await sleep(pollMs);
                continue;
            }
            const state = bridge.getBoardState();
            if (isGameOver(state)) {
                options.onStatus?.(`game over: ${state.result ?? "unknown"}`);
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
function engineShouldMove(turn, engineSide) {
    if (engineSide === "both")
        return true;
    return turn === engineSide;
}
function isGameOver(state) {
    if (state.isGameOver === true)
        return true;
    if (state.noLegalMoves === true)
        return true;
    if (state.result && state.result !== "*" && state.result !== "running")
        return true;
    return false;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
