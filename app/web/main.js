const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const modeHintEl = document.getElementById("modeHint");
const seriesHintEl = document.getElementById("seriesHint");
const fenEl = document.getElementById("fen");
const movesEl = document.getElementById("moves");
const resultEl = document.getElementById("result");
const pgnEl = document.getElementById("pgn");
const summaryEl = document.getElementById("engineSummary");

const pieceMap = { p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚", P:"♙", R:"♖", N:"♘", B:"♗", Q:"♕", K:"♔" };

let squares = [];
let state = null;
let selected = null;
let legalTargets = [];
let activeSeriesId = null;
let seriesPollTimer = null;

function initBoard() {
  boardEl.innerHTML = "";
  squares = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement("div");
      sq.className = `sq ${(r + c) % 2 === 0 ? "light" : "dark"}`;
      const file = "abcdefgh"[c];
      const rank = (8 - r).toString();
      sq.dataset.square = file + rank;
      sq.onclick = () => onSquareClick(sq.dataset.square);
      boardEl.appendChild(sq);
      squares.push(sq);
    }
  }
}

function squareEl(square) {
  return squares.find((s) => s.dataset.square === square);
}

function clearHighlights() {
  squares.forEach((s) => {
    s.classList.remove("selected");
    s.classList.remove("legal");
  });
  legalTargets = [];
}

function renderFen(fen) {
  clearHighlights();
  const rows = fen.split(" ")[0].split("/");
  for (let r = 0; r < 8; r++) {
    let col = 0;
    for (const ch of rows[r]) {
      if (!isNaN(ch)) {
        for (let i = 0; i < Number(ch); i++) {
          squares[r * 8 + col].textContent = "";
          col++;
        }
      } else {
        squares[r * 8 + col].textContent = pieceMap[ch] || "";
        col++;
      }
    }
  }
}

async function postJson(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
  return data;
}

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
  return data;
}

function updateState(nextState) {
  state = nextState;
  renderFen(state.fen);
  fenEl.value = state.fen;
  movesEl.value = state.moves.join(" ");
  resultEl.value = state.result || "*";
  pgnEl.value = state.pgn || "";
  statusEl.textContent = `状态：${state.is_game_over ? "已结束" : "进行中"} | 当前走子：${state.turn}`;
  modeHintEl.textContent = `模式：${state.mode}`;
}

async function onSquareClick(square) {
  if (!state || state.is_game_over || state.mode === "engine_vs_engine") return;

  if (!selected) {
    selected = square;
    clearHighlights();
    squareEl(square)?.classList.add("selected");

    try {
      const legal = await postJson("/api/game/legal-moves", { game_id: state.game_id, from_square: square });
      legalTargets = legal.to_squares || [];
      legalTargets.forEach((sq) => squareEl(sq)?.classList.add("legal"));
    } catch (err) {
      selected = null;
      alert(err.message);
    }
    return;
  }

  if (selected === square) {
    selected = null;
    clearHighlights();
    return;
  }

  const move = selected + square;
  selected = null;
  clearHighlights();
  try {
    const next = await postJson("/api/game/move", { game_id: state.game_id, move_uci: move });
    updateState(next);
  } catch (err) {
    alert(err.message);
  }
}

function resolveEnginePath(value) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

async function startGame() {
  const mode = document.getElementById("mode").value;
  const thinkTime = Number(document.getElementById("thinkTime").value);
  const games = Number(document.getElementById("games").value);
  const whiteEnginePath = resolveEnginePath(document.getElementById("whiteEnginePath").value);
  const blackEnginePath = resolveEnginePath(document.getElementById("blackEnginePath").value);
  summaryEl.value = "";

  if (seriesPollTimer) clearInterval(seriesPollTimer);
  activeSeriesId = null;

  try {
    if (mode === "engine_vs_engine") {
      const started = await postJson("/api/game/engine-vs-engine/start", {
        games,
        think_time: thinkTime,
        white_engine_path: whiteEnginePath,
        black_engine_path: blackEnginePath,
      });
      activeSeriesId = started.series_id;
      seriesHintEl.textContent = `机机对战状态：进行中（0/${started.total_games}）`;
      pollSeriesStatus();
      seriesPollTimer = setInterval(pollSeriesStatus, 1000);
      return;
    }

    const game = await postJson("/api/game/create", {
      mode,
      think_time: thinkTime,
      white_engine_path: whiteEnginePath,
      black_engine_path: blackEnginePath,
    });
    updateState(game);
    seriesHintEl.textContent = "机机对战状态：-";
  } catch (err) {
    alert(err.message);
  }
}

async function pollSeriesStatus() {
  if (!activeSeriesId) return;
  try {
    const status = await getJson(`/api/game/engine-vs-engine/status/${activeSeriesId}`);
    const s = status.stats;
    summaryEl.value = `Series ID: ${status.series_id}\n已完成: ${status.completed_games}/${status.total_games}\n当前局: ${status.current_game}\n白胜: ${s.white_wins}\n黑胜: ${s.black_wins}\n和棋: ${s.draws}`;

    if (status.summaries.length > 0) {
      const last = status.summaries[status.summaries.length - 1];
      updateState({
        game_id: "series-last",
        mode: "engine_vs_engine",
        fen: last.final_fen,
        turn: "-",
        moves: last.moves,
        is_game_over: true,
        result: last.result,
        pgn: last.pgn,
      });
    }

    const finished = !status.running;
    seriesHintEl.textContent = `机机对战状态：${finished ? "已结束" : "进行中"}（${status.completed_games}/${status.total_games}）`;
    if (finished && seriesPollTimer) {
      clearInterval(seriesPollTimer);
      seriesPollTimer = null;
    }
  } catch (err) {
    if (seriesPollTimer) clearInterval(seriesPollTimer);
    seriesPollTimer = null;
    alert(err.message);
  }
}

async function stopSeries() {
  if (!activeSeriesId) {
    alert("当前没有正在运行的机机系列对战。");
    return;
  }
  try {
    await postJson("/api/game/engine-vs-engine/stop", { series_id: activeSeriesId });
    seriesHintEl.textContent = "机机对战状态：已请求停止";
  } catch (err) {
    alert(err.message);
  }
}

function exportPgn() {
  if (!pgnEl.value.trim()) {
    alert("当前没有可导出的 PGN。");
    return;
  }
  const blob = new Blob([pgnEl.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "game.pgn";
  a.click();
  URL.revokeObjectURL(url);
}

function resetAll() {
  selected = null;
  clearHighlights();
  if (seriesPollTimer) clearInterval(seriesPollTimer);
  seriesPollTimer = null;
  activeSeriesId = null;

  state = null;
  renderFen("8/8/8/8/8/8/8/8 w - - 0 1");
  fenEl.value = "";
  movesEl.value = "";
  resultEl.value = "";
  pgnEl.value = "";
  summaryEl.value = "";
  statusEl.textContent = "状态：未开始";
  modeHintEl.textContent = "模式：-";
  seriesHintEl.textContent = "机机对战状态：-";
}

document.getElementById("startBtn").onclick = startGame;
document.getElementById("resetBtn").onclick = resetAll;
document.getElementById("stopBtn").onclick = stopSeries;
document.getElementById("exportPgnBtn").onclick = exportPgn;

initBoard();
resetAll();
