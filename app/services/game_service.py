from dataclasses import dataclass, field
from threading import Lock, Thread
from uuid import uuid4

import chess
import chess.pgn

from app.engine.stockfish_adapter import StockfishEngineAdapter


@dataclass
class GameSession:
    game_id: str
    mode: str
    board: chess.Board = field(default_factory=chess.Board)
    moves: list[str] = field(default_factory=list)
    think_time: float = 0.2
    white_engine_path: str | None = None
    black_engine_path: str | None = None


@dataclass
class SeriesSession:
    series_id: str
    total_games: int
    think_time: float
    white_engine_path: str
    black_engine_path: str
    completed_games: int = 0
    current_game: int = 0
    stats: dict[str, int] = field(default_factory=lambda: {"white_wins": 0, "black_wins": 0, "draws": 0})
    running: bool = True
    stop_requested: bool = False
    summaries: list[dict] = field(default_factory=list)


class GameService:
    def __init__(self) -> None:
        self._games: dict[str, GameSession] = {}
        self._series: dict[str, SeriesSession] = {}
        self._lock = Lock()

    def create_game(
        self,
        mode: str,
        think_time: float,
        start_fen: str | None,
        white_engine_path: str | None,
        black_engine_path: str | None,
    ) -> GameSession:
        board = chess.Board(start_fen) if start_fen else chess.Board()
        game_id = str(uuid4())
        session = GameSession(
            game_id=game_id,
            mode=mode,
            board=board,
            think_time=think_time,
            white_engine_path=white_engine_path,
            black_engine_path=black_engine_path,
        )
        self._games[game_id] = session
        return session

    def get_game(self, game_id: str) -> GameSession:
        if game_id not in self._games:
            raise KeyError("Game not found")
        return self._games[game_id]

    def apply_human_move(self, game_id: str, move_uci: str) -> GameSession:
        session = self.get_game(game_id)
        move = chess.Move.from_uci(move_uci)
        if move not in session.board.legal_moves:
            raise ValueError(f"Illegal move: {move_uci}")
        session.board.push(move)
        session.moves.append(move_uci)
        return session

    def legal_moves_from(self, game_id: str, from_square: str) -> list[str]:
        session = self.get_game(game_id)
        try:
            square_idx = chess.parse_square(from_square)
        except ValueError as exc:
            raise ValueError(f"Invalid square: {from_square}") from exc
        return [chess.square_name(move.to_square) for move in session.board.legal_moves if move.from_square == square_idx]

    def maybe_apply_engine_move(self, game_id: str) -> GameSession:
        session = self.get_game(game_id)
        if session.board.is_game_over() or session.mode == "human_vs_human":
            return session

        if session.mode == "human_vs_engine" and session.board.turn == chess.WHITE:
            return session

        engine_path = session.white_engine_path if session.board.turn == chess.WHITE else session.black_engine_path
        if not engine_path:
            raise ValueError("Engine path is required for engine move")

        engine = StockfishEngineAdapter(engine_path)
        move = engine.choose_move(session.board.fen(), think_time=session.think_time)
        if move is None:
            return session

        session.board.push_uci(move)
        session.moves.append(move)
        return session

    def start_engine_vs_engine_series(self, games: int, think_time: float, white_engine_path: str, black_engine_path: str) -> SeriesSession:
        series = SeriesSession(
            series_id=str(uuid4()),
            total_games=games,
            think_time=think_time,
            white_engine_path=white_engine_path,
            black_engine_path=black_engine_path,
        )
        with self._lock:
            self._series[series.series_id] = series

        thread = Thread(target=self._run_series, args=(series.series_id,), daemon=True)
        thread.start()
        return series

    def _run_series(self, series_id: str) -> None:
        series = self.get_series(series_id)
        white_engine = StockfishEngineAdapter(series.white_engine_path)
        black_engine = StockfishEngineAdapter(series.black_engine_path)

        for game_index in range(series.total_games):
            if series.stop_requested:
                break

            series.current_game = game_index + 1
            board = chess.Board()
            moves: list[str] = []

            while not board.is_game_over():
                if series.stop_requested:
                    break
                engine = white_engine if board.turn == chess.WHITE else black_engine
                move = engine.choose_move(board.fen(), think_time=series.think_time)
                if move is None:
                    break
                board.push_uci(move)
                moves.append(move)

            game_result = board.outcome().result() if board.outcome() else "*"
            if game_result == "1-0":
                series.stats["white_wins"] += 1
            elif game_result == "0-1":
                series.stats["black_wins"] += 1
            elif game_result == "1/2-1/2":
                series.stats["draws"] += 1

            summary = {
                "game": game_index + 1,
                "result": game_result,
                "moves": moves,
                "final_fen": board.fen(),
                "pgn": moves_to_pgn(moves, game_result),
            }
            series.summaries.append(summary)
            series.completed_games += 1

            if series.stop_requested:
                break

        series.running = False

    def get_series(self, series_id: str) -> SeriesSession:
        with self._lock:
            if series_id not in self._series:
                raise KeyError("Series not found")
            return self._series[series_id]

    def stop_series(self, series_id: str) -> SeriesSession:
        series = self.get_series(series_id)
        series.stop_requested = True
        return series


def moves_to_pgn(moves: list[str], result: str = "*") -> str:
    board = chess.Board()
    game = chess.pgn.Game()
    game.headers["Result"] = result
    node = game
    for move_uci in moves:
        move = chess.Move.from_uci(move_uci)
        node = node.add_variation(move)
        board.push(move)
    return str(game)


def game_to_dict(session: GameSession) -> dict:
    board = session.board
    return {
        "game_id": session.game_id,
        "mode": session.mode,
        "fen": board.fen(),
        "turn": "white" if board.turn == chess.WHITE else "black",
        "moves": session.moves,
        "is_game_over": board.is_game_over(),
        "result": board.result() if board.is_game_over() else "*",
        "pgn": moves_to_pgn(session.moves, board.result() if board.is_game_over() else "*"),
    }


def series_to_dict(series: SeriesSession) -> dict:
    return {
        "series_id": series.series_id,
        "total_games": series.total_games,
        "completed_games": series.completed_games,
        "current_game": series.current_game,
        "stats": series.stats,
        "running": series.running,
        "stop_requested": series.stop_requested,
        "summaries": series.summaries,
    }
