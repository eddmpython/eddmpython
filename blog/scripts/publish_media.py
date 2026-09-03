"""블로그 이미지를 HF 콘텐츠 주소 객체로 발행하고 Git에는 계약만 남긴다."""

from __future__ import annotations

import argparse
import hashlib
import json
import urllib.request
import os
import re
import struct
import sys
from copy import deepcopy
from pathlib import Path

sys.dont_write_bytecode = True
from project_env import load_project_env


from media_paths import MASTER_SUFFIX, REPO_ROOT, STAGING_ROOT  # noqa: E402
BLOG_ROOT = REPO_ROOT / "blog"
POSTS_ROOT = BLOG_ROOT / "posts"
CATALOG_PATH = BLOG_ROOT / "media" / "catalog.json"
DEFAULT_HF_REPO = "eddmpython/eddmpython-media"
OBJECT_PREFIX = "objects/sha256"
IMAGE_SUFFIXES = (".webp", ".png", ".jpg", ".jpeg", ".gif")
VIDEO_SUFFIXES = (".mp4",)
MEDIA_SUFFIXES = IMAGE_SUFFIXES + VIDEO_SUFFIXES
IMAGE_MIME = {
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
}
# 두 자리와 세 자리를 모두 받는다. 공개 블로그 글은 커리큘럼 전체에서 이어지는 세 자리
# 번호를 쓰고 교안 글은 카테고리마다 다시 세는 두 자리 번호를 쓴다. 한쪽만 받으면 다른 쪽
# 시각물 발행이 통째로 막힌다.
ASSET_ID_RE = re.compile(
    r"(?P<post>\d{2,3}-[a-z0-9]+(?:-[a-z0-9]+)*)/"
    r"(?P<key>[a-z0-9]+(?:-[a-z0-9]+)*)"
)
SHA256_RE = re.compile(r"[0-9a-f]{64}")
# 회색 원본의 이름. paint_media.py 와 generate_flux.py 가 같은 값을 쓴다.
IMAGEGEN_V2 = "eddmpython-dark-v2"
IMAGEGEN_PALETTE = "eddmpython-gray-master-v1"
# 옛 값. 새로 발행하지 않는다. 이미 올라간 자산의 계획을 읽기 위해서만 받는다.
LEGACY_IMAGEGEN_PALETTES = {"eddmpython-carbon-ivory-sand-v1"}


SKIP_DIRS = frozenset({"media", "scripts", "embeds"})


def find_post_markdown(post: str, root: Path | None = None) -> Path:
    """글 파일을 찾는다.

    블로그는 글 하나가 폴더 하나다. blog/posts/<글 폴더>/index.md 가 본문이고 그 옆에 이 글의
    이미지 계획과 도구가 함께 있다. 교안은 아직 plan 이 있는 폴더 옆에 <글>.md 로 둔다.
    """
    if root is None:
        path = POSTS_ROOT / post / "index.md"
        if not path.is_file():
            raise ValueError(f"글 파일이 없음: {path}")
        return path
    matches = [
        path
        for path in root.rglob(f"{post}.md")
        if path.is_file() and path.parent.name not in SKIP_DIRS
    ]
    if len(matches) != 1:
        raise ValueError(f"글 파일이 없거나 중복: {post} -> {matches}")
    return matches[0]


def load_json(path: Path) -> dict[str, object]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"JSON을 읽을 수 없음: {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise ValueError(f"JSON 최상위 값은 객체여야 함: {path}")
    return payload


