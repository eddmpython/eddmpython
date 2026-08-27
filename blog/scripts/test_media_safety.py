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
            # 죽는 것만으로는 부족하다. 왜 못 셌는지가 대응을 가른다.
            # 저장소가 없는 것과 있는데 비어 있는 것은 할 일이 다르다.
            raised = False
            try:
                publish_media.course_referenced_sha(strict=True)
            except RuntimeError as error:
                raised = True
                assert "279" in str(error), "무엇이 위험한지 안 알려 준다"
                assert "저장소가 없다" in str(error), f"이유가 다르다: {error}"
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

            # 폴더가 있다는 것은 셀 수 있다는 증거가 아니다. sparse checkout, 부분 클론,
            # 클론 진행 중, 깨진 plan.json 은 전부 폴더가 있으면서 아무것도 못 세는 상태다.
            course = Path(temp) / "eddmpython-course" / "curriculum"
            course.mkdir(parents=True)
            raised = False
            try:
                publish_media.course_referenced_sha(strict=True)
            except RuntimeError as error:
                raised = True
                assert "plan.json 도 본문도 없다" in str(error), f"이유가 다르다: {error}"
            assert raised, "비어 있는 curriculum 을 셀 수 있다고 봤다"

            (course / "unit").mkdir()
            (course / "unit" / "plan.json").write_text("{깨짐", encoding="utf-8")
            raised = False
            try:
                publish_media.course_referenced_sha(strict=True)
            except RuntimeError as error:
                raised = True
                assert "못 읽었다" in str(error), f"이유가 다르다: {error}"
            assert raised, "깨진 plan.json 을 조용히 건너뛰었다"

            # 제대로 된 것은 통과하고 실제로 센다. 안 그러면 위 방어가 그냥 막기만 하는 것이다
            wanted = "b" * 64
            (course / "unit" / "plan.json").write_text(
                json.dumps({"assets": {"x": {"sha256": wanted}}}), encoding="utf-8"
            )
            counted = publish_media.course_referenced_sha(strict=True)
            assert wanted in counted, f"정상 plan 을 못 셌다: {counted}"
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


def verifyCatchesRemoteDrift() -> None:
    """원격 검증은 존재만이 아니라 내용 해시를 본다."""
    published = b"published bytes"
    master = b"gray master bytes"
    pubSha, masSha = sha(published), sha(master)

    def catalog(root: Path) -> Path:
        path = root / "catalog.json"
        path.write_text(
            json.dumps(
                {
                    "version": 1,
                    "objectPrefix": publish_media.OBJECT_PREFIX,
                    "repo": "example/none",
                    "objects": {
                        pubSha: {"path": f"objects/sha256/{pubSha[:2]}/{pubSha}.webp",
                                 "bytes": len(published)},
                        masSha: {"path": f"objects/sha256/{masSha[:2]}/{masSha}.png",
                                 "bytes": len(master), "role": "master"},
                    },
                    "assets": {
                        "999-test/hero": {
                            "post": "999-test", "assetKey": "hero",
                            "sha256": pubSha,
                            "masterSha256": masSha,
                            "masterPath": f"objects/sha256/{masSha[:2]}/{masSha}.png",
                        }
                    },
                }
            ),
            encoding="utf-8",
        )
        return path

    def tree(entries):
        def fake(request, timeout=0):  # noqa: ARG001
            return _FakeResponse(json.dumps(entries).encode("utf-8"))
        return fake

    def entry(digest, ext, size, oid=None):
        return {"type": "file", "path": f"objects/sha256/{digest[:2]}/{digest}.{ext}",
                "size": size, "lfs": {"oid": digest if oid is None else oid}}

    whole = [entry(pubSha, "webp", len(published)), entry(masSha, "png", len(master))]

    original_urlopen = urllib.request.urlopen
    original_catalog = publish_media.CATALOG_PATH
    original_token = publish_media.optional_token
    publish_media.optional_token = lambda: ""
    try:
        with tempfile.TemporaryDirectory(prefix="eddm-verify-") as temp:
            publish_media.CATALOG_PATH = catalog(Path(temp))

            urllib.request.urlopen = tree(whole)
            with contextlib.redirect_stdout(io.StringIO()) as out:
                publish_media.verify_remote()
            assert "295" not in out.getvalue()
            assert "일치" in out.getvalue()

            # 죽는 것만으로는 부족하다. 비상 상황에서 무엇이 잘못됐는지 다른 말로 알려야 한다.
            # 원본이 사라진 것과 해시를 못 본 것은 대응이 다르다.
            cases = {
                "원본이 사라짐": ([whole[0]], "원본 없음"),
                "원본 내용이 바뀜": (
                    [whole[0], entry(masSha, "png", len(master), oid=pubSha)],
                    "원본 내용이 다름",
                ),
                "해시를 못 봄": (
                    [whole[0], {"type": "file", "size": len(master),
                                "path": f"objects/sha256/{masSha[:2]}/{masSha}.png"}],
                    "원본 해시 확인 못 함",
                ),
                "크기가 다름": ([whole[0], {**entry(masSha, "png", 1)}], "원본 크기가 다름"),
            }
            for label, (entries, expect) in cases.items():
                urllib.request.urlopen = tree(entries)
                raised = False
                with contextlib.redirect_stdout(io.StringIO()) as out:
                    try:
                        publish_media.verify_remote()
                    except RuntimeError:
                        raised = True
                assert raised, f"{label} 을 통과시켰다"
                assert expect in out.getvalue(), (
                    f"{label} 을 잡았지만 진단이 다르다. 기대 '{expect}', 실제 {out.getvalue()!r}"
                )
    finally:
        urllib.request.urlopen = original_urlopen
        publish_media.CATALOG_PATH = original_catalog
        publish_media.optional_token = original_token
    print("  원격 검증: 사라짐, 내용 바뀜, 해시 없음, 크기 불일치를 모두 잡는다")


