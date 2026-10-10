from functools import lru_cache
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    application_env: str = "development"
    log_level: str = "INFO"
    frontend_origin: str = "http://localhost:3000"

    database_url: str
    jwt_secret_key: str = Field(min_length=32)
    ai_api_key: str
    gemini_model: str = "gemini-3.5-flash-lite"

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.application_env.lower() == "production":
            if len(self.jwt_secret_key) < 32:
                raise ValueError(
                    "JWT_SECRET_KEY must contain at least 32 characters in production"
                )

            if self.jwt_secret_key == "replace-with-a-local-development-secret":
                raise ValueError(
                    "Set a unique JWT_SECRET_KEY before running in production"
                )

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()