def save_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def plan_entry(
    plan: dict[str, object], asset_id: str, plan_label: str = "media.json"
) -> dict[str, object]:
    match = ASSET_ID_RE.fullmatch(asset_id)
    if not match:
        raise ValueError("asset id는 <post id>/<영문 kebab-case 키> 형식이어야 함")
    prompt_contract = plan.get("promptContract")
    valid_prompt_contract = prompt_contract == "section-grounded-v2" or (
        prompt_contract == "course-visual-16x9-v1"
        and plan.get("visualPlanContract") == 2
    )
    if (
        plan.get("version") not in (1, 2)
        or not valid_prompt_contract
        or not isinstance(plan.get("assets"), dict)
    ):
        raise ValueError(f"{plan_label} 계약 위반")
    # 글 폴더의 media.json 은 자기 글 것만 들고 있어 키가 assetKey 하나다. 교안 plan 은
    # 여러 글을 모아 두므로 <글>/<키> 전체를 키로 쓴다. 둘 다 받는다.
    entry = plan["assets"].get(asset_id) or plan["assets"].get(match.group("key"))
    if not isinstance(entry, dict):
        raise ValueError(f"이미지 계획이 없음: {asset_id}")
    entry = {**entry, "post": match.group("post"), "assetKey": match.group("key")}
    required = (
        "post",
        "assetKey",
        "role",
        "visualProfile",
        "alt",
        "placement",
        "narrativeUse",
        "sourcePolicy",
        "sourceKind",
        "contentAnchor",
        "visualSubject",
        "visualRelationship",
    )
    missing = [key for key in required if not str(entry.get(key) or "").strip()]
    if missing:
        raise ValueError(f"이미지 계획 필드가 비었음: {asset_id}: {', '.join(missing)}")
    if entry["post"] != match.group("post") or entry["assetKey"] != match.group("key"):
        raise ValueError(f"이미지 계획의 post 또는 assetKey가 id와 다름: {asset_id}")
    if entry["sourcePolicy"] != "auto":
        raise ValueError(f"sourcePolicy는 auto여야 함: {asset_id}")
    role = str(entry["role"])
    if role not in {"hero", "section", "support"}:
        raise ValueError(f"지원하지 않는 이미지 role: {asset_id}: {role}")
    if role == "section" and not str(entry.get("sectionHeading") or "").strip():
        raise ValueError(f"section 이미지 계획에는 sectionHeading이 필요함: {asset_id}")
    # 부제가 있는 절이면 이미지는 부제 아래, 없는 절이면 H2 아래에 붙는다.
    #
    # 예전에는 role이 section이면 sectionSubtitle을 필수로 두고 placement를 "H3 부제 바로 뒤"
    # 하나로 강제했다. 그러면 부제가 필요 없는 절에 부제를 지어내야 이미지를 붙일 수 있다.
    # 글쓰기 정본은 같은 뜻을 되풀이하는 소제목을 지우라고 하므로 두 규칙이 정면으로 부딪혔다.
    # 001의 절들이 실제로 그 자리에 있었다. 그래서 부제의 유무를 본문에 맡기고, 이 검사는
    # 부제가 있을 때와 없을 때 이미지가 앉을 자리만 가른다. check-blog.mjs와 같은 판정이다.
    if role == "section":
        hasSubtitle = bool(str(entry.get("sectionSubtitle") or "").strip())
        expected = "H3 부제 바로 뒤" if hasSubtitle else "H2 제목 바로 뒤"
        if entry.get("placement") != expected:
            raise ValueError(
                f"section 이미지 placement는 {expected}여야 함: {asset_id}"
                f" (부제 {'있음' if hasSubtitle else '없음'})"
            )
    source_kind = str(entry["sourceKind"])
    if source_kind not in {"imagegen", "screenshot", "official", "licensed", "recording", "authored"}:
        raise ValueError(f"지원하지 않는 sourceKind: {asset_id}: {source_kind}")
    expected_profiles = {
        "imagegen": {"dark-editorial-v1", IMAGEGEN_V2},
        # 손으로 그린 SVG 다이어그램. 교안 저장소의 SVG 가 정본이고 색은 design.ts 토큰을 직접 쓴다.
        # 렌더는 eddmpython-course/scripts/renderDiagram.mjs 가 맡는다. 회색 원본과 칠하기가 없다.
        "authored": {"design-token-svg-v1"},
        "screenshot": {"product-screen-v1"},
        "official": {"source-original-v1"},
        "licensed": {"source-original-v1"},
        "recording": {"source-original-v1"},
    }[source_kind]
    if entry["visualProfile"] not in expected_profiles:
        raise ValueError(f"지원하지 않는 visualProfile: {asset_id}: {entry['visualProfile']}")
    if entry["visualProfile"] == IMAGEGEN_V2 and entry.get("palettePolicy") not in (
        {IMAGEGEN_PALETTE} | LEGACY_IMAGEGEN_PALETTES
    ):
        raise ValueError(f"{IMAGEGEN_V2}에는 {IMAGEGEN_PALETTE}가 필요함: {asset_id}")
    if source_kind == "imagegen" and not str(entry.get("prompt") or "").strip():
        raise ValueError(f"ImageGen 계획에는 prompt가 필요함: {asset_id}")
    if source_kind == "authored" and not str(entry.get("sourceSvg") or "").strip():
        raise ValueError(f"authored 계획에는 정본 SVG 경로 sourceSvg 가 필요함: {asset_id}")
    if source_kind == "screenshot":
        for key in ("sourceUrl", "captureState"):
            if not str(entry.get(key) or "").strip():
                raise ValueError(f"screenshot 계획에는 {key}가 필요함: {asset_id}")
    if source_kind in {"official", "licensed"}:
        for key in ("sourceUrl", "credit"):
            if not str(entry.get(key) or "").strip():
                raise ValueError(f"{source_kind} 계획에는 {key}가 필요함: {asset_id}")
    if source_kind == "licensed" and not str(entry.get("license") or "").strip():
        raise ValueError(f"licensed 계획에는 license가 필요함: {asset_id}")
    if source_kind == "recording":
        for key in ("captureState", "credit"):
            if not str(entry.get(key) or "").strip():
                raise ValueError(f"recording 계획에는 {key}가 필요함: {asset_id}")
    return entry


