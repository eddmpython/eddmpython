"""블로그 이미지를 HF 콘텐츠 주소 객체로 발행하고 Git에는 계약만 남긴다."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import struct
import sys
from copy import deepcopy
from pathlib import Path

sys.dont_write_bytecode = True
from project_env import load_project_env


REPO_ROOT = Path(__file__).resolve().parents[2]
BLOG_ROOT = REPO_ROOT / "blog"
PLAN_PATH = BLOG_ROOT / "media" / "plan.json"
CATALOG_PATH = BLOG_ROOT / "media" / "catalog.json"
STAGING_ROOT = REPO_ROOT.parent / "eddmpython.out" / "blog-media"
DEFAULT_HF_REPO = "eddmpython/eddmpython-media"
OBJECT_PREFIX = "objects/sha256"
IMAGE_SUFFIXES = (".webp", ".png", ".jpg", ".jpeg", ".gif")
IMAGE_MIME = {
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
}
ASSET_ID_RE = re.compile(
    r"(?P<post>\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*)/"
    r"(?P<key>[a-z0-9]+(?:-[a-z0-9]+)*)"
)
SHA256_RE = re.compile(r"[0-9a-f]{64}")
IMAGEGEN_V2 = "eddmpython-dark-v2"
IMAGEGEN_PALETTE = "eddmpython-carbon-ivory-sand-v1"


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


def plan_entry(plan: dict[str, object], asset_id: str) -> dict[str, object]:
    match = ASSET_ID_RE.fullmatch(asset_id)
    if not match:
        raise ValueError("asset id는 <post id>/<영문 kebab-case 키> 형식이어야 함")
    if (
        plan.get("version") != 2
        or plan.get("promptContract") != "section-grounded-v2"
        or not isinstance(plan.get("assets"), dict)
    ):
        raise ValueError("blog/media/plan.json 계약 위반")
    entry = plan["assets"].get(asset_id)
    if not isinstance(entry, dict):
        raise ValueError(f"이미지 계획이 없음: {asset_id}")
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
        "sectionSubtitle",
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
    if role == "section" and entry.get("placement") != "H3 부제 바로 뒤":
        raise ValueError(f"section 이미지 placement는 H3 부제 바로 뒤여야 함: {asset_id}")
    source_kind = str(entry["sourceKind"])
    if source_kind not in {"imagegen", "screenshot", "official", "licensed"}:
        raise ValueError(f"지원하지 않는 sourceKind: {asset_id}: {source_kind}")
    expected_profiles = {
        "imagegen": {"dark-editorial-v1", IMAGEGEN_V2},
        "screenshot": {"product-screen-v1"},
        "official": {"source-original-v1"},
        "licensed": {"source-original-v1"},
    }[source_kind]
    if entry["visualProfile"] not in expected_profiles:
        raise ValueError(f"지원하지 않는 visualProfile: {asset_id}: {entry['visualProfile']}")
    if entry["visualProfile"] == IMAGEGEN_V2 and entry.get("palettePolicy") != IMAGEGEN_PALETTE:
        raise ValueError(f"{IMAGEGEN_V2}에는 {IMAGEGEN_PALETTE}가 필요함: {asset_id}")
    if source_kind == "imagegen" and not str(entry.get("prompt") or "").strip():
        raise ValueError(f"ImageGen 계획에는 prompt가 필요함: {asset_id}")
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
    return entry


def canonical_suffix(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix not in IMAGE_SUFFIXES:
        raise ValueError(f"지원하지 않는 이미지 확장자: {path.name}")
    return ".jpg" if suffix == ".jpeg" else suffix


def validate_magic(path: Path) -> None:
    head = path.read_bytes()[:16]
    suffix = canonical_suffix(path)
    valid = {
        ".png": head.startswith(b"\x89PNG\r\n\x1a\n"),
        ".jpg": head.startswith(b"\xff\xd8\xff"),
        ".gif": head.startswith((b"GIF87a", b"GIF89a")),
        ".webp": len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP",
    }
    if not valid.get(suffix, False):
        raise ValueError(f"확장자와 이미지 바이트가 다름: {path}")


def image_metadata(path: Path) -> dict[str, object]:
    data = path.read_bytes()
    suffix = canonical_suffix(path)
    width = 0
    height = 0

    if suffix == ".png" and len(data) >= 24:
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
        raise ValueError(f"이미지 크기를 읽을 수 없음: {path}")
    return {"width": width, "height": height, "mime": IMAGE_MIME[suffix]}


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
            raise ValueError(f"이미지 작업본이 없음: {path}")
        return path
    matches = [stage_dir / f"{key}{suffix}" for suffix in IMAGE_SUFFIXES]
    existing = [path for path in matches if path.is_file()]
    if len(existing) != 1:
        raise ValueError(f"이미지 작업본은 정확히 하나여야 함: {stage_dir / key}.*")
    return existing[0]


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
        raise ValueError(f"본문이나 ogImage에 이미지 자리표시자가 없음: {placeholder}")
    if not used_as_og:
        return updated
    return upsert_frontmatter(
        updated,
        {
            "ogImageAlt": alt,
            "ogImageWidth": metadata["width"],
            "ogImageHeight": metadata["height"],
            "ogImageType": metadata["mime"],
        },
    )


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
) -> str:
    plan = load_json(PLAN_PATH)
    entry = plan_entry(plan, asset_id)
    post = str(entry["post"])
    key = str(entry["assetKey"])
    post_path = BLOG_ROOT / f"{post}.md"
    if not post_path.is_file():
        raise ValueError(f"글 파일이 없음: {post_path}")

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

    if dry_run:
        print(f"{asset_id}: {local_path} -> {next_url}")
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

    next_catalog = deepcopy(catalog)
    next_objects = next_catalog["objects"]
    next_assets = next_catalog["assets"]
    assert isinstance(next_objects, dict) and isinstance(next_assets, dict)
    next_objects[sha256] = {
        "bytes": local_path.stat().st_size,
        "height": metadata["height"],
        "mime": metadata["mime"],
        "path": remote_path,
        "width": metadata["width"],
    }
    next_assets[asset_id] = {
        "post": post,
        "assetKey": key,
        "sha256": sha256,
        "path": remote_path,
    }
    referenced_objects = {
        str(record.get("sha256"))
        for record in next_assets.values()
        if isinstance(record, dict) and record.get("sha256")
    }
    for object_sha in list(next_objects):
        if object_sha not in referenced_objects:
            del next_objects[object_sha]

    save_json(CATALOG_PATH, next_catalog)
    post_path.write_text(next_raw, encoding="utf-8")
    local_path.unlink()
    if local_path.parent == (STAGING_ROOT / post).resolve() and not any(local_path.parent.iterdir()):
        local_path.parent.rmdir()
    print(f"{asset_id}: HF 업로드, catalog와 본문 반영, staging 정리 완료")
    return next_url


def verify_remote() -> None:
    catalog = load_json(CATALOG_PATH)
    repo = str(catalog.get("repo") or "")
    objects = catalog.get("objects")
    if catalog.get("version") != 1 or catalog.get("objectPrefix") != OBJECT_PREFIX:
        raise ValueError("blog/media/catalog.json 계약 위반")
    if not repo or not isinstance(objects, dict):
        raise ValueError("catalog.json repo 또는 objects 계약 위반")
    paths = sorted(
        {str(record.get("path") or "") for record in objects.values() if isinstance(record, dict)}
    )
    if not paths:
        print("블로그 미디어 원격 검증: 객체 0개")
        return
    try:
        from huggingface_hub import HfApi
    except ImportError as exc:
        raise ValueError(
            "huggingface-hub가 필요함: python -m pip install -r blog/requirements.txt"
        ) from exc
    api = HfApi(token=resolve_token())
    missing = [
        path
        for path in paths
        if not api.file_exists(repo_id=repo, filename=path, repo_type="dataset")
    ]
    if missing:
        raise RuntimeError(f"HF 원격 객체가 없음: {', '.join(missing)}")
    print(f"블로그 미디어 원격 검증: 객체 {len(paths)}개")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="블로그 이미지를 Hugging Face에 발행한다")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--asset", help="plan.json의 <post id>/<assetKey>")
    group.add_argument("--verify", action="store_true", help="catalog의 HF 원격 객체를 전부 확인")
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
        else:
            publish(args.asset, args.file, args.dry_run, args.create_repo, args.reviewed)
    except (OSError, RuntimeError, ValueError) as exc:
        raise SystemExit(f"블로그 미디어 발행 실패: {exc}") from exc


if __name__ == "__main__":
    main()
