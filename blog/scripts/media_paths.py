"""이미지 경로와 파일 이름 규칙의 정본.

이 값들이 파일마다 따로 적혀 있었다. `MASTER_SUFFIX` 는 네 곳(파이썬 셋, JS 하나),
이미지 대기 경로는 다섯 곳이었다. JS 쪽에는 `paint_media.py 의 MASTER_SUFFIX 와
같다` 라는 주석까지 손으로 적혀 있었다. 손으로 적은 "같다" 는 갈라지는 것을 못 막는다.

한쪽이 바뀌면 검사기는 실패하지 않고 **조용히 아무것도 안 보게 된다.** 원본 접미사가 갈라지면
`check:workspace` 가 원본을 하나도 못 찾고 초록불을 띄운다. 그것이 가장 나쁜 실패다.

`site/scripts/workspace-contract.mjs` 는 이 파일을 읽어 값을 뽑는다. 복사하지 않는다.
아래 이름 상수의 모양(`이름 = "값"`)을 바꾸면 그쪽이 못 읽고 죽는다.
"""

from __future__ import annotations

from pathlib import Path
import os

# 이미지 이름 상수는 JS 검사기도 읽는다.
STAGING_DIR = "blog-media"
MASTER_SUFFIX = ".master.png"

REPO_ROOT = Path(__file__).resolve().parents[2]
def execution_root() -> Path:
    """명시한 작업 경로만 사용한다. 저장소별 외부 폴더로 되돌아가지 않는다."""
    value = os.environ.get("EDDMPYTHON_RUN_DIR", "")
    shared = (Path(os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData/Local"))) / "dev-workspace"
              if os.name == "nt" else Path.home() / ".local/share/dev-workspace")
    root = Path(value)
    if not value or not root.is_absolute() or root.parent.resolve() != shared.resolve():
        raise RuntimeError("EDDMPYTHON_RUN_DIR에 dev-workspace 아래 새 작업 폴더의 절대 경로를 지정하세요")
    import re
    if (not re.search(r"-[a-z0-9]{6,}$", root.name, re.I) or root.name.lower().endswith(".out")
            or not root.is_dir() or root.is_symlink() or root.resolve() != root.absolute()):
        raise RuntimeError("실행 공간은 고유 접미사가 붙은 실제 작업 디렉터리여야 합니다")
    return root.resolve()


def staging_root() -> Path:
    """원격 읽기 검증은 로컬 산출물을 요구하지 않는다. 쓰기 시점에만 경로를 받는다."""
    return execution_root() / STAGING_DIR


def object_url(repo: str, path: str) -> str:
    """허깅페이스 데이터셋의 객체 하나를 받는 주소. 조립을 여러 곳에서 다시 쓰지 않는다."""
    return f"https://huggingface.co/datasets/{repo}/resolve/main/{path}"
