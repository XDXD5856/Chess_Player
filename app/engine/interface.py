from typing import Protocol


class ChessEngine(Protocol):
    def choose_move(self, fen: str, think_time: float) -> str | None:
        """Return best move in UCI format for the given FEN."""
