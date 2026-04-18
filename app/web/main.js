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

let lang = "zh";
let squares = [];
let state = null;
let selected = null;
let activeSeriesId = null;
let seriesPollTimer = null;
let boardOrientation = "white";

function t(key, vars = {}) {
  const dict = window.I18N[lang] || window.I18N.en;
  let text = dict[key] || key;
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}

function setText(id, key) {
  document.getElementById(id).textContent = t(key);
}

function applyI18n() {
  document.getElementById("pageTitle").textContent = t("page_title");
  setText("sectionMode", "section_mode");
  setText("langLabel", "language");
  setText("modeLabel", "section_mode");
  setText("optHvh", "mode_hvh");
  setText("optHve", "mode_hve");
  setText("optEve", "mode_eve");
  setText("humanColorLabel", "human_color_label");
  setText("humanWhite", "human_white");
  setText("humanBlack", "human_black");
  setText("humanRandom", "human_random");
  setText("sectionEngine", "section_engine");
  setText("whitePathLabel", "white_path");
  setText("blackPathLabel", "black_path");
  setText("thinkTimeLabel", "think_time");
  setText("gamesLabel", "games");
  setText("startBtn", "btn_start");
  setText("resetBtn", "btn_reset");
  setText("stopBtn", "btn_stop");
  setText("exportPgnBtn", "btn_export");
  setText("sectionInfo", "section_info");
  setText("fenLabel", "fen");
  setText("movesLabel", "moves");
  setText("resultLabel", "result");
  setText("pgnLabel", "pgn");
  setText("sectionSeries", "section_series");

  if (!state) {
    statusEl.textContent = t("status_idle");
    modeHintEl.textContent = t("mode_idle");
    seriesHintEl.textContent = t("series_idle");
  } else {
    updateState(state);
  }
}

function squareOrder() {
  const files = boardOrientation === "white" ? "abcdefgh" : "hgfedcba";
  const ranks = boardOrientation === "white" ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8];
  const arr = [];
  for (const rank of ranks) {
    for (const file of files) arr.push(file + String(rank));
  }
  return arr;
}

function initBoard() {
  boardEl.innerHTML = "";
  squares = [];
  for (const sqName of squareOrder()) {
    const sq = document.createElement("div");
    const file = sqName.charCodeAt(0) - "a".charCodeAt(0);
    const rank = Number(sqName[1]) - 1;
    sq.className = `sq ${((file + rank) % 2 === 0) ? "dark" : "light"}`;
    sq.dataset.square = sqName;
    sq.onclick = () => onSquareClick(sqName);
    boardEl.appendChild(sq);
    squares.push(sq);
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
}

function renderFen(fen) {
  clearHighlights();
  const pieceBoard = fen.split(" ")[0];
  const grid = {};
  const rows = pieceBoard.split("/");
  for (let r = 0; r < 8; r++) {
    let file = 0;
    for (const ch of rows[r]) {
      if (!isNaN(ch)) {
        file += Number(ch);
      } else {
        const sq = "abcdefgh"[file] + String(8 - r);
        grid[sq] = ch;
        file += 1;
      }
    }
  }

  squares.forEach((sq) => {
    sq.textContent = pieceMap[grid[sq.dataset.square]] || "";
  });
}

async function postJson(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error((data.detail && data.detail.code) || "unknown");
    err.code = (data.detail && data.detail.code) || "unknown";
    throw err;
  }
  return data;
}

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const err = new Error((data.detail && data.detail.code) || "unknown");
    err.code = (data.detail && data.detail.code) || "unknown";
    throw err;
  }
  return data;
}

function friendlyError(code) {
  if (code === "illegal_move") return t("err_illegal_move");
  if (code === "not_your_turn") return t("err_not_your_turn");
  if (code === "no_legal_moves") return t("err_no_legal_moves");
  if (code === "game_not_found") return t("err_game_not_found");
  if (code === "series_not_found") return t("err_series_not_found");
  if (code === "engine_missing") return t("err_engine_missing");
  if (code === "engine_failure") return t("err_engine_failure");
  return t("err_unknown");
}

function updateState(nextState) {
  state = nextState;
  renderFen(state.fen);
  fenEl.value = state.fen;
  movesEl.value = state.moves.join(" ");
  resultEl.value = state.result || "*";
  pgnEl.value = state.pgn || "";
  const statusWord = state.is_game_over ? t("game_over") : t("game_running");
  const turnWord = state.turn === "black" ? t("turn_black") : t("turn_white");
  statusEl.textContent = t("status_text", { status: statusWord, turn: turnWord });
  modeHintEl.textContent = t("mode_text", { mode: state.mode });
}

