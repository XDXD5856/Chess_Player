from app.engine.interface import ChessEngine
from app.engine.stockfish_engine import analyze_position


class StockfishEngineAdapter(ChessEngine):
    def __init__(self, engine_path: str) -> None:
        self.engine_path = engine_path

    def choose_move(self, fen: str, think_time: float) -> str | None:
        result = analyze_position(fen=fen, engine_path=self.engine_path, think_time=think_time)
        return result.get("best_move")