def canonical_suffix(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix not in MEDIA_SUFFIXES:
        raise ValueError(f"지원하지 않는 미디어 확장자: {path.name}")
    return ".jpg" if suffix == ".jpeg" else suffix


def validate_magic(path: Path) -> None:
    head = path.read_bytes()[:16]
    suffix = canonical_suffix(path)
    valid = {
        ".png": head.startswith(b"\x89PNG\r\n\x1a\n"),
        ".jpg": head.startswith(b"\xff\xd8\xff"),
        ".gif": head.startswith((b"GIF87a", b"GIF89a")),
        ".webp": len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP",
        ".mp4": len(head) >= 8 and head[4:8] == b"ftyp",
    }
    if not valid.get(suffix, False):
        raise ValueError(f"확장자와 미디어 바이트가 다름: {path}")


def image_metadata(path: Path) -> dict[str, object]:
    data = path.read_bytes()
    suffix = canonical_suffix(path)
    width = 0
    height = 0

    if suffix == ".mp4":
        width, height = mp4_dimensions(data)
    elif suffix == ".png" and len(data) >= 24:
        width, height = struct.unpack(">II", data[16:24])
    elif suffix == ".gif" and len(data) >= 10:
        width, height = struct.unpack("<HH", data[6:10])
    elif suffix == ".jpg":
        offset = 2
        start_of_frame = {
            0xC0,
            0xC1,
            0xC2,
            0xC3,
            0xC5,
            0xC6,
            0xC7,
            0xC9,
            0xCA,
            0xCB,
            0xCD,
            0xCE,
            0xCF,
        }
        while offset + 4 <= len(data):
            if data[offset] != 0xFF:
                offset += 1
                continue
            while offset < len(data) and data[offset] == 0xFF:
                offset += 1
            if offset >= len(data):
                break
            marker = data[offset]
            offset += 1
            if marker in {0x01, *range(0xD0, 0xD9)}:
                continue
            if offset + 2 > len(data):
                break
            segment_length = int.from_bytes(data[offset : offset + 2], "big")
            if segment_length < 2 or offset + segment_length > len(data):
                break
            if marker in start_of_frame and segment_length >= 7:
                height = int.from_bytes(data[offset + 3 : offset + 5], "big")
                width = int.from_bytes(data[offset + 5 : offset + 7], "big")
                break
            offset += segment_length
    elif suffix == ".webp" and len(data) >= 30:
        offset = 12
        while offset + 8 <= len(data):
            chunk = data[offset : offset + 4]
            chunk_size = int.from_bytes(data[offset + 4 : offset + 8], "little")
            payload = offset + 8
            if payload + chunk_size > len(data):
                break
            if chunk == b"VP8X" and chunk_size >= 10:
                width = int.from_bytes(data[payload + 4 : payload + 7], "little") + 1
                height = int.from_bytes(data[payload + 7 : payload + 10], "little") + 1
                break
            if chunk == b"VP8L" and chunk_size >= 5 and data[payload] == 0x2F:
                dimensions = int.from_bytes(data[payload + 1 : payload + 5], "little")
                width = (dimensions & 0x3FFF) + 1
                height = ((dimensions >> 14) & 0x3FFF) + 1
                break
            if (
                chunk == b"VP8 "
                and chunk_size >= 10
                and data[payload + 3 : payload + 6] == b"\x9d\x01\x2a"
            ):
                width = int.from_bytes(data[payload + 6 : payload + 8], "little") & 0x3FFF
                height = int.from_bytes(data[payload + 8 : payload + 10], "little") & 0x3FFF
                break
            offset = payload + chunk_size + (chunk_size % 2)

    if width <= 0 or height <= 0:
        raise ValueError(f"미디어 크기를 읽을 수 없음: {path}")
    return {"width": width, "height": height, "mime": IMAGE_MIME[suffix]}


def mp4_dimensions(data: bytes) -> tuple[int, int]:
    def u32(offset: int) -> int:
        return int.from_bytes(data[offset : offset + 4], "big")

    boxes: list[int] = []

    def collect(start: int, end: int) -> None:
        offset = start
        while offset + 8 <= end:
            size = u32(offset)
            box_type = data[offset + 4 : offset + 8]
            if size == 1:
                if offset + 16 > end:
                    return
                size = int.from_bytes(data[offset + 8 : offset + 16], "big")
                header = 16
            elif size == 0:
                size = end - offset
                header = 8
            else:
                header = 8
            if size < header or offset + size > end:
                return
            if box_type == b"tkhd":
                boxes.append(offset)
            elif box_type in {b"moov", b"trak", b"mdia", b"minf", b"stbl"}:
                collect(offset + header, offset + size)
            offset += size

    collect(0, len(data))
    for box in boxes:
        payload = box + 8
        if payload >= len(data):
            continue
        version = data[payload]
        width_off = payload + (76 if version == 0 else 88)
        if width_off + 8 > len(data):
            continue
        width = int.from_bytes(data[width_off : width_off + 4], "big") >> 16
        height = int.from_bytes(data[width_off + 4 : width_off + 8], "big") >> 16
        if width > 0 and height > 0:
            return width, height
    raise ValueError("mp4 비디오 너비와 높이를 읽을 수 없음")


def staging_path(post: str, key: str, explicit: str | None) -> Path:
    stage_dir = (STAGING_ROOT / post).resolve()
    if explicit:
        path = Path(explicit)
        if not path.is_absolute():
            path = (REPO_ROOT / path).resolve()
        else:
            path = path.resolve()
        if not path.is_relative_to(stage_dir):
            raise ValueError(f"이미지 작업본은 저장소 밖 staging에 있어야 함: {stage_dir}")
        if path.stem != key:
            raise ValueError(f"작업본 파일명은 assetKey와 같아야 함: {key}{path.suffix}")
        if not path.is_file():
            raise ValueError(f"미디어 작업본이 없음: {path}")
        return path
    matches = [stage_dir / f"{key}{suffix}" for suffix in MEDIA_SUFFIXES]
    existing = [path for path in matches if path.is_file()]
    if len(existing) != 1:
        raise ValueError(f"미디어 작업본은 정확히 하나여야 함: {stage_dir / key}.*")
    return existing[0]


def master_staging_path(post: str, key: str) -> Path | None:
    """회색 원본의 작업본 경로. 없으면 None.

    원본 이름은 `<assetKey>.master.png` 라 `staging_path` 가 찾는 `<assetKey>.png` 와 겹치지
    않는다. 파일 stem 이 `<assetKey>.master` 이기 때문이다.
    """
    path = (STAGING_ROOT / post / f"{key}{MASTER_SUFFIX}").resolve()
    return path if path.is_file() else None


def object_path(sha256: str, suffix: str) -> str:
    if not SHA256_RE.fullmatch(sha256):
        raise ValueError(f"올바르지 않은 SHA-256: {sha256}")
    return f"{OBJECT_PREFIX}/{sha256[:2]}/{sha256}{suffix}"


def object_url(repo: str, remote_path: str) -> str:
    return f"https://huggingface.co/datasets/{repo}/resolve/main/{remote_path}"


def upsert_frontmatter(raw: str, values: dict[str, object]) -> str:
    match = re.match(r"^---\r?\n(?P<meta>[\s\S]*?)\r?\n---\r?\n", raw)
    if not match:
        raise ValueError("글 frontmatter를 읽을 수 없음")
    meta = match.group("meta")
    for key, value in values.items():
        line = f"{key}: {value}"
        pattern = re.compile(rf"^{re.escape(key)}:\s*.*$", re.MULTILINE)
        if pattern.search(meta):
            meta = pattern.sub(line, meta, count=1)
        else:
            meta = f"{meta}\n{line}"
    return f"---\n{meta}\n---\n{raw[match.end():]}"


def updated_post(
    raw: str,
    key: str,
    next_url: str,
    old_url: str | None,
    alt: str,
    metadata: dict[str, object],
) -> str:
    placeholder = f"media://{key}"
    og_candidates = [re.escape(placeholder)]
    if old_url:
        og_candidates.append(re.escape(old_url))
    used_as_og = bool(
        re.search(rf"^ogImage:\s*(?:{'|'.join(og_candidates)})\s*$", raw, re.MULTILINE)
    )
    if placeholder in raw:
        updated = raw.replace(placeholder, next_url)
    elif old_url and old_url in raw:
        updated = raw.replace(old_url, next_url)
    else:
        raise ValueError(f"본문이나 ogImage에 미디어 자리표시자가 없음: {placeholder}")
    if not used_as_og:
        return updated
    if str(metadata["mime"]).startswith("video/"):
        raise ValueError("영상은 ogImage로 쓸 수 없음")
    return upsert_frontmatter(
        updated,
        {
            "ogImageAlt": alt,
            "ogImageWidth": metadata["width"],
            "ogImageHeight": metadata["height"],
            "ogImageType": metadata["mime"],
        },
    )


def optional_token() -> str | None:
    """있으면 쓰고 없으면 안 쓴다. 검증은 공개 데이터셋이라 익명으로도 된다.

    `resolve_token` 은 토큰이 없으면 huggingface_hub 를 요구하고 없으면 죽는다. 올리는
    쪽은 그래야 맞지만 검증은 아니다. 검증이 의존성과 토큰을 요구하면 CI 에서 매일 돌릴 수
    없고, 매일 안 돌면 원본이 사라져도 아무도 모른다.
    """
    load_project_env()
    return os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")


def resolve_token() -> str | None:
    load_project_env()
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if token:
        return token
    try:
        from huggingface_hub import get_token
    except ImportError as exc:
        raise ValueError(
            "huggingface-hub가 필요함: python -m pip install -r blog/requirements.txt"
        ) from exc
    return get_token()


def publish(
    asset_id: str,
    explicit_file: str | None,
    dry_run: bool,
    create_repo: bool,
    reviewed: bool,
    plan_arg: str = "",
) -> str:
    # 교안 plan 은 course 아래에 있고 추적하지 않는다. 본문 문장을 들고 있는 sectionHeading 과
    # contentAnchor 가 공개 저장소로 새지 않게 하려는 것이다. 이미지 자체와 catalog 는 공유한다.
    plan_path = (
        Path(plan_arg).resolve()
        if plan_arg
        else POSTS_ROOT / asset_id.split("/", 1)[0] / "media.json"
    )
    if not plan_path.exists():
        raise ValueError(f"plan 을 찾을 수 없음: {plan_path}")
    plan_label = str(plan_path.relative_to(REPO_ROOT)) if plan_path.is_relative_to(REPO_ROOT) else str(plan_path)
    plan = load_json(plan_path)
    entry = plan_entry(plan, asset_id, plan_label)
    post = str(entry["post"])
    key = str(entry["assetKey"])
    post_root = plan_path.parent if plan_arg else None
    post_path = find_post_markdown(post, post_root)

    local_path = staging_path(post, key, explicit_file)
    validate_magic(local_path)
    if not dry_run and not reviewed:
        raise ValueError(
            "--reviewed가 필요함: 최종 이미지를 visualSubject와 visualRelationship에 맞춰 직접 확인"
        )
    metadata = image_metadata(local_path)
    suffix = canonical_suffix(local_path)
    sha256 = hashlib.sha256(local_path.read_bytes()).hexdigest()
    remote_path = object_path(sha256, suffix)

    catalog = load_json(CATALOG_PATH)
    if catalog.get("version") != 1 or catalog.get("objectPrefix") != OBJECT_PREFIX:
        raise ValueError("blog/media/catalog.json 계약 위반")
    repo = str(os.environ.get("HF_MEDIA_REPO") or catalog.get("repo") or DEFAULT_HF_REPO)
    if repo != catalog.get("repo"):
        raise ValueError("HF_MEDIA_REPO와 catalog.json repo가 다름")
    next_url = object_url(repo, remote_path)

    assets = catalog.get("assets")
    objects = catalog.get("objects")
    if not isinstance(assets, dict) or not isinstance(objects, dict):
        raise ValueError("catalog.json objects 또는 assets 계약 위반")
    old_record = assets.get(asset_id)
    old_url = None
    if isinstance(old_record, dict) and old_record.get("path"):
        old_url = object_url(repo, str(old_record["path"]))
    raw = post_path.read_text(encoding="utf-8")
    next_raw = updated_post(raw, key, next_url, old_url, str(entry["alt"]), metadata)

    master_local = master_staging_path(post, key)
    if dry_run:
        print(f"{asset_id}: {local_path} -> {next_url}")
        if master_local:
            print(f"{asset_id}: 원본도 함께 올린다 {master_local.name}")
        return next_url

    token = resolve_token()
    if not token:
        raise ValueError("Hugging Face 로그인이 필요함: hf auth login 또는 HF_TOKEN 설정")
    try:
        from huggingface_hub import HfApi
    except ImportError as exc:
        raise ValueError(
            "huggingface-hub가 필요함: python -m pip install -r blog/requirements.txt"
        ) from exc

    api = HfApi(token=token)
    if create_repo:
        api.create_repo(repo_id=repo, repo_type="dataset", exist_ok=True, private=False)
    try:
        exists = api.file_exists(repo_id=repo, filename=remote_path, repo_type="dataset")
    except Exception as exc:
        raise RuntimeError(f"HF 저장소를 확인할 수 없음: {repo}: {exc}") from exc
    if not exists:
        api.upload_file(
            path_or_fileobj=str(local_path),
            path_in_repo=remote_path,
            repo_id=repo,
            repo_type="dataset",
            commit_message=f"블로그 미디어 객체: {asset_id}",
        )
    if not api.file_exists(repo_id=repo, filename=remote_path, repo_type="dataset"):
        raise RuntimeError(f"HF 업로드 뒤 원격 객체를 확인할 수 없음: {remote_path}")

    # 회색 원본도 같은 콘텐츠 주소 공간에 올린다.
    #
    # 발행본은 원본에 정본 강조색을 입힌 결과다. 강조색이 바뀌면 원본을 다시 칠하기만 하면
    # 되는데, 그 원본이 로컬 staging 에만 있으면 기계가 죽는 순간 사라진다. 2026-08-27 에
    # 실제로 일곱 장이 그 상태였다. 발행본에서 휘도를 되뽑아 다시 칠해 봤더니 픽셀의 68% 가
    # 8/255 넘게 어긋났다. 발행본에는 강조색과 밝기 보정이 이미 섞여 있어서 재료로 못 쓴다.
    # 그래서 원본은 발행본과 같은 무게로 다뤄야 한다.
    master_sha = None
    master_remote = None
    if master_local:
        master_meta = image_metadata(master_local)
        master_sha = hashlib.sha256(master_local.read_bytes()).hexdigest()
        master_remote = object_path(master_sha, canonical_suffix(master_local))
        if not api.file_exists(repo_id=repo, filename=master_remote, repo_type="dataset"):
            api.upload_file(
                path_or_fileobj=str(master_local),
                path_in_repo=master_remote,
                repo_id=repo,
                repo_type="dataset",
                commit_message=f"블로그 미디어 원본: {asset_id}",
            )
        if not api.file_exists(repo_id=repo, filename=master_remote, repo_type="dataset"):
            raise RuntimeError(f"HF 업로드 뒤 원본을 확인할 수 없음: {master_remote}")

    next_catalog = deepcopy(catalog)
    next_objects = next_catalog["objects"]
    next_assets = next_catalog["assets"]
    assert isinstance(next_objects, dict) and isinstance(next_assets, dict)
    # 객체 레코드는 자기 설명을 함께 가진다. 글이 사라져도 무엇이 그려진 이미지인지 남아야
    # 나중에 찾아 쓸 수 있다. 004 가 옛 글 이미지 여덟 장을 재활용한 것이 이 정보 덕분이었다.
    next_objects[sha256] = {
        "alt": entry.get("alt", ""),
        "bytes": local_path.stat().st_size,
        "height": metadata["height"],
        "mime": metadata["mime"],
        "path": remote_path,
        "sourcePost": post,
        "visualSubject": entry.get("visualSubject", ""),
        "width": metadata["width"],
    }
    asset_record = {
        "post": post,
        "assetKey": key,
        "sha256": sha256,
        "path": remote_path,
    }
    if master_sha and master_remote:
        # 원본도 자기 설명을 갖는다. role 로 발행본과 구분해서 --find 가 둘을 헷갈리지 않는다.
        next_objects[master_sha] = {
            "alt": entry.get("alt", ""),
            "bytes": master_local.stat().st_size,
            "height": master_meta["height"],
            "mime": master_meta["mime"],
            "path": master_remote,
            "role": "master",
            "sourcePost": post,
            "visualSubject": entry.get("visualSubject", ""),
            "width": master_meta["width"],
        }
        asset_record["masterSha256"] = master_sha
        asset_record["masterPath"] = master_remote
    else:
        # 옛 정책 자산은 원본이 없다. 있던 것이 사라지는 일은 없어야 하므로 앞 값을 잇는다.
        prev = catalog.get("assets", {}).get(asset_id)
        if isinstance(prev, dict) and prev.get("masterSha256"):
            asset_record["masterSha256"] = prev["masterSha256"]
            asset_record["masterPath"] = prev.get("masterPath", "")
    next_assets[asset_id] = asset_record
    # 참조가 끊긴 객체를 여기서 지우지 않는다. 글을 갈아엎어도 이미지는 남겨 두고 다시 쓴다.
    # 정리는 --prune-objects 로 명시해서 한다.

    save_json(CATALOG_PATH, next_catalog)
    post_path.write_text(next_raw, encoding="utf-8")
    local_path.unlink()
    if master_local:
        master_local.unlink()
    if local_path.parent == (STAGING_ROOT / post).resolve() and not any(local_path.parent.iterdir()):
        local_path.parent.rmdir()
    what = "발행본과 원본" if master_sha else "발행본"
    print(f"{asset_id}: {what} HF 업로드, catalog와 본문 반영, staging 정리 완료")
    return next_url


def verify_remote() -> None:
    """catalog 의 객체가 원격에 그대로 있는지 본다.

    HF 트리 API 는 인증 없이 요청 한 번으로 저장소의 모든 파일과 그 LFS oid 를 준다.
    LFS oid 는 그 파일 내용의 sha256 이고, 우리 객체 주소가 바로 그 값이다. 그래서 바이트를
    하나도 안 받고 콘텐츠 주소 계약 자체를 검증할 수 있다. 실측으로 649개 항목이 0.4초에 온다.

    존재만 보는 것으로는 부족하다. 발행본은 잃어도 원본에서 다시 칠하면 되지만 **원본은
    그곳이 유일본이다.** 로컬 사본을 두지 않기로 했으므로 여기가 유일한 감시 지점이다.
    """
    catalog = load_json(CATALOG_PATH)
    repo = str(catalog.get("repo") or "")
    objects = catalog.get("objects")
    assets = catalog.get("assets") or {}
    if catalog.get("version") != 1 or catalog.get("objectPrefix") != OBJECT_PREFIX:
        raise ValueError("blog/media/catalog.json 계약 위반")
    if not repo or not isinstance(objects, dict):
        raise ValueError("catalog.json repo 또는 objects 계약 위반")
    if not objects:
        print("블로그 미디어 원격 검증: 객체 0개")
        return

    url = f"https://huggingface.co/api/datasets/{repo}/tree/main?recursive=true"
    headers = {"User-Agent": "eddmpython-verify"}
    token = optional_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=120) as response:
        tree = json.loads(response.read())
    remote = {
        str(item.get("path")): item
        for item in tree
        if isinstance(item, dict) and item.get("type") == "file"
    }

    master_sha = {
        str(record["masterSha256"])
        for record in assets.values()
        if isinstance(record, dict) and record.get("masterSha256")
    }
    problems: list[str] = []
    checked = 0
    for sha, record in sorted(objects.items()):
        if not isinstance(record, dict):
            continue
        checked += 1
        kind = "원본" if sha in master_sha else "발행본"
        path = str(record.get("path") or "")
        item = remote.get(path)
        if item is None:
            problems.append(f"{kind} 없음: {path}")
            continue
        lfs = item.get("lfs") or {}
        oid = str(lfs.get("oid") or lfs.get("sha256") or "")
        if not oid:
            # 존재는 하는데 내용 해시를 못 봤다. 통과로 세지 않는다
            problems.append(f"{kind} 해시 확인 못 함: {path}")
            continue
        if oid != sha:
            problems.append(f"{kind} 내용이 다름: {path} (원격 {oid[:12]}, catalog {sha[:12]})")
            continue
        size = item.get("size")
        want = record.get("bytes")
        if isinstance(want, int) and isinstance(size, int) and size != want:
            problems.append(f"{kind} 크기가 다름: {path} (원격 {size}, catalog {want})")

    if problems:
        for line in problems:
            print(f"  {line}")
        raise RuntimeError(
            f"원격 검증 실패 {len(problems)}건. 원본이 섞여 있으면 그 이미지는 다시 못 만든다"
        )
    print(
        f"블로그 미디어 원격 검증: 객체 {checked}개 내용 해시 일치 "
        f"(원본 {len(master_sha)}개 포함, 요청 1회)"
    )



