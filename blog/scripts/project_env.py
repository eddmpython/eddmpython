"""로컬 프로젝트 자격증명을 기존 셸 값을 보존하며 .env에서 읽는다."""

from __future__ import annotations

import os
import re
from collections.abc import Iterable
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ENV_PATHS = (
    REPO_ROOT / ".env",
    REPO_ROOT.parent / "dartlab" / ".env",
)
ENV_KEY_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


def load_project_env(paths: Iterable[Path] = DEFAULT_ENV_PATHS) -> tuple[Path, ...]:
    """환경변수 우선순위를 지키며 로컬 .env 파일을 차례로 읽는다.

    우선순위는 이미 설정된 셸 환경변수, eddmpython의 `.env`, DartLab의 공유 `.env` 순서다.
    값은 출력하지 않고 현재 프로세스에만 반영한다.
    """
    loaded: list[Path] = []
    for path in paths:
        resolved = path.resolve()
        if not resolved.is_file():
            continue
        for raw_line in resolved.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            if not ENV_KEY_RE.fullmatch(key) or key in os.environ:
                continue
            os.environ[key] = value.strip().strip("\"'")
        loaded.append(resolved)
    return tuple(loaded)
