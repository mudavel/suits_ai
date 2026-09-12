import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )

    @classmethod
    def from_env(cls) -> "Settings":
        configured = os.getenv("SUITS_CORS_ORIGINS")
        if configured is None:
            return cls()
        origins = tuple(
            origin.strip().rstrip("/")
            for origin in configured.split(",")
            if origin.strip()
        )
        return cls(cors_origins=origins)
