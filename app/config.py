from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    stockfish_path: str = "stockfish"
    default_think_time: float = 0.2

    model_config = SettingsConfigDict(env_prefix="CHESS_", env_file=".env", extra="ignore")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
