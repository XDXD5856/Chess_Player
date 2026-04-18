import { BridgeController } from "./controller.js";
import { EngineClient } from "./engine_client.js";
import { boardStateToFen } from "./fen.js";
import { initialBoardState } from "./initial_state.js";
import { attachChessBridge } from "./chess_bridge_global.js";
const unicode = {
    wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
    bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};
function boardToAscii(state) {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const lines = [];
    for (let rank = 8; rank >= 1; rank -= 1) {
        const row = files.map((f) => unicode[state.squares[`${f}${rank}`]] ?? ".").join(" ");
        lines.push(`${rank} ${row}`);
    }
    lines.push("  a b c d e f g h");
    return lines.join("\n");
}
function clickMoveFallback(uciMove) {
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const fromEl = document.querySelector(`[data-square="${from}"]`);
    const toEl = document.querySelector(`[data-square="${to}"]`);
    if (!fromEl || !toEl)
        return false;
    fromEl.click();
    toEl.click();
    return true;
}
export function bindDemoUI() {
    const analyzeBtn = document.getElementById("analyzeBtn");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");
    const stepBtn = document.getElementById("stepBtn");
    const boardInput = document.getElementById("boardInput");
    const thinkInput = document.getElementById("thinkTime");
    const whitePathInput = document.getElementById("whiteEnginePath");
    const blackPathInput = document.getElementById("blackEnginePath");
    const fenOut = document.getElementById("fenOut");
    const bestMoveOut = document.getElementById("bestMoveOut");
    const evalOut = document.getElementById("evalOut");
    const resultOut = document.getElementById("resultOut");
    const movesOut = document.getElementById("movesOut");
    const boardOut = document.getElementById("boardOut");
    const errorOut = document.getElementById("errorOut");
    if (!analyzeBtn || !startBtn || !stopBtn || !stepBtn || !boardInput || !thinkInput || !whitePathInput || !blackPathInput || !fenOut || !bestMoveOut || !evalOut || !resultOut || !movesOut || !boardOut || !errorOut)
        return;
    const controller = new BridgeController(new EngineClient());
    let currentState = initialBoardState();
    let moveList = [];
    attachChessBridge({
        getState: () => currentState,
        setState: (next) => {
            currentState = next;
            moveList = [...moveList];
        },
        render: () => {
            boardInput.value = JSON.stringify(currentState, null, 2);
            boardOut.textContent = boardToAscii(currentState);
            fenOut.value = boardStateToFen(currentState);
            movesOut.value = moveList.join(" ");
        },
    });
    function sync() {
        window.chessBridge?.renderBoard();
    }
    function options() {
        return {
            thinkTime: Number(thinkInput.value || "0.1"),
            whiteEnginePath: whitePathInput.value.trim() || null,
            blackEnginePath: blackPathInput.value.trim() || null,
        };
    }
    function executeMove(uciMove) {
        if (window.chessBridge?.applyMove) {
            window.chessBridge.applyMove(uciMove);
            moveList.push(uciMove);
            window.chessBridge.renderBoard();
            return;
        }
        // DOM click fallback only if direct integration is unavailable.
        if (!clickMoveFallback(uciMove)) {
            throw new Error(`No direct applyMove or DOM fallback for move: ${uciMove}`);
        }
    }
    analyzeBtn.onclick = async () => {
        errorOut.textContent = "";
        try {
            currentState = JSON.parse(boardInput.value);
            const { fen, engine } = await controller.analyzeBoardState(currentState, Number(thinkInput.value || "0.1"));
            fenOut.value = fen;
            bestMoveOut.value = engine.best_move ?? "(none)";
            evalOut.value = engine.evaluation ?? "(none)";
            boardOut.textContent = boardToAscii(currentState);
        }
        catch (err) {
            errorOut.textContent = err instanceof Error ? err.message : String(err);
        }
    };
    stepBtn.onclick = async () => {
        errorOut.textContent = "";
        try {
            currentState = JSON.parse(boardInput.value);
            const step = await controller.playOneEngineMove(currentState, options());
            bestMoveOut.value = step.move ?? "(none)";
            evalOut.value = step.evaluation ?? "(none)";
            if (step.move) {
                executeMove(step.move);
                resultOut.value = "running";
            }
            else {
                resultOut.value = "game over / no move";
            }
            currentState = window.chessBridge?.getBoardState() ?? currentState;
            sync();
        }
        catch (err) {
            errorOut.textContent = err instanceof Error ? err.message : String(err);
        }
    };
    startBtn.onclick = async () => {
        errorOut.textContent = "";
        try {
            currentState = JSON.parse(boardInput.value);
            moveList = [];
            sync();
            await controller.runAutoMatch({
                getBoardState: () => window.chessBridge?.getBoardState() ?? currentState,
                applyMove: executeMove,
                renderBoard: () => window.chessBridge?.renderBoard(),
                delayMs: 400,
                ...options(),
                onUpdate: (update) => {
                    bestMoveOut.value = update.move ?? "(none)";
                    evalOut.value = update.evaluation ?? "(none)";
                    resultOut.value = update.result;
                    movesOut.value = update.moveList.join(" ");
                    currentState = update.state;
                    sync();
                },
            });
        }
        catch (err) {
            errorOut.textContent = err instanceof Error ? err.message : String(err);
        }
    };
    stopBtn.onclick = () => {
        controller.stopAutoMatch();
        resultOut.value = "stopped";
    };
    sync();
}
