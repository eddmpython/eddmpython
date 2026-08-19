"""원장의 절 사슬과 실제 글의 H2를 대조한다.

원장은 손으로 적는 설계 문서라 글을 고치면 조용히 낡는다. 이 스크립트는 두 곳이
어긋난 자리를 찾아 준다. 글의 좋고 나쁨을 점수로 매기지 않는다.

    python blog/scripts/outline.py                  모든 카테고리를 대조한다
    python blog/scripts/outline.py --chain          절 사슬을 한 화면에 편다
    python blog/scripts/outline.py --category work-process-automation

종료 코드 1은 원장과 글이 어긋났다는 뜻이지 글이 나쁘다는 뜻이 아니다.
"""

from __future__ import annotations

import argparse
import io
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

BLOG_DIR = Path(__file__).resolve().parent.parent
LEDGER_NAME = "원장.md"

VERDICTS = ("이어짐", "예고", "나열", "끊김")
WEAK = ("예고", "나열")
WEAK_LIMIT = 3

POST_HEADING = re.compile(r"^##\s+(\d{3})\s+(.+?)\s*$")
FILE_LINE = re.compile(r"파일\s+`(\d{3}-[a-z0-9-]+\.md)`")
SECTION_H2 = re.compile(r"^##\s+(.+?)\s*$")
TABLE_ROW = re.compile(r"^\|(.+)\|\s*$")


@dataclass
class LedgerSection:
    index: str
    heading: str
    beat: str
    handoff: str
    verdict: str


@dataclass
class LedgerPost:
    number: str
    title: str
    filename: str | None
    sections: list[LedgerSection] = field(default_factory=list)
    line: int = 0


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def split_row(line: str) -> list[str]:
    match = TABLE_ROW.match(line)
    if not match:
        return []
    return [cell.strip() for cell in match.group(1).split("|")]


def parse_ledger(path: Path) -> list[LedgerPost]:
    """원장에서 글마다의 절 표를 읽는다. 표 머리는 # / H2 / 판정 세 칸으로 알아본다."""
    posts: list[LedgerPost] = []
    current: LedgerPost | None = None
    in_table = False

    for number, raw in enumerate(read(path).splitlines(), start=1):
        heading = POST_HEADING.match(raw)
        if heading:
            current = LedgerPost(
                number=heading.group(1),
                title=heading.group(2),
                filename=None,
                line=number,
            )
            posts.append(current)
            in_table = False
            continue

        if raw.startswith("## "):
            current = None
            in_table = False
            continue

        if current is None:
            continue

        if current.filename is None:
            found = FILE_LINE.search(raw)
            if found:
                current.filename = found.group(1)

        cells = split_row(raw)
        if not cells:
            in_table = False
            continue

        if len(cells) >= 5 and cells[0] == "#" and cells[1] == "H2" and cells[-1] == "판정":
            in_table = True
            continue

        if not in_table:
            continue

        if set("".join(cells)) <= set("-: "):
            continue

        if len(cells) < 5:
            in_table = False
            continue

        current.sections.append(
            LedgerSection(
                index=cells[0],
                heading=cells[1],
                beat=cells[2],
                handoff=cells[3],
                verdict=cells[4],
            )
        )

    return posts


def parse_post_headings(path: Path) -> list[str]:
    headings = []
    inside_fence = False
    for raw in read(path).splitlines():
        if raw.startswith("```"):
            inside_fence = not inside_fence
            continue
        if inside_fence:
            continue
        if raw.startswith("### "):
            continue
        match = SECTION_H2.match(raw)
        if match:
            headings.append(match.group(1))
    return headings


