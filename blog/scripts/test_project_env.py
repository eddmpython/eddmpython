"""project_env의 우선순위와 비밀값 비출력 계약을 검사한다."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

sys.dont_write_bytecode = True
from project_env import load_project_env


def main() -> None:
    keys = ("EDDM_ENV_EXISTING", "EDDM_ENV_LOCAL", "EDDM_ENV_SHARED")
    previous = {key: os.environ.get(key) for key in keys}
    try:
        with tempfile.TemporaryDirectory(prefix="eddmpython-env-") as temp_dir:
            root = Path(temp_dir)
            local = root / "local.env"
            shared = root / "shared.env"
            local.write_text(
                "# local\nEDDM_ENV_EXISTING=local-must-not-win\nEDDM_ENV_LOCAL='local-value'\n",
                encoding="utf-8",
            )
            shared.write_text(
                "EDDM_ENV_LOCAL=shared-must-not-win\nEDDM_ENV_SHARED=shared-value\n",
                encoding="utf-8",
            )
            os.environ["EDDM_ENV_EXISTING"] = "shell-value"
            os.environ.pop("EDDM_ENV_LOCAL", None)
            os.environ.pop("EDDM_ENV_SHARED", None)

            loaded = load_project_env((local, shared))

            assert loaded == (local.resolve(), shared.resolve())
            assert os.environ["EDDM_ENV_EXISTING"] == "shell-value"
            assert os.environ["EDDM_ENV_LOCAL"] == "local-value"
            assert os.environ["EDDM_ENV_SHARED"] == "shared-value"
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
    print("project env: 셸, 로컬, 공유 .env 우선순위 통과")


if __name__ == "__main__":
    main()
