"""회색 원본에 저장소 정본 강조색을 입힌다.

사용: python -X utf8 blog/scripts/paint_media.py <post-id> [--only key1,key2] [--desaturate]

## 왜 두 단계로 나누나

2026-08-26 까지 `generate_flux.py` 는 프롬프트에 `sand #d8be91` 을 직접 적어 이미지 모델에게
강조색을 그리게 했다. 그래서 강조색이 이미지 바이트 안에 굳었다. 운영자가 그날 골드를 전면
금지하고 강조색을 `#f56565` 로 바꿨을 때, 코드의 색은 `design.ts` 한 줄로 따라왔지만 이미
발행한 이미지 281개는 따라오지 못했다. 픽셀은 게이트가 볼 수 없고 다시 만들려면 유료 API 를
281번 부르면서 모델이 매번 다른 그림을 내놓는다.

그래서 색을 만드는 쪽과 칠하는 쪽을 갈랐다.

1. **원본(master)** 은 색이 없는 회색 이미지다. 모델이 만든다. 한 번 만들면 바꾸지 않는다
2. **발행본** 은 원본에 `site/src/design.ts` 의 강조색을 입힌 결과다. 이 스크립트가 만든다

강조색이 바뀌면 원본은 그대로 두고 이 스크립트만 다시 돌린다. 모델을 다시 부르지 않으므로
비용이 들지 않고, 결정적이라 같은 원본에서 언제나 같은 그림이 나온다.

## 어디를 칠하나

마스크를 따로 만들지 않는다. **휘도가 곧 마스크다.**

색상 계약은 원래부터 배경을 carbon 으로, 주요 피사체를 ivory 로, 강조를 작은 면적으로 두라고
했다. 그런 그림에서 가장 밝은 구간은 정의상 좁다. 003 의 hero 를 실제로 재 보니 휘도 0.7 을
넘는 픽셀이 전체의 1.4% 였다. 그 구간만 강조색 쪽으로 당기면 별도 지시 없이 `작은 면적의
강조 하나` 가 나온다.

픽셀 단위로 바로 섞으면 원본의 잡티를 따라가 얼룩이 진다. 마스크를 가로폭의 1% 만큼 흐린 뒤에
섞어서 덩어리진 빛으로 만든다.

## 무엇을 막나

`강조색은 작은 면적에` 는 지금까지 문장으로만 있었고 아무도 재지 않았다. 003 의 hero 는 채도
0.15 를 넘는 픽셀이 26% 였다. 작은 강조가 아니라 화면 전체에 깔린 색조였다. 이 스크립트는 칠한
면적을 세어 상한을 넘으면 실패한다. 되돌릴 수 없는 것은 발행된 바이트이므로 발행 전에 막는다.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

from media_paths import MASTER_SUFFIX, REPO_ROOT, STAGING_ROOT  # noqa: E402
POSTS_ROOT = REPO_ROOT / "blog" / "posts"
CATALOG_PATH = REPO_ROOT / "blog" / "media" / "catalog.json"
DESIGN_TS = REPO_ROOT / "site" / "src" / "design.ts"

# 강조가 덮는 화면 면적. 고정한 휘도가 아니라 이 비율이 기준이다.
#
# 처음에는 `휘도 0.58 위` 처럼 고정값을 썼다. 그러면 원본이 밝을수록 강조가 넓어진다.
# 실제로 001 의 이미지들은 같은 값에서 12~33% 가 칠해졌고 003 의 hero 는 3% 였다. 같은
# 규칙인데 결과가 열 배 달랐다. 그래서 기준을 뒤집었다. **가장 밝은 쪽부터 이만큼만 칠한다.**
# 문턱은 이미지마다 다시 계산한다. 강조의 크기가 원본의 밝기가 아니라 설계값이 된다.
ACCENT_COVERAGE = 0.03
# 문턱에서 가장 밝은 곳까지 강조색이 차오르는 정도. 1.0 이면 순수 강조색이 되어 형태가 뭉개진다.
ACCENT_STRENGTH = 0.85
# 마스크를 흐리는 반경. 가로폭에 대한 비율이라 이미지 크기가 달라도 같은 인상이 나온다.
# 흐리지 않으면 원본의 잡티를 그대로 따라가 얼룩이 진다.
BLUR_RATIO = 0.01
# 강조가 퍼진 넓이의 상한. 화면 넓이에 대한 비율이다.
#
# 면적은 위에서 정해 두었으므로 이제 남은 위험은 그 3% 가 한 군데가 아니라 화면 전체에
# 뿌려지는 것이다. 강조가 앉은 자리를 감싸는 사각형이 화면의 이만큼을 넘으면 강조 하나가
# 아니라 흩뿌린 반짝임이다.
#
# 값은 재서 정했다. 2026-08-26 에 만든 열두 장을 눈으로 갈라 놓고 이 수치를 봤더니
# 쓸 만한 넉 장이 0.2~6.6% 였고 버린 여덟 장이 14.5~45.4% 였다. 두 무리 사이가 비어 있어
# 그 사이에 놓았다. 처음에 짐작으로 넣은 55% 는 버린 것을 하나도 못 걸렀다.
MAX_SPREAD = 0.12
# 발행본의 가운데 밝기. 원본이 밝든 어둡든 이 값으로 맞춘다.
#
# 브랜드는 어두운 판이고 색상 계약도 가장 큰 면을 carbon 으로 둔다. 그런데 이미지 모델은
# `keep the frame dark` 를 넣어도 밝게 그린다. 2026-08-26 에 004 의 원본 셋이 전부 흰
# 배경으로 나왔고, 휘도를 그대로 carbon~ivory 에 펼치자 발행본이 흰 그림이 됐다.
# 강조 면적을 백분위로 정한 것과 같은 이유로 밝기도 원본에 맡기지 않는다. 원본의 중앙값을
# 이 값으로 옮기는 감마를 매번 구해서 씌운다.
TARGET_MEDIAN = 0.18
# 아래위 끝을 버리는 비율. 원본의 최저와 최고를 그대로 쓰면 점 하나가 전체 대비를 정한다.
CLIP_LOW = 0.02
CLIP_HIGH = 0.999

PALETTE_POLICY = "eddmpython-gray-master-v1"


def fetchMasters(post: str, stage: Path) -> list[str]:
    """catalog 에 적힌 원본을 내려받는다. 이미 있는 것은 건드리지 않는다.

    원본은 발행할 때 허깅페이스로 올라가고 로컬에서는 지워진다. 그래서 강조색을 바꿔 다시
    칠하려는 기계에는 원본이 없는 것이 정상이다. 여기서 받아 오지 않으면 다시 칠하기가
    이미지를 만든 그 기계에서만 되는 일이 된다.
    """
    if not CATALOG_PATH.is_file():
        return []
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    repo = str(catalog.get("repo") or "")
    assets = catalog.get("assets") or {}
    wanted = {
        str(record["assetKey"]): (str(record["masterPath"]), str(record["masterSha256"]))
        for record in assets.values()
        if isinstance(record, dict)
        and record.get("post") == post
        and record.get("masterSha256")
        and record.get("masterPath")
    }
    if not wanted or not repo:
        return []

    got = []
    for key, (remote, expect) in sorted(wanted.items()):
        target = stage / f"{key}{MASTER_SUFFIX}"
        # 이미 있는 파일도 해시를 잰다. 잘렸거나 다른 이미지가 그 이름으로 놓여 있으면
        # 그것이 영원히 이긴다. 원본은 그 자리가 유일본이라 조용히 틀리면 알 길이 없다.
        if target.is_file():
            if hashlib.sha256(target.read_bytes()).hexdigest() == expect:
                continue
            print(f"  로컬 원본이 catalog 와 다르다. 다시 받는다: {key}")
        url = f"https://huggingface.co/datasets/{repo}/resolve/main/{remote}"
        request = urllib.request.Request(url, headers={"User-Agent": "eddmpython-paint"})
        with urllib.request.urlopen(request, timeout=180) as response:
            data = response.read()
        # 콘텐츠 주소를 도입하고 이 대조를 안 하면 주소가 이름값을 못 한다. 여기가 가장 싸다.
        actual = hashlib.sha256(data).hexdigest()
        if actual != expect:
            raise RuntimeError(
                f"받은 원본이 catalog 와 다르다: {key} . "
                f"기대 {expect} , 실제 {actual} . {remote} 를 확인한다"
            )
        stage.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        got.append(f"{key} ({len(data) // 1024}KB)")
    return got


def loadPalette() -> dict[str, str]:
    """`site/src/design.ts` 에서 색을 읽는다. 값을 이 파일에 복사해 두지 않는다."""
    script = (
        "import('./src/design.ts').then(m=>{const p=m.DESIGN.palette;"
        "process.stdout.write(JSON.stringify({brand:p.brand,carbon:p.carbon,ivory:p.ivory}))})"
    )
    r = subprocess.run(
        ["node", "--experimental-strip-types", "-e", script],
        cwd=REPO_ROOT / "site",
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        sys.exit(f"design.ts 에서 색을 읽지 못했다.\n{r.stderr.strip()}")
    return json.loads(r.stdout.strip().splitlines()[-1])


def toRgb(value: str) -> np.ndarray:
    v = value.lstrip("#")
    return np.array([int(v[i : i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def luminance(rgb: np.ndarray) -> float:
    return float(0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2])


def smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)


def normalizeTone(lum: np.ndarray) -> np.ndarray:
    """원본의 밝기를 브랜드의 어두운 판으로 옮긴다.

    끝을 잘라 0~1 로 편 뒤, 중앙값이 TARGET_MEDIAN 에 오도록 감마를 씌운다. 원본이
    흰 배경이든 검은 배경이든 발행본의 인상이 같아진다.
    """
    low = float(np.quantile(lum, CLIP_LOW))
    high = float(np.quantile(lum, CLIP_HIGH))
    if high <= low + 1e-4:
        return np.clip(lum, 0, 1)
    spread = np.clip((lum - low) / (high - low), 0, 1)
    median = float(np.median(spread))
    if not 1e-3 < median < 1 - 1e-3:
        return spread
    gamma = float(np.log(TARGET_MEDIAN) / np.log(median))
    return np.clip(spread ** np.clip(gamma, 0.2, 6.0), 0, 1)


def readMaster(path: Path) -> tuple[np.ndarray, float]:
    """원본의 휘도판과 원본이 들고 있던 채도를 돌려준다.

    **원본의 색은 무조건 버린다.** 한때 원본이 회색인지 검사해서 아니면 막았다. 그런데
    이미지 모델은 `neutral grayscale only` 를 넣어도 색을 넣는다. 2026-08-26 에 같은
    프롬프트로 만든 열두 장 가운데 넷이 채도 0.2 초과 픽셀 22~71% 로 나왔다. 모델이
    지킬 것을 전제로 세운 검사는 게이트가 아니라 재생성 도박이다.

    그래서 지키게 하는 대신 안 지켜도 되게 만들었다. 발행본은 원본의 휘도만 쓰므로 모델이
    무슨 색을 칠했든 결과가 같다. 프롬프트의 회색 지시는 여전히 남기는데, 그것을 지키려는
    모델은 색조 대신 밝기로 피사체를 가르고 그 구도가 이 방식에 맞기 때문이다. 결과가
    아니라 구도를 위한 지시다.
    """
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255
    mx, mn = a.max(-1), a.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    return lum, float((sat > 0.2).mean() * 100)


def paint(lum: np.ndarray, palette: dict[str, str]) -> tuple[np.ndarray, float, float]:
    carbon, ivory, brand = (toRgb(palette[k]) for k in ("carbon", "ivory", "brand"))
    if luminance(brand) <= luminance(carbon) + 0.1:
        sys.exit(
            f"강조색 {palette['brand']} 이 배경 {palette['carbon']} 보다 충분히 밝지 않다.\n"
            "  이 방식은 밝은 구간을 강조색 쪽으로 당긴다. 어두운 강조색은 빛을 지운다."
        )

    # 가장 밝은 쪽부터 ACCENT_COVERAGE 만큼만 잡는 문턱을 이 이미지에서 직접 구한다.
    #
    # 위쪽 끝을 원본의 최대 휘도로 두면 안 된다. 넓고 평평한 흰 면이 있는 이미지에서는
    # 문턱과 최대치가 거의 붙어 버려서 경사가 한 점에만 서고, 흐린 뒤에는 아무것도 안 남는다.
    # 001 의 이미지 아홉 장 중 둘이 실제로 그렇게 0% 가 나왔다. 그래서 위쪽 끝도 백분위로 잡는다.
    # 아래 문턱 위쪽 3% 가 물들기 시작하고 그중 맨 위 0.3% 가 강조색을 가득 받는다.
    low = float(np.quantile(lum, 1.0 - ACCENT_COVERAGE))
    high = float(np.quantile(lum, 1.0 - ACCENT_COVERAGE / 10))
    if high <= low + 1e-4:
        # 밝은 쪽이 계단 없이 평평하다. 문턱만 살짝 내려 경사를 만든다.
        low = float(np.quantile(lum, 1.0 - ACCENT_COVERAGE * 3))
        high = float(np.quantile(lum, 1.0 - ACCENT_COVERAGE / 10))
    if high <= low + 1e-4:
        sys.exit("원본의 밝은 쪽이 평평하다. 강조가 앉을 자리가 없다.")

    mask = smoothstep(low, high, lum)
    radius = max(1.0, lum.shape[1] * BLUR_RATIO)
    mask = (
        np.asarray(
            Image.fromarray((mask * 255).astype(np.uint8)).filter(
                ImageFilter.GaussianBlur(radius)
            )
        ).astype(np.float32)
        / 255
    )

    weight = (mask * ACCENT_STRENGTH)[..., None]
    base = carbon + (ivory - carbon) * lum[..., None]
    out = np.clip(base * (1 - weight) + brand * weight, 0, 1)

    coverage = float((mask > 0.05).mean() * 100)
    spread = boundingSpread(mask > 0.5)
    return out, coverage, spread


def boundingSpread(mask: np.ndarray) -> float:
    """강조가 앉은 자리를 감싸는 사각형이 화면의 몇 퍼센트인지."""
    rows = np.flatnonzero(mask.any(axis=1))
    cols = np.flatnonzero(mask.any(axis=0))
    if not rows.size or not cols.size:
        return 0.0
    height = rows[-1] - rows[0] + 1
    width = cols[-1] - cols[0] + 1
    return float(height * width / mask.size * 100)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("post")
    ap.add_argument("--only", default="")
    args = ap.parse_args()

    stage = STAGING_ROOT / args.post
    pulled = fetchMasters(args.post, stage)
    if pulled:
        print(f"원본을 원격에서 받았다: {', '.join(pulled)}")
    if not stage.is_dir():
        sys.exit(f"작업본 폴더가 없다: {stage}")

    wanted = {k.strip() for k in args.only.split(",") if k.strip()}
    masters = sorted(p for p in stage.iterdir() if p.name.endswith(MASTER_SUFFIX))
    if not masters:
        sys.exit(
            f"{stage} 에 원본이 없고 catalog 에도 없다. 원본 이름은 <assetKey>{MASTER_SUFFIX} 다."
        )

    palette = loadPalette()
    print(f"강조색 {palette['brand']}  배경 {palette['carbon']}  밝은면 {palette['ivory']}")

    failed = []
    for master in masters:
        key = master.name[: -len(MASTER_SUFFIX)]
        if wanted and key not in wanted:
            continue
        lum, masterSaturation = readMaster(master)
        lum = normalizeTone(lum)
        px, coverage, spread = paint(lum, palette)
        out = stage / f"{key}.webp"
        Image.fromarray((px * 255).astype(np.uint8)).save(out, "WEBP", quality=90)
        ok = spread <= MAX_SPREAD * 100
        print(
            f"{'  ' if ok else '  퍼짐'} {key:28} "
            f"원본색 {masterSaturation:5.1f}%  강조 {coverage:5.2f}%  "
            f"퍼진 넓이 {spread:5.1f}%  -> {out.name}"
        )
        if not ok:
            failed.append((key, spread))

    if failed:
        print()
        for key, spread in failed:
            print(f"{key} 의 강조가 화면의 {spread:.1f}% 에 흩어져 있다. 상한은 {MAX_SPREAD * 100:.0f}% 다.")
        sys.exit("강조가 한 군데에 모이지 않았다. 밝은 곳이 하나뿐인 원본으로 다시 만든다.")


if __name__ == "__main__":
    main()
