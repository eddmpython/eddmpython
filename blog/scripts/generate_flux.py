"""plan.json의 섹션 근거와 imagegen 장면을 합쳐 FLUX 1.1 Pro로 생성한다.

사용: python -X utf8 blog/scripts/generate_flux.py <post-id> [--only key1,key2] [--force]
- 계약: skills/specs/operation/blogMedia.md. 프롬프트와 의미의 정본은 blog/media/plan.json이다.
- 출력: ../eddmpython.out/blog-media/<post-id>/<assetKey>.webp (Git 밖, 검수 후 publish_media.py로 HF 발행)
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

REPO_ROOT = Path(__file__).resolve().parents[2]
PLAN_PATH = REPO_ROOT / "blog" / "media" / "plan.json"
STAGING_ROOT = REPO_ROOT.parent / "eddmpython.out" / "blog-media"
API = "https://api.replicate.com/v1/predictions"
MODEL = "black-forest-labs/flux-1.1-pro"
GEN_INTERVAL_SEC = 12
COLOR_PROFILE = "eddmpython-dark-v2"
PALETTE_POLICY = "eddmpython-carbon-ivory-sand-v1"


def composePrompt(asset: dict[str, object]) -> str:
    """본문 주장과 실제 피사체를 자유 장면 지시보다 높은 우선순위로 붙인다."""
    required = (
        "sectionHeading",
        "sectionSubtitle",
        "contentAnchor",
        "visualSubject",
        "visualRelationship",
        "prompt",
    )
    missing = [key for key in required if not str(asset.get(key) or "").strip()]
    if missing:
        raise ValueError(f"섹션 기반 이미지 필드가 비었다: {', '.join(missing)}")
    lines = [
        str(asset["prompt"]).strip(),
        "Mandatory semantic grounding. If an earlier scene instruction conflicts, this block wins.",
        f"Article section title: {asset['sectionHeading']}",
        f"Section subtitle: {asset['sectionSubtitle']}",
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
                "Mandatory brand palette. This block overrides every earlier color instruction.",
                "Use carbon #101514 for the background and largest surfaces.",
                "Use ivory #f5f3ee for primary subjects and light surfaces.",
                "Use sand #d8be91 as the only small accent color.",
                "All remaining colors must be nearly desaturated black, graphite, or warm gray.",
                "Do not use blue, cyan, green, purple, pink, red, gold, rainbow colors, or neon light.",
                "Show success, failure, selection, and direction through shape, line weight, value contrast, and position instead of extra hues.",
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
            "output_format": "webp",
            "output_quality": 90,
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
        help="다른 plan.json 경로. 교안은 course/curriculum/<카테고리>/plan.json 을 쓴다",
    )
    args = parser.parse_args()

    plan_path = Path(args.plan).resolve() if args.plan else PLAN_PATH
    if not plan_path.exists():
        sys.exit(f"plan 을 찾을 수 없다: {plan_path}")
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    if plan.get("version") != 2 or plan.get("promptContract") != "section-grounded-v2":
        sys.exit("plan.json의 section-grounded-v2 계약이 필요하다.")
    assets = plan.get("assets", {})
    onlyKeys = {k.strip() for k in args.only.split(",") if k.strip()}
    targets = [
        a for k, a in sorted(assets.items())
        if a.get("post") == args.post
        and a.get("sourceKind") == "imagegen"
        and (not onlyKeys or a.get("assetKey") in onlyKeys)
    ]
    if not targets:
        sys.exit(f"plan.json에 {args.post}의 imagegen 자산이 없다.")

    headers = {"Authorization": f"Token {loadToken()}", "Content-Type": "application/json"}
    outDir = STAGING_ROOT / args.post
    outDir.mkdir(parents=True, exist_ok=True)

    done = 0
    for asset in targets:
        key = asset["assetKey"]
        dest = outDir / f"{key}.webp"
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


if __name__ == "__main__":
    main()
