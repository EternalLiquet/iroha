from __future__ import annotations

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ollama_url: AnyHttpUrl = Field(default="http://127.0.0.1:11434", alias="OLLAMA_URL")
    ollama_model: str = Field(default="llama3.2:3b", alias="OLLAMA_MODEL")

    max_tokens: int = Field(default=120, alias="MAX_TOKENS", ge=1, le=2048)
    temperature: float = Field(default=0.7, alias="TEMPERATURE", ge=0.0, le=2.0)

    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    host: str = Field(default="127.0.0.1", alias="HOST")
    port: int = Field(default=8000, alias="PORT", ge=1, le=65535)


settings = Settings()