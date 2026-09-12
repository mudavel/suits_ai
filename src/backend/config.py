import math
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )
    data_mode: Literal["mock", "artifacts"] = "artifacts"
    ai_mode: Literal["local", "openai"] = "local"
    policy_mode: Literal["unavailable", "engine", "mock"] = "unavailable"
    artifacts_dir: Path = REPO_ROOT / "artefacts" / "Hackaton Unicamp"
    database_path: Path = REPO_ROOT / "src" / "backend" / ".local" / "suits.sqlite3"
    openai_api_key: str | None = field(default=None, repr=False)
    openai_model: str = "gpt-6-astra"
    openai_reasoning_effort: Literal["low", "medium", "high", "xhigh", "max"] = "low"
    openai_max_output_tokens: int = 25000
    openai_timeout: float = 120.0

    def __post_init__(self):
        if self.data_mode not in {"mock", "artifacts"}:
            raise ValueError("SUITS_DATA_MODE deve ser mock ou artifacts.")
        if self.ai_mode not in {"local", "openai"}:
            raise ValueError("SUITS_AI_MODE deve ser local ou openai.")
        if self.policy_mode not in {"unavailable", "engine", "mock"}:
            raise ValueError("SUITS_POLICY_MODE deve ser unavailable, engine ou mock.")
        if self.data_mode != "mock" and self.policy_mode == "mock":
            raise ValueError("Política mock só pode ser usada com casos mock.")
        if self.ai_mode == "openai" and not self.openai_api_key:
            raise ValueError("Configure OPENAI_API_KEY para SUITS_AI_MODE=openai.")
        if self.openai_reasoning_effort not in {"low", "medium", "high", "xhigh", "max"}:
            raise ValueError("OPENAI_REASONING_EFFORT deve ser low, medium, high, xhigh ou max.")
        if not 1 <= self.openai_max_output_tokens <= 128000:
            raise ValueError("OPENAI_MAX_OUTPUT_TOKENS deve estar entre 1 e 128000.")
        if not math.isfinite(self.openai_timeout) or self.openai_timeout <= 0:
            raise ValueError("OPENAI_TIMEOUT_SECONDS deve ser um número finito positivo.")

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv(REPO_ROOT / ".env", override=False)
        configured = os.getenv("SUITS_CORS_ORIGINS")
        origins = cls.cors_origins if configured is None else tuple(
            origin.strip().rstrip("/")
            for origin in configured.split(",")
            if origin.strip()
        )
        return cls(
            cors_origins=origins,
            data_mode=os.getenv("SUITS_DATA_MODE", "artifacts"),
            ai_mode=os.getenv("SUITS_AI_MODE", "local"),
            policy_mode=os.getenv("SUITS_POLICY_MODE", "unavailable"),
            artifacts_dir=Path(os.getenv("SUITS_ARTIFACTS_DIR", str(cls.artifacts_dir))),
            database_path=Path(os.getenv("SUITS_DATABASE_PATH", str(cls.database_path))),
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            openai_model=os.getenv("OPENAI_MODEL", cls.openai_model),
            openai_reasoning_effort=os.getenv("OPENAI_REASONING_EFFORT", cls.openai_reasoning_effort),
            openai_max_output_tokens=int(os.getenv("OPENAI_MAX_OUTPUT_TOKENS", str(cls.openai_max_output_tokens))),
            openai_timeout=float(os.getenv("OPENAI_TIMEOUT_SECONDS", str(cls.openai_timeout))),
        )
