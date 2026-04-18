from fastapi.testclient import TestClient

from app.engine.stockfish_engine import EngineFailureError, StockfishNotFoundError
from app.main import app

client = TestClient(app)
START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def test_health() -> None:
    r = client.get("/health")
    assert r.status_code == 200


def test_engine_invalid_fen_returns_400() -> None:
    r = client.post("/api/engine/move", json={"fen": "bad-fen", "think_time": 0.1})
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "invalid_fen"


def test_engine_valid_request(monkeypatch) -> None:
    def fake_analyze_position(fen: str, engine_path: str, think_time: float) -> dict:
        return {"best_move": "e2e4", "evaluation": "Cp(+20)", "principal_variation": ["e2e4", "e7e5"]}

    monkeypatch.setattr("app.main.analyze_position", fake_analyze_position)
    r = client.post("/api/engine/analyze", json={"fen": START_FEN})
    assert r.status_code == 200


def test_engine_missing_stockfish_returns_503(monkeypatch) -> None:
    def fake_analyze_position(fen: str, engine_path: str, think_time: float) -> dict:
        raise StockfishNotFoundError("missing")

    monkeypatch.setattr("app.main.analyze_position", fake_analyze_position)
    r = client.post("/api/engine/move", json={"fen": START_FEN})
    assert r.status_code == 503
    assert r.json()["detail"]["code"] == "engine_missing"


def test_engine_runtime_failure_returns_502(monkeypatch) -> None:
    def fake_analyze_position(fen: str, engine_path: str, think_time: float) -> dict:
        raise EngineFailureError("runtime fail")

    monkeypatch.setattr("app.main.analyze_position", fake_analyze_position)
    r = client.post("/api/engine/move", json={"fen": START_FEN})
    assert r.status_code == 502


def test_human_vs_engine_black_engine_moves_first(monkeypatch) -> None:
    def fake_engine_move(game_id: str):
        from app.main import service

        session = service.get_game(game_id)
        if session.board.turn:
            session.board.push_uci("e2e4")
            session.moves.append("e2e4")
        return session

    monkeypatch.setattr("app.main.service.maybe_apply_engine_move", fake_engine_move)
    r = client.post(
        "/api/game/create",
        json={"mode": "human_vs_engine", "human_color": "black", "think_time": 0.1},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["moves"] == ["e2e4"]
    assert data["human_color"] == "black"


def test_not_your_turn_error(monkeypatch) -> None:
    monkeypatch.setattr("app.main.service.maybe_apply_engine_move", lambda game_id: None)
    create = client.post(
        "/api/game/create",
        json={"mode": "human_vs_engine", "human_color": "black", "think_time": 0.1},
    ).json()

    r = client.post("/api/game/move", json={"game_id": create["game_id"], "move_uci": "e7e5"})
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "not_your_turn"


def test_no_legal_moves_error() -> None:
    create = client.post("/api/game/create", json={"mode": "human_vs_human", "think_time": 0.1}).json()
    r = client.post("/api/game/legal-moves", json={"game_id": create["game_id"], "from_square": "e5"})
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "no_legal_moves"


def test_engine_vs_engine_series_start_status_stop(monkeypatch) -> None:
    class DummySeries:
        series_id = "series-1"
        total_games = 2
        completed_games = 1
        current_game = 2
        stats = {"white_wins": 1, "black_wins": 0, "draws": 0}
        running = True
        stop_requested = False
        summaries = [{"game": 1, "result": "1-0", "moves": ["e2e4"], "final_fen": START_FEN, "pgn": "PGN"}]

    monkeypatch.setattr("app.main.service.start_engine_vs_engine_series", lambda **kwargs: DummySeries())
    monkeypatch.setattr("app.main.service.get_series", lambda series_id: DummySeries())

    def fake_stop(series_id: str):
        s = DummySeries()
        s.stop_requested = True
        s.running = False
        return s

    monkeypatch.setattr("app.main.service.stop_series", fake_stop)

    start = client.post("/api/game/engine-vs-engine/start", json={"games": 2, "think_time": 0.1})
    assert start.status_code == 200
    status = client.get("/api/game/engine-vs-engine/status/series-1")
    assert status.status_code == 200
    stop = client.post("/api/game/engine-vs-engine/stop", json={"series_id": "series-1"})
    assert stop.status_code == 200


def test_stage3_unfinished() -> None:
    r = client.get("/api/stage3/recognize")
    assert r.status_code == 501
