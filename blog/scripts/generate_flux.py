"""plan의 섹션 근거와 imagegen 장면을 합쳐 FLUX 1.1 Pro로 생성한다.

사용: python -X utf8 blog/scripts/generate_flux.py <post-id> [--only key1,key2] [--force] [--plan 경로]
- 계약: skills/specs/operation/blogMedia.md. 블로그는 글 하나가 폴더 하나이고
  blog/posts/<글 폴더>/media.json 이 그 글의 이미지 계획 정본이다.
- 교안은 --plan ../eddmpython-course/curriculum/<카테고리>/plan.json 을 준다. 본문 문장이 공개 저장소로
  새지 않게 plan만 갈라 두었고 이미지와 catalog는 블로그와 공유한다.
- 출력: ../eddmpython.out/blog-media/<post-id>/<assetKey>.master.png (색 없는 회색 원본, Git 밖)
- 이 스크립트는 색을 만들지 않는다. 강조색은 paint_media.py 가 site/src/design.ts 에서 읽어 입힌다.
  강조색이 바뀌면 원본은 그대로 두고 paint_media.py 만 다시 돌린다.
- 키: 저장소 루트 .env의 REPLICATE_API_TOKEN. 값은 어디에도 출력하지 않는다.
- 속도: Replicate 계정 분당 제한을 고려해 생성 사이 12초 간격.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests

sys.dont_write_bytecode = True
from project_env import load_project_env

from media_paths import MASTER_SUFFIX, REPO_ROOT, STAGING_ROOT  # noqa: E402
POSTS_ROOT = REPO_ROOT / "blog" / "posts"
API = "https://api.replicate.com/v1/predictions"
MODEL = "black-forest-labs/flux-1.1-pro"
GEN_INTERVAL_SEC = 12
COLOR_PROFILE = "eddmpython-dark-v2"
PALETTE_POLICY = "eddmpython-gray-master-v1"


def composePrompt(asset: dict[str, object]) -> str:
    """본문 주장과 실제 피사체를 자유 장면 지시보다 높은 우선순위로 붙인다."""
    required = (
        "sectionHeading",
        "contentAnchor",
        "visualSubject",
        "visualRelationship",
        "prompt",
    )
    missing = [key for key in required if not str(asset.get(key) or "").strip()]
    if missing:
        raise ValueError(f"섹션 기반 이미지 필드가 비었다: {', '.join(missing)}")
    # 부제는 본문에 있을 때만 붙인다. 없는 절에 부제를 지어내면 글쓰기 정본과 부딪힌다.
    subtitle = str(asset.get("sectionSubtitle") or "").strip()
    lines = [
        str(asset["prompt"]).strip(),
        "Mandatory semantic grounding. If an earlier scene instruction conflicts, this block wins.",
        f"Article section title: {asset['sectionHeading']}",
        *([f"Section subtitle: {subtitle}"] if subtitle else []),
        f"Exact article claim: {asset['contentAnchor']}",
        f"Concrete subject that must be visibly recognizable: {asset['visualSubject']}",
        f"Relationship the image must explain: {asset['visualRelationship']}",
        "Do not replace the concrete subject with a generic workshop, road, gate, machine, or decorative metaphor.",
        "The image is rejected if a reader cannot connect it to this section without guessing.",
    ]
    if asset.get("visualProfile") == COLOR_PROFILE:
        if asset.get("palettePolicy") != PALETTE_POLICY:
            raise ValueError(f"{COLOR_PROFILE}에는 {PALETTE_POLICY}가 필요하다")
        lines.extend(
            (
                "Mandatory rendering mode. This block overrides every earlier color instruction.",
                "This is a physical photograph of real objects on a surface. It is not an illustration, diagram, interface, or screen capture.",
                "Render in neutral grayscale only. No hue anywhere in the frame.",
                "Keep the frame dark overall. Background and largest surfaces sit near black.",
                "Light one small part of the concrete subject brightly so it is the brightest area in the frame.",
                "Nothing else in the frame reaches that brightness. Keep every other light surface in the middle gray range.",
                "Show success, failure, selection, and direction through shape, line weight, value contrast, and position.",
                # 이 세 줄은 앞에도 한 번 나온다. 2026-08-26 에 001 을 다시 만들었더니 일곱 장 중
                # 넷이 가짜 코드 글자와 사람과 로봇을 그렸다. 금지를 한 번만 적으면 모델이 흘린다.
                "There are no people, no faces, no hands, and no robots anywhere in this image.",
                "There are no screens, monitors, windows, panels, or user interfaces anywhere in this image.",
                "There is no text of any kind. No words, no letters, no numbers, no code, no labels, no pseudo-text, no scribbles that resemble writing.",
            )
        )
    lines.extend(
        (
            "Final rendering constraint. The article title, subtitle, claim, and subject above are context only. Never draw or copy them into the image.",
            "No typography of any kind: no words, letters, numbers, code, labels, captions, headings, UI copy, pseudo-text, or watermark.",
        )
    )
    return "\n".join(lines)


def loadToken() -> str:
    load_project_env()
    token = os.getenv("REPLICATE_API_TOKEN", "")
    if not token:
        sys.exit("eddmpython 또는 DartLab .env에 REPLICATE_API_TOKEN이 필요하다.")
    return token


def create(headers: dict[str, str], prompt: str) -> str:
    payload = {
        "version": MODEL,
        "input": {
            "prompt": prompt,
            "aspect_ratio": "3:2",
            # 원본은 무손실 PNG 다. 강조색을 바꿀 때마다 다시 칠하므로 여기서 손실을
            # 먹으면 칠할 때마다 조금씩 더 나빠진다. 발행본만 WebP 로 줄인다.
            "output_format": "png",
            "safety_tolerance": 2,
        },
    }
    r = requests.post(API, headers=headers, json=payload, timeout=60)
    r.raise_for_status()
    return r.json()["id"]


def poll(headers: dict[str, str], pid: str, timeout: int = 240) -> str:
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = requests.get(f"{API}/{pid}", headers=headers, timeout=30)
        r.raise_for_status()
        j = r.json()
        status = j.get("status")
        if status == "succeeded":
            out = j.get("output")
            return out[0] if isinstance(out, list) else out
        if status in ("failed", "canceled"):
            raise RuntimeError(f"FLUX {status}: {j.get('error')}")
        time.sleep(2)
    raise TimeoutError(f"FLUX poll timeout: {pid}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("post", help="post id (파일 stem, 예: 005-claude-code-agents)")
    parser.add_argument("--only", default="", help="쉼표로 나눈 assetKey 목록만 생성")
    parser.add_argument("--force", action="store_true", help="이미 있는 파일도 다시 생성")
    parser.add_argument(
        "--plan",
        default="",
        help="다른 plan.json 경로. 교안은 ../eddmpython-course/curriculum/<카테고리>/plan.json 을 쓴다",
    )
    args = parser.parse_args()

    plan_path = Path(args.plan).resolve() if args.plan else POSTS_ROOT / args.post / "media.json"
    if not plan_path.exists():
        sys.exit(f"plan 을 찾을 수 없다: {plan_path}")
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    # 글 폴더의 media.json 은 1, 교안 plan 은 2 다.
    if plan.get("version") not in (1, 2) or plan.get("promptContract") != "section-grounded-v2":
        sys.exit("media.json의 section-grounded-v2 계약이 필요하다.")
    assets = plan.get("assets", {})
    onlyKeys = {k.strip() for k in args.only.split(",") if k.strip()}
    # 글 폴더의 media.json 은 자기 글 것만 들고 있어 키가 곧 assetKey 다. 교안 plan 은 여러
    # 글을 모아 두므로 post 필드로 거른다. 둘 다 받는다.
    targets = [
        {**a, "post": a.get("post", args.post), "assetKey": a.get("assetKey", k.split("/")[-1])}
        for k, a in sorted(assets.items())
        if a.get("post", args.post) == args.post
        and a.get("sourceKind") == "imagegen"
        and (not onlyKeys or a.get("assetKey", k.split("/")[-1]) in onlyKeys)
    ]
    if not targets:
        sys.exit(f"{plan_path}에 {args.post}의 imagegen 자산이 없다.")

    headers = {"Authorization": f"Token {loadToken()}", "Content-Type": "application/json"}
    outDir = STAGING_ROOT / args.post
    outDir.mkdir(parents=True, exist_ok=True)

    done = 0
    for asset in targets:
        key = asset["assetKey"]
        dest = outDir / f"{key}{MASTER_SUFFIX}"
        if dest.exists() and not args.force:
            print(f"skip {key}: 이미 있음")
            continue
        prompt = composePrompt(asset)
        print(f"generate {key} ...")
        pid = create(headers, prompt)
        url = poll(headers, pid)
        r = requests.get(url, timeout=120)
        r.raise_for_status()
        dest.write_bytes(r.content)
        print(f"  -> {dest} ({len(r.content) // 1024} KB)")
        done += 1
        time.sleep(GEN_INTERVAL_SEC)
    print(f"완료: {done}건 생성, 경로 {outDir}")
    if done:
        print("회색 원본이다. 강조색을 입혀야 발행본이 된다.")
        print(f"  python -X utf8 blog/scripts/paint_media.py {args.post}")


if __name__ == "__main__":
    main()
