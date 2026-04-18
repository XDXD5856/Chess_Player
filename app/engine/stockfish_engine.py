from contextlib import contextmanager

import chess
import chess.engine


class InvalidFenError(ValueError):
    """Raised when FEN cannot be parsed by python-chess."""


class StockfishNotFoundError(FileNotFoundError):
    """Raised when the configured Stockfish binary does not exist."""


class EngineFailureError(RuntimeError):
    """Raised when the engine process fails during analysis/play."""


@contextmanager
def open_engine(engine_path: str):
    try:
        engine = chess.engine.SimpleEngine.popen_uci(engine_path)
    except FileNotFoundError as exc:
        raise StockfishNotFoundError(f"Stockfish binary not found at: {engine_path}") from exc

    try:
        yield engine
    finally:
        engine.quit()


def _validate_board(fen: str) -> chess.Board:
    try:
        return chess.Board(fen)
    except ValueError as exc:
        raise InvalidFenError(f"Invalid FEN: {fen}") from exc


def _score_to_string(score: chess.engine.PovScore | None) -> str | None:
    if score is None:
        return None
    return str(score.white())


def analyze_position(fen: str, engine_path: str, think_time: float = 0.2) -> dict[str, str | list[str] | None]:
    board = _validate_board(fen)

    try:
        with open_engine(engine_path) as engine:
            info = engine.analyse(
                board,
                chess.engine.Limit(time=think_time),
                info=chess.engine.INFO_SCORE | chess.engine.INFO_PV,
            )
            played = engine.play(board, chess.engine.Limit(time=think_time))
    except chess.engine.EngineError as exc:
        raise EngineFailureError(f"Engine runtime failure: {exc}") from exc
    except TimeoutError as exc:
        raise EngineFailureError("Engine runtime failure: timed out") from exc

    best_move = played.move.uci() if played.move else None
    pv = [move.uci() for move in info.get("pv", [])]
    return {
        "best_move": best_move,
        "evaluation": _score_to_string(info.get("score")),
        "principal_variation": pv,
    }