def course_referenced_sha(strict: bool = False) -> set[str]:
    """교안이 쓰는 객체 sha 를 모은다.

    교안 plan 은 course 아래에 있고 공개 catalog 의 assets 에 등록되지 않는다. 그래서
    catalog 만 보면 교안이 쓰는 객체가 전부 참조 없음으로 보인다. 2026-08-19 에 실제로
    279개 전부가 삭제 대상으로 잡혔다. 교안 plan 과 교안 본문을 함께 세어 그것을 막는다.

    `strict` 면 **세었다는 것을 증명하지 못할 때 예외로 죽는다.** 지우는 명령은 반드시
    켠다. 폴더가 있다는 것은 셀 수 있다는 증거가 아니다. sparse checkout, 부분 클론,
    클론 진행 중, 깨진 plan.json 은 전부 폴더가 있으면서 아무것도 못 세는 상태다.
    그 상태에서 빈 집합을 돌려주면 위 사고가 그대로 재현된다.
    """
    referenced: set[str] = set()
    # 교안은 이 저장소 안 course/ 에서 형제 비공개 저장소로 나갔다. 경로를 같이 옮기지
    # 않아 이 함수가 늘 빈 집합을 돌려주고 있었다. 그러면 교안이 쓰는 객체가 전부 참조 없음으로
    # 보여 지우자고 나온다. 이 함수가 막으려고 만들어진 바로 그 사고다.
    course_root = REPO_ROOT.parent / "eddmpython-course" / "curriculum"

    def refuse(why: str) -> None:
        if strict:
            raise RuntimeError(
                f"교안이 쓰는 객체를 셀 수 없다: {why} ({course_root}) . 이대로 정리하면 "
                "교안 객체가 전부 참조 없음으로 보인다. 2026-08-19 에 279개가 그렇게 잡혔다. "
                "형제 저장소를 온전히 받은 뒤 다시 실행한다"
            )
        print(f"경고: 교안 참조를 세지 못했다 ({why}). 지우는 명령은 이 상태에서 돌리지 않는다")

    if not course_root.is_dir():
        refuse("저장소가 없다")
        return referenced

    plans = sorted(course_root.rglob("plan.json"))
    docs = sorted(course_root.rglob("*.md"))
    if not plans and not docs:
        # 폴더는 있는데 안이 비었다. 클론이 덜 됐거나 sparse checkout 이다.
        refuse("저장소는 있는데 plan.json 도 본문도 없다")
        return referenced

    for plan_path in plans:
        try:
            plan = json.loads(plan_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            # 못 읽은 plan 을 건너뛰면 그 안의 참조를 통째로 놓친다. 조용히 넘기지 않는다.
            refuse(f"plan.json 을 못 읽었다: {plan_path.name} ({type(error).__name__})")
            continue
        for bucket in ("inventory", "assets"):
            entries = plan.get(bucket)
            if not isinstance(entries, dict):
                continue
            for record in entries.values():
                if isinstance(record, dict) and record.get("sha256"):
                    referenced.add(str(record["sha256"]))
    # 본문이 URL 로 직접 참조하는 것도 센다. plan 에 없을 수 있다.
    for md in docs:
        try:
            text = md.read_text(encoding="utf-8")
        except OSError as error:
            refuse(f"본문을 못 읽었다: {md.name} ({type(error).__name__})")
            continue
        referenced.update(SHA256_RE.findall(text))
    return referenced



def unreferenced_objects(catalog: dict, strict: bool = False) -> list[str]:
    """어디서도 가리키지 않는 객체 sha 목록을 돌려준다. 교안 참조를 함께 센다.

    `strict` 면 교안 참조를 못 셀 때 빈 목록 대신 예외로 죽는다. 지우는 명령은 반드시
    이것을 켠다. 못 센 것과 참조가 없는 것은 다르다.
    """
    objects = catalog.get("objects") or {}
    assets = catalog.get("assets") or {}
    referenced = {
        str(record.get("sha256"))
        for record in assets.values()
        if isinstance(record, dict) and record.get("sha256")
    }
    # 회색 원본도 자산이 가리키는 것이다. 이것을 안 세면 원본이 전부 참조 없음으로 잡혀
    # --prune-objects 가 강조색을 다시 칠할 유일한 재료를 지운다.
    referenced |= {
        str(record.get("masterSha256"))
        for record in assets.values()
        if isinstance(record, dict) and record.get("masterSha256")
    }
    referenced |= course_referenced_sha(strict=strict)
    return sorted(sha for sha in objects if sha not in referenced)


def find_objects(query: str) -> None:
    """설명으로 재사용할 이미지를 찾는다. 지금 글이 안 쓰는 것도 함께 보여 준다.

    **원본을 안 쓰는 중으로 찍으면 안 된다.** `used` 가 자산의 `sha256` 만 모으던 때는
    회색 원본이 전부 `[안 쓰는 중]` 으로 나왔다. 원본 레코드는 발행본과 `alt` 가 같아서
    같은 설명 두 줄이 나란히 서고 한 줄만 쓰는 중이었다. 이 명령은 사람이 객체를 눈으로
    훑는 유일한 자리이고, `--prune-objects` 는 마지막 줄에서 HF 수동 삭제로 안내한다.
    거기서 "안 쓰는 중" 을 보고 지우면 그것이 유일본이다.
    """
    catalog = load_json(CATALOG_PATH)
    objects = catalog.get("objects") or {}
    assets = catalog.get("assets") or {}
    used: dict[str, str] = {}
    for asset_id, record in assets.items():
        if not isinstance(record, dict):
            continue
        if record.get("sha256"):
            used[str(record["sha256"])] = asset_id
        # 원본도 자산이 가리키는 것이다. 이것을 안 세면 유일본이 안 쓰는 중으로 나온다.
        if record.get("masterSha256"):
            used[str(record["masterSha256"])] = f"{asset_id} 원본"
    needle = query.strip().lower()
    hits = []
    for sha, record in objects.items():
        if not isinstance(record, dict):
            continue
        haystack = " ".join(
            str(record.get(field, ""))
            for field in ("alt", "visualSubject", "sourcePost")
        ).lower()
        if needle in haystack:
            hits.append((sha, record))
    if not hits:
        print(f"'{query}' 로 찾은 이미지가 없다. 객체 {len(objects)}개를 뒤졌다")
        return
    masters = 0
    for sha, record in sorted(hits, key=lambda item: str(item[1].get("sourcePost", ""))):
        is_master = record.get("role") == "master"
        masters += 1 if is_master else 0
        mark = f"쓰는 중 {used[sha]}" if sha in used else "안 쓰는 중"
        # 원본은 본문에 박을 것이 아니다. 재사용 후보로 착각하지 않게 이름표를 붙인다.
        label = "  <- 회색 원본. 다시 칠할 유일한 재료다" if is_master else ""
        print(f"[{mark}] {record.get('sourcePost', '?')}{label}")
        print(f"  {record.get('alt') or record.get('visualSubject') or '(설명 없음)'}")
        print(f"  {catalog['repo']} / {record.get('path')}")
    print(f"{len(hits)}개 찾았다. 객체 {len(objects)}개 중")
    if masters:
        print(f"이 중 {masters}개는 회색 원본이다. 본문에 쓰지 말고 지우지도 않는다")



def prune_objects(apply: bool) -> None:
    """참조가 끊긴 객체 레코드를 지운다. HF 의 실제 바이트는 건드리지 않는다."""
    catalog = load_json(CATALOG_PATH)
    orphans = unreferenced_objects(catalog, strict=True)
    if not orphans:
        print("참조 없는 객체가 없다")
        return
    for sha in orphans:
        record = catalog["objects"][sha]
        desc = record.get("alt") or record.get("visualSubject") or "(설명 없음)"
        print(f"  {record.get('sourcePost', '?')}  {desc[:60]}")
    if not apply:
        print(f"참조 없는 객체 {len(orphans)}개. 실제로 지우려면 --apply 를 붙인다")
        return
    next_catalog = deepcopy(catalog)
    for sha in orphans:
        del next_catalog["objects"][sha]
    save_json(CATALOG_PATH, next_catalog)
    print(f"참조 없는 객체 {len(orphans)}개를 catalog 에서 지웠다")
    print(f"Hugging Face 의 실제 바이트는 그대로다. {catalog['repo']} 에서 따로 지운다")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="블로그 이미지를 Hugging Face에 발행한다")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--asset", help="plan.json의 <post id>/<assetKey>")
    group.add_argument("--verify", action="store_true", help="catalog의 HF 원격 객체를 전부 확인")
    group.add_argument("--find", help="설명으로 다시 쓸 이미지를 찾는다")
    group.add_argument(
        "--prune-objects",
        action="store_true",
        help="참조가 끊긴 객체 레코드를 정리한다. 기본은 보여 주기만 한다",
    )
    parser.add_argument("--apply", action="store_true", help="--prune-objects 를 실제로 실행")
    parser.add_argument(
        "--plan",
        default="",
        help="다른 plan.json 경로. 교안은 ../eddmpython-course/curriculum/<카테고리>/plan.json 을 쓴다",
    )
    parser.add_argument("--file", help="저장소 밖 staging 이미지 경로")
    parser.add_argument("--dry-run", action="store_true", help="업로드와 파일 수정 없이 계약만 확인")
    parser.add_argument("--create-repo", action="store_true", help="HF 데이터셋이 없으면 공개 저장소 생성")
    parser.add_argument(
        "--reviewed",
        action="store_true",
        help="최종 이미지가 sectionHeading, visualSubject, visualRelationship과 맞는지 직접 확인함",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        if args.verify:
            verify_remote()
        elif args.find:
            find_objects(args.find)
        elif args.prune_objects:
            prune_objects(args.apply)
        else:
            publish(
                args.asset, args.file, args.dry_run, args.create_repo, args.reviewed, args.plan
            )
    except (OSError, RuntimeError, ValueError) as exc:
        raise SystemExit(f"블로그 미디어 발행 실패: {exc}") from exc


if __name__ == "__main__":
    main()