async function onSquareClick(square) {
  if (!state || state.is_game_over || state.mode === "engine_vs_engine") return;

  if (!selected) {
    selected = square;
    clearHighlights();
    squareEl(square)?.classList.add("selected");

    try {
      const legal = await postJson("/api/game/legal-moves", { game_id: state.game_id, from_square: square });
      legal.to_squares.forEach((sq) => squareEl(sq)?.classList.add("legal"));
    } catch (err) {
      selected = null;
      alert(friendlyError(err.code));
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
    alert(friendlyError(err.code));
  }
}

function resolveEnginePath(value) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

async function startGame() {
  const mode = document.getElementById("mode").value;
  const humanColor = document.getElementById("humanColor").value;
  boardOrientation = (mode === "human_vs_engine" && humanColor === "black") ? "black" : "white";
  initBoard();

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
      seriesHintEl.textContent = t("series_running", { done: 0, total: started.total_games });
      pollSeriesStatus();
      seriesPollTimer = setInterval(pollSeriesStatus, 1000);
      return;
    }

    const game = await postJson("/api/game/create", {
      mode,
      human_color: humanColor,
      think_time: thinkTime,
      white_engine_path: whiteEnginePath,
      black_engine_path: blackEnginePath,
    });

    if (mode === "human_vs_engine") {
      boardOrientation = game.human_color === "black" ? "black" : "white";
      initBoard();
    }

    updateState(game);
    seriesHintEl.textContent = t("series_none");
  } catch (err) {
    alert(friendlyError(err.code));
  }
}

async function pollSeriesStatus() {
  if (!activeSeriesId) return;
  try {
    const status = await getJson(`/api/game/engine-vs-engine/status/${activeSeriesId}`);
    const s = status.stats;
    summaryEl.value = t("summary_template", {
      id: status.series_id,
      done: status.completed_games,
      total: status.total_games,
      current: status.current_game,
      white: s.white_wins,
      black: s.black_wins,
      draws: s.draws,
    });

    if (status.summaries.length > 0) {
      const last = status.summaries[status.summaries.length - 1];
      updateState({
        game_id: "series-last",
        mode: "engine_vs_engine",
        human_color: "white",
        fen: last.final_fen,
        turn: "-",
        moves: last.moves,
        is_game_over: true,
        result: last.result,
        pgn: last.pgn,
      });
    }

    const finished = !status.running;
    seriesHintEl.textContent = finished
      ? t("series_finished", { done: status.completed_games, total: status.total_games })
      : t("series_running", { done: status.completed_games, total: status.total_games });

    if (finished && seriesPollTimer) {
      clearInterval(seriesPollTimer);
      seriesPollTimer = null;
    }
  } catch (err) {
    if (seriesPollTimer) clearInterval(seriesPollTimer);
    seriesPollTimer = null;
    alert(friendlyError(err.code));
  }
}

async function stopSeries() {
  if (!activeSeriesId) {
    alert(t("alert_no_series"));
    return;
  }
  try {
    await postJson("/api/game/engine-vs-engine/stop", { series_id: activeSeriesId });
    seriesHintEl.textContent = t("series_stop_requested");
  } catch (err) {
    alert(friendlyError(err.code));
  }
}

function exportPgn() {
  if (!pgnEl.value.trim()) {
    alert(t("alert_no_pgn"));
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
  boardOrientation = "white";
  initBoard();

  state = null;
  renderFen("8/8/8/8/8/8/8/8 w - - 0 1");
  fenEl.value = "";
  movesEl.value = "";
  resultEl.value = "";
  pgnEl.value = "";
  summaryEl.value = "";
  statusEl.textContent = t("status_idle");
  modeHintEl.textContent = t("mode_idle");
  seriesHintEl.textContent = t("series_idle");
}

document.getElementById("language").addEventListener("change", (e) => {
  lang = e.target.value;
  applyI18n();
});
document.getElementById("startBtn").onclick = startGame;
document.getElementById("resetBtn").onclick = resetAll;
document.getElementById("stopBtn").onclick = stopSeries;
document.getElementById("exportPgnBtn").onclick = exportPgn;

initBoard();
applyI18n();
resetAll();
