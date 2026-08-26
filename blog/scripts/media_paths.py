"""이미지 경로와 파일 이름 규칙의 정본.

이 값들이 파일마다 따로 적혀 있었다. `MASTER_SUFFIX` 는 네 곳(파이썬 셋, JS 하나),
`eddmpython.out/blog-media` 는 다섯 곳이었다. JS 쪽에는 `paint_media.py 의 MASTER_SUFFIX 와
같다` 라는 주석까지 손으로 적혀 있었다. 손으로 적은 "같다" 는 갈라지는 것을 못 막는다.

한쪽이 바뀌면 검사기는 실패하지 않고 **조용히 아무것도 안 보게 된다.** 원본 접미사가 갈라지면
`check:workspace` 가 원본을 하나도 못 찾고 초록불을 띄운다. 그것이 가장 나쁜 실패다.

`site/scripts/workspace-contract.mjs` 는 이 파일을 읽어 값을 뽑는다. 복사하지 않는다.
아래 세 줄의 모양(`이름 = "값"`)을 바꾸면 그쪽이 못 읽고 죽는다. 그것이 의도다.
"""

from __future__ import annotations

from pathlib import Path

# 아래 세 줄은 JS 검사기가 정규식으로 읽는다. 한 줄에 하나씩, 큰따옴표로 둔다.
OUTPUT_DIR = "eddmpython.out"
STAGING_DIR = "blog-media"
MASTER_SUFFIX = ".master.png"

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = REPO_ROOT.parent / OUTPUT_DIR
STAGING_ROOT = OUTPUT_ROOT / STAGING_DIR


def object_url(repo: str, path: str) -> str:
    """허깅페이스 데이터셋의 객체 하나를 받는 주소. 조립을 여러 곳에서 다시 쓰지 않는다."""
    return f"https://huggingface.co/datasets/{repo}/resolve/main/{path}"
