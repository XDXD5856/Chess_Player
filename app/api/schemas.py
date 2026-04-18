from pydantic import BaseModel, Field


class EngineRequest(BaseModel):
    fen: str = Field(..., min_length=2)
    think_time: float = Field(default=0.2, gt=0)
    engine_path: str | None = None


class EngineResponse(BaseModel):
    best_move: str | None
    evaluation: str | None
    principal_variation: list[str] = Field(default_factory=list)


class CreateGameRequest(BaseModel):
    mode: str = Field(pattern="^(human_vs_human|human_vs_engine|engine_vs_engine)$")
    think_time: float = Field(default=0.2, gt=0)
    start_fen: str | None = None
    white_engine_path: str | None = None
    black_engine_path: str | None = None
    human_color: str = Field(default="white", pattern="^(white|black|random)$")


class MoveRequest(BaseModel):
    game_id: str
    move_uci: str = Field(min_length=4, max_length=5)


class LegalMovesRequest(BaseModel):
    game_id: str
    from_square: str = Field(min_length=2, max_length=2)


class EngineTurnRequest(BaseModel):
    game_id: str


class EngineMatchRequest(BaseModel):
    games: int = Field(default=2, ge=1, le=200)
    think_time: float = Field(default=0.05, gt=0)
    white_engine_path: str | None = None
    black_engine_path: str | None = None


class StopSeriesRequest(BaseModel):
    series_id: str


class UnfinishedFeatureResponse(BaseModel):
    status: str
    detail: str
