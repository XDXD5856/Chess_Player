from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.schemas import (
    CreateGameRequest,
    EngineMatchRequest,
    EngineRequest,
    EngineResponse,
    EngineTurnRequest,
    LegalMovesRequest,
    MoveRequest,
    StopSeriesRequest,
    UnfinishedFeatureResponse,
)
from app.config import get_settings
from app.engine.stockfish_engine import EngineFailureError, InvalidFenError, StockfishNotFoundError, analyze_position
from app.services.game_service import GameService, game_to_dict, series_to_dict

settings = get_settings()
app = FastAPI(title="Chess Engine Service")
service = GameService()

web_dir = Path(__file__).parent / "web"
app.mount("/static", StaticFiles(directory=web_dir), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(web_dir / "index.html")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "stage": "stage2-finalizing"}


@app.post("/api/engine/move", response_model=EngineResponse)
def move(payload: EngineRequest) -> EngineResponse:
    return _run_engine(payload)


@app.post("/api/engine/analyze", response_model=EngineResponse)
def analyze(payload: EngineRequest) -> EngineResponse:
    return _run_engine(payload)


@app.post("/api/game/create")
def create_game(payload: CreateGameRequest) -> dict:
    try:
        white_engine = payload.white_engine_path or settings.stockfish_path
        black_engine = payload.black_engine_path or settings.stockfish_path
        session = service.create_game(
            mode=payload.mode,
            think_time=payload.think_time,
            start_fen=payload.start_fen,
            white_engine_path=white_engine,
            black_engine_path=black_engine,
        )
        if payload.mode == "engine_vs_engine":
            service.maybe_apply_engine_move(session.game_id)
        return game_to_dict(session)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/game/move")
def game_move(payload: MoveRequest) -> dict:
    try:
        session = service.apply_human_move(payload.game_id, payload.move_uci)
        if session.mode == "human_vs_engine" and not session.board.is_game_over():
            service.maybe_apply_engine_move(session.game_id)
        return game_to_dict(session)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except StockfishNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except EngineFailureError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/game/legal-moves")
def legal_moves(payload: LegalMovesRequest) -> dict:
    try:
        moves = service.legal_moves_from(payload.game_id, payload.from_square)
        return {"from_square": payload.from_square, "to_squares": moves}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/game/engine-turn")
def engine_turn(payload: EngineTurnRequest) -> dict:
    try:
        session = service.maybe_apply_engine_move(payload.game_id)
        return game_to_dict(session)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except StockfishNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except EngineFailureError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/game/engine-vs-engine/start")
def engine_vs_engine_start(payload: EngineMatchRequest) -> dict:
    white_engine = payload.white_engine_path or settings.stockfish_path
    black_engine = payload.black_engine_path or settings.stockfish_path
    try:
        series = service.start_engine_vs_engine_series(
            games=payload.games,
            think_time=payload.think_time,
            white_engine_path=white_engine,
            black_engine_path=black_engine,
        )
        return series_to_dict(series)
    except StockfishNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except EngineFailureError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/game/engine-vs-engine/status/{series_id}")
def engine_vs_engine_status(series_id: str) -> dict:
    try:
        return series_to_dict(service.get_series(series_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/game/engine-vs-engine/stop")
def engine_vs_engine_stop(payload: StopSeriesRequest) -> dict:
    try:
        series = service.stop_series(payload.series_id)
        return series_to_dict(series)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/stage3/recognize", response_model=UnfinishedFeatureResponse, status_code=501)
def stage3_unfinished() -> UnfinishedFeatureResponse:
    return UnfinishedFeatureResponse(
        status="unfinished",
        detail="Stage 3 board recognition is planned but not implemented.",
    )


def _run_engine(payload: EngineRequest) -> EngineResponse:
    engine_path = payload.engine_path or settings.stockfish_path
    try:
        result = analyze_position(
            fen=payload.fen,
            engine_path=engine_path,
            think_time=payload.think_time,
        )
        return EngineResponse(**result)
    except InvalidFenError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except StockfishNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except EngineFailureError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
