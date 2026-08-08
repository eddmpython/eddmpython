"""블로그 이미지를 HF 콘텐츠 주소 객체로 발행하고 Git에는 계약만 남긴다."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from copy import deepcopy
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BLOG_ROOT = REPO_ROOT / "blog"
PLAN_PATH = BLOG_ROOT / "media" / "plan.json"
CATALOG_PATH = BLOG_ROOT / "media" / "catalog.json"
STAGING_ROOT = REPO_ROOT.parent / "eddmpython.out" / "blog-media"
DEFAULT_HF_REPO = "eddmpython/eddmpython-media"
OBJECT_PREFIX = "objects/sha256"
IMAGE_SUFFIXES = (".webp", ".png", ".jpg", ".jpeg", ".gif")
ASSET_ID_RE = re.compile(
    r"(?P<post>20\d{2}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*)/"
    r"(?P<key>[a-z0-9]+(?:-[a-z0-9]+)*)"
)
SHA256_RE = re.compile(r"[0-9a-f]{64}")


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
        raise ValueError("asset id는 <글 slug>/<영문 kebab-case 키> 형식이어야 함")
    if plan.get("version") != 1 or not isinstance(plan.get("assets"), dict):
        raise ValueError("blog/media/plan.json 계약 위반")
    entry = plan["assets"].get(asset_id)
    if not isinstance(entry, dict):
        raise ValueError(f"이미지 계획이 없음: {asset_id}")
    required = ("post", "assetKey", "alt", "placement", "narrativeUse", "sourcePolicy", "sourceKind")
    missing = [key for key in required if not str(entry.get(key) or "").strip()]
    if missing:
        raise ValueError(f"이미지 계획 필드가 비었음: {asset_id}: {', '.join(missing)}")
    if entry["post"] != match.group("post") or entry["assetKey"] != match.group("key"):
        raise ValueError(f"이미지 계획의 post 또는 assetKey가 id와 다름: {asset_id}")
    if entry["sourcePolicy"] != "auto":
        raise ValueError(f"sourcePolicy는 auto여야 함: {asset_id}")
    source_kind = str(entry["sourceKind"])
    if source_kind not in {"imagegen", "official", "licensed"}:
        raise ValueError(f"지원하지 않는 sourceKind: {asset_id}: {source_kind}")
    if source_kind == "imagegen" and not str(entry.get("prompt") or "").strip():
        raise ValueError(f"ImageGen 계획에는 prompt가 필요함: {asset_id}")
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


def updated_post(raw: str, key: str, next_url: str, old_url: str | None) -> str:
    placeholder = f"media://{key}"
    if placeholder in raw:
        return raw.replace(placeholder, next_url)
    if old_url and old_url in raw:
        return raw.replace(old_url, next_url)
    raise ValueError(f"본문이나 ogImage에 이미지 자리표시자가 없음: {placeholder}")


def resolve_token() -> str | None:
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


def publish(asset_id: str, explicit_file: str | None, dry_run: bool, create_repo: bool) -> str:
    plan = load_json(PLAN_PATH)
    entry = plan_entry(plan, asset_id)
    post = str(entry["post"])
    key = str(entry["assetKey"])
    post_path = BLOG_ROOT / f"{post}.md"
    if not post_path.is_file():
        raise ValueError(f"글 파일이 없음: {post_path}")

    local_path = staging_path(post, key, explicit_file)
    validate_magic(local_path)
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
    next_raw = updated_post(raw, key, next_url, old_url)

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
    next_objects[sha256] = {"bytes": local_path.stat().st_size, "path": remote_path}
    next_assets[asset_id] = {
        "post": post,
        "assetKey": key,
        "sha256": sha256,
        "path": remote_path,
    }

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
    group.add_argument("--asset", help="plan.json의 <글 slug>/<assetKey>")
    group.add_argument("--verify", action="store_true", help="catalog의 HF 원격 객체를 전부 확인")
    parser.add_argument("--file", help="저장소 밖 staging 이미지 경로")
    parser.add_argument("--dry-run", action="store_true", help="업로드와 파일 수정 없이 계약만 확인")
    parser.add_argument("--create-repo", action="store_true", help="HF 데이터셋이 없으면 공개 저장소 생성")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        if args.verify:
            verify_remote()
        else:
            publish(args.asset, args.file, args.dry_run, args.create_repo)
    except (OSError, RuntimeError, ValueError) as exc:
        raise SystemExit(f"블로그 미디어 발행 실패: {exc}") from exc


if __name__ == "__main__":
    main()