def findNeverCallsMasterUnused() -> None:
    """--find 는 사람이 객체를 눈으로 훑는 유일한 자리다. 거기서 원본을 안 쓰는 중이라 하면 안 된다."""
    pub, mas = sha(b"published"), sha(b"gray master")
    original = publish_media.CATALOG_PATH
    try:
        with tempfile.TemporaryDirectory(prefix="eddm-find-") as temp:
            path = Path(temp) / "catalog.json"
            path.write_text(
                json.dumps(
                    {
                        "version": 1,
                        "objectPrefix": publish_media.OBJECT_PREFIX,
                        "repo": "example/none",
                        "objects": {
                            pub: {"alt": "복도 사진", "sourcePost": "999-test",
                                  "path": f"objects/sha256/{pub[:2]}/{pub}.webp"},
                            mas: {"alt": "복도 사진", "sourcePost": "999-test", "role": "master",
                                  "path": f"objects/sha256/{mas[:2]}/{mas}.png"},
                        },
                        "assets": {
                            "999-test/hero": {
                                "post": "999-test", "assetKey": "hero",
                                "sha256": pub, "masterSha256": mas,
                                "masterPath": f"objects/sha256/{mas[:2]}/{mas}.png",
                            }
                        },
                    }
                ),
                encoding="utf-8",
            )
            publish_media.CATALOG_PATH = path
            with contextlib.redirect_stdout(io.StringIO()) as out:
                publish_media.find_objects("복도")
            shown = out.getvalue()
            assert "안 쓰는 중" not in shown, f"원본을 안 쓰는 중이라 불렀다: {shown}"
            assert "지우지도 않는다" in shown, f"지우지 말라는 말이 없다: {shown}"
            # 꼬리 요약이 아니라 원본 줄 자체에 표시가 붙어야 한다. 사람은 줄을 보고 지운다.
            marked = [
                line
                for line in shown.split(chr(10))
                if line.startswith("[") and "유일한 재료" in line
            ]
            assert len(marked) == 1, f"원본 줄에 표시가 없다: {shown}"
            assert "원본" in marked[0], f"어느 자산의 원본인지 안 알려 준다: {marked[0]}"
    finally:
        publish_media.CATALOG_PATH = original
    print("  찾기: 원본을 안 쓰는 중이라 부르지 않는다")


def main() -> None:
    pruneRefusesWhenCourseUnreadable()
    fetchRejectsWrongBytes()
    verifyCatchesRemoteDrift()
    findNeverCallsMasterUnused()
    print("이미지 원본 안전 계약 통과")


if __name__ == "__main__":
    main()