def compare(post: LedgerPost, category: Path) -> list[str]:
    """원장 한 글과 실제 파일을 맞춰 보고 어긋난 줄을 돌려준다."""
    problems: list[str] = []

    if post.filename is None:
        problems.append(f"{post.number}: 원장에 파일 이름을 적은 줄이 없다")
        return problems

    target = category / post.filename
    parked = category / "temp" / post.filename

    if not target.exists():
        if parked.exists():
            # temp 아래 글은 사이트가 굽지 않는다. posts.ts 의 glob 이 한 단계만 본다.
            problems.append(
                f"{post.number}: {post.filename} 이 temp 아래에 있다. "
                f"공개 URL 은 죽어 있고 사이트는 이 글을 굽지 않는다"
            )
            target = parked
        else:
            problems.append(f"{post.number}: {post.filename} 파일이 아예 없다")
            return problems

    if not post.sections:
        problems.append(f"{post.number}: 원장에 절 표가 없다")
        return problems

    actual = parse_post_headings(target)
    ledger = [section.heading for section in post.sections]

    if len(ledger) != len(actual):
        problems.append(
            f"{post.number}: 절 개수가 다르다. 원장 {len(ledger)}개, {post.filename} {len(actual)}개"
        )

    for position, (left, right) in enumerate(zip(ledger, actual), start=1):
        if left != right:
            problems.append(
                f"{post.number}: {position}번 절 제목이 다르다\n"
                f"      원장 {left}\n"
                f"      본문 {right}"
            )

    if len(actual) > len(ledger):
        for extra in actual[len(ledger):]:
            problems.append(f"{post.number}: 원장에 없는 절이 본문에 있다. {extra}")
    elif len(ledger) > len(actual):
        for missing in ledger[len(actual):]:
            problems.append(f"{post.number}: 본문에 없는 절이 원장에 있다. {missing}")

    for section in post.sections:
        if section.verdict not in VERDICTS:
            problems.append(
                f"{post.number}: {section.index}번 절 판정이 {section.verdict}다. "
                f"쓸 수 있는 말은 {', '.join(VERDICTS)}뿐이다"
            )

    return problems


def weak_count(post: LedgerPost) -> int:
    return sum(1 for section in post.sections if section.verdict in WEAK)


def broken_count(post: LedgerPost) -> int:
    return sum(1 for section in post.sections if section.verdict == "끊김")


def print_chain(posts: list[LedgerPost]) -> None:
    for post in posts:
        print(
            f"\n## {post.number} {post.title}"
            f"   (약한 이음 {weak_count(post)}, 끊김 {broken_count(post)})"
        )
        for section in post.sections:
            mark = " " if section.verdict == "이어짐" else "*"
            print(f"  {mark} {section.index:>2}. {section.heading}")
            print(f"       {section.beat}")
            print(f"       -> {section.handoff}  [{section.verdict}]")


def run(category_dirs: list[Path], chain: bool) -> int:
    failures = 0
    for category in category_dirs:
        ledger = category / LEDGER_NAME
        if not ledger.exists():
            print(f"[건너뜀] {category.name}: 원장이 없다")
            continue

        posts = parse_ledger(ledger)
        print(f"\n=== {category.name} ===")
        print(f"원장이 절 표를 가진 글: {len(posts)}편")

        if chain:
            print_chain(posts)
            continue

        for post in posts:
            problems = compare(post, category)
            weak = weak_count(post)

            if problems:
                failures += len(problems)
                print(f"\n[어긋남] {post.number} {post.title}")
                for line in problems:
                    print(f"    {line}")
            else:
                print(f"\n[맞음] {post.number} {post.title}  절 {len(post.sections)}개")

            if post.sections:
                print(f"    이음 판정: 약한 이음 {weak}, 끊김 {broken_count(post)}")
                if weak > WEAK_LIMIT:
                    print(f"    약한 이음이 {WEAK_LIMIT}개를 넘는다. 절을 접어서 줄일 자리다")

    if failures:
        print(f"\n원장과 본문이 어긋난 곳 {failures}건. 둘 중 무엇이 맞는지 정하고 같이 고친다.")
        return 1

    print("\n원장과 본문이 맞는다.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="원장의 절 사슬과 글의 H2를 대조한다")
    parser.add_argument("--category", help="카테고리 폴더 이름. 없으면 전부 본다")
    parser.add_argument("--chain", action="store_true", help="절 사슬을 한 화면에 편다")
    args = parser.parse_args()

    if args.category:
        target = BLOG_DIR / args.category
        if not target.is_dir():
            print(f"{args.category} 폴더가 없다")
            return 2
        categories = [target]
    else:
        categories = sorted(
            path for path in BLOG_DIR.iterdir() if path.is_dir() and (path / LEDGER_NAME).exists()
        )

    if not categories:
        print("원장을 가진 카테고리가 없다")
        return 2

    return run(categories, args.chain)


if __name__ == "__main__":
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    raise SystemExit(main())
