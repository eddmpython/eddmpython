"""이미지 원본을 잃거나 조용히 바꿔치기당하는 경로를 막았는지 검사한다.

여기서 지키는 것은 회색 원본이다. 발행된 webp 에서 원본을 되돌리는 것은 실패한다
(평균 차이 11.3/255, 화소의 68%가 8/255 넘게 어긋난다). 원본을 잃으면 같은 이미지를
다시 못 만든다. 그래서 원본을 다루는 두 경로에 부정 대조를 건다.

  1. 참조를 못 셌는데 정리를 진행하는가   (publish_media.prune)
  2. 받은 원본이 틀린데 그냥 쓰는가       (paint_media.fetchMasters)
"""

from __future__ import annotations

import contextlib
import hashlib
import io
import json
import sys
import tempfile
import urllib.request
from pathlib import Path

sys.dont_write_bytecode = True
import paint_media
import publish_media


class _FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
        return False


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def catalogFor(root: Path, post: str, key: str, digest: str) -> Path:
    path = root / "catalog.json"
    path.write_text(
        json.dumps(
            {
                "repo": "example/none",
                "objects": {},
                "assets": {
                    f"{post}/{key}": {
                        "post": post,
                        "assetKey": key,
                        "masterSha256": digest,
                        "masterPath": f"objects/sha256/{digest[:2]}/{digest}.png",
                    }
                },
            }
        ),
        encoding="utf-8",
    )
    return path


def pruneRefusesWhenCourseUnreadable() -> None:
    """교안 참조를 못 세면 지우는 쪽은 죽고 보여 주는 쪽은 계속한다."""
    with tempfile.TemporaryDirectory(prefix="eddm-course-") as temp:
        original = publish_media.REPO_ROOT
        # 형제 교안 저장소가 없는 기계를 흉내낸다
        publish_media.REPO_ROOT = Path(temp) / "repo"
        try:
            raised = False
            try:
                publish_media.course_referenced_sha(strict=True)
            except RuntimeError as error:
                raised = True
                assert "279" in str(error), "무엇이 위험한지 안 알려 준다"
            assert raised, "교안을 못 세는데 strict 가 통과했다"

            with contextlib.redirect_stdout(io.StringIO()) as out:
                loose = publish_media.course_referenced_sha(strict=False)
            assert loose == set()
            assert "세지 못했다" in out.getvalue(), "못 셌다는 사실을 안 알린다"

            catalog = {"objects": {"a" * 64: {}}, "assets": {}}
            raised = False
            try:
                publish_media.unreferenced_objects(catalog, strict=True)
            except RuntimeError:
                raised = True
            assert raised, "unreferenced_objects 가 strict 를 안 넘긴다"
        finally:
            publish_media.REPO_ROOT = original
    print("  정리: 교안 참조를 못 세면 지우지 않는다")


def fetchRejectsWrongBytes() -> None:
    """받은 바이트와 로컬 바이트 모두 catalog 해시와 대조한다."""
    good = b"\x89PNG\r\n\x1a\n" + b"correct master bytes"
    digest = sha(good)
    calls: list[str] = []

    def fakeUrlopen(request, timeout=0):  # noqa: ARG001
        calls.append(request.full_url)
        return _FakeResponse(fakeUrlopen.payload)

    original_urlopen = urllib.request.urlopen
    original_catalog = paint_media.CATALOG_PATH
    urllib.request.urlopen = fakeUrlopen
    try:
        with tempfile.TemporaryDirectory(prefix="eddm-master-") as temp:
            root = Path(temp)
            stage = root / "stage"
            stage.mkdir()
            paint_media.CATALOG_PATH = catalogFor(root, "999-test", "hero", digest)
            target = stage / f"hero{paint_media.MASTER_SUFFIX}"

            # (가) 로컬이 없다: 받아서 해시가 맞으면 쓴다
            fakeUrlopen.payload = good
            got = paint_media.fetchMasters("999-test", stage)
            assert got and target.read_bytes() == good
            assert len(calls) == 1

            # (나) 로컬이 맞다: 다시 안 받는다
            paint_media.fetchMasters("999-test", stage)
            assert len(calls) == 1, "맞는 원본을 다시 받는다"

            # (다) 로컬이 오염됐다: 그것이 이기면 안 된다
            target.write_bytes(b"\x89PNG\r\n\x1a\n truncated")
            with contextlib.redirect_stdout(io.StringIO()) as out:
                paint_media.fetchMasters("999-test", stage)
            assert len(calls) == 2, "오염된 로컬 원본이 그대로 이겼다"
            assert target.read_bytes() == good, "오염된 원본을 복구하지 못했다"
            assert "다시 받는다" in out.getvalue()

            # (라) 원격이 틀리다: 조용히 쓰면 안 된다
            target.unlink()
            fakeUrlopen.payload = b"\x89PNG\r\n\x1a\n someone elses image"
            raised = False
            try:
                paint_media.fetchMasters("999-test", stage)
            except RuntimeError as error:
                raised = True
                assert digest in str(error), "기대 해시를 안 알려 준다"
            assert raised, "해시가 다른 원본을 그냥 받아 썼다"
            assert not target.exists(), "틀린 바이트를 디스크에 남겼다"
    finally:
        urllib.request.urlopen = original_urlopen
        paint_media.CATALOG_PATH = original_catalog
    print("  원본 회수: 로컬과 원격 바이트를 모두 대조한다")


def main() -> None:
    pruneRefusesWhenCourseUnreadable()
    fetchRejectsWrongBytes()
    print("이미지 원본 안전 계약 통과")


if __name__ == "__main__":
    main()
