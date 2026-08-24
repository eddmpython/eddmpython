"""한국어 글의 AI 티를 센다.

ai-tells-ko.md 의 1부만 다룬다. 2부는 사람이 읽어야 한다.
표준 라이브러리만 쓴다. 나중에 브라우저 Pyodide 에서 그대로 돌려야 한다.
"""

import re
import statistics
import sys

# (코드, 이름, 정규식, 설명) 문자열로 잡는 것
PATTERNS = [
    ("A1", "~에 대하여", r"에\s*대(하여|해서|해|한)\b", "조사 하나로 끝난다"),
    ("A2", "~를 통하여", r"[을를]\s*통(하여|해서|해)\b", "수단이면 ~로, 방법이면 동사로"),
    ("A3", "~에 있어서", r"에\s*있어(서)?\b", "거의 언제나 지운다"),
    ("A4", "~라는 점에서", r"(라는|다는)\s*점에서|와\s*관련(하여|된|해서)", "관계를 동사로"),
    ("A5", "가지고 있다", r"가지고\s*있", "있다로 끝내거나 동사로"),
    ("A6", "이중 피동", r"되어[지진졌]|지게\s*된", "되다가 이미 피동이다"),
    ("A7", "~에 의해", r"에\s*의(해|하여)\b", "누가 하는지 밝히고 능동으로"),
    ("A8", "영어 대명사 직역", r"(?<![가-힣])그(것|들|녀)", "이름을 다시 부른다"),
    ("B1", "것이다 종결", r"것[이입]\s*(다|니다)[.\s]|것입니다", "동사로 끝낸다"),
    ("B3", "~할 필요가 있다", r"할\s*필요가\s*있", "시킬 거면 시킨다"),
    ("B4", "~로 보인다", r"(것으로|으로)\s*(보인|예상|전망|판단)", "어디까지 봤는지 밝힌다"),
    ("B5", "~할 수 있다", r"[을ㄹ]\s*수\s*있(습니다|다|어|으며)", "그냥 서술할 자리인지 본다"),
    ("C1", "문두 접속사", r"^(또한|따라서|즉|나아가|한편|아울러|게다가)\b", "이름으로 잇는다"),
    ("C2", "이는 ~", r"^이는\s|(?<![가-힣])이는\s", "무엇을 가리키는지 이름으로"),
    ("C3", "정도부사", r"(?<![가-힣])(매우|정말|굉장히|상당히|아주|너무나)(?![가-힣])", "수치를 쓴다"),
    ("C4", "~적 추상어", r"[가-힣]적(인|으로)\s", "무엇이 어떻게 되는지로"),
    ("D1", "종결 공식", r"(결론적으로|요약하자면|정리하자면|마무리하며)", "결론이면 결론을 쓴다"),
    ("D2", "의의 과장", r"(시사하는\s*바|주목할\s*만|중요한\s*의미를)", "무엇이 달라지는지 쓴다"),
    ("D3", "열거 도입", r"(크게\s*[일이삼사오육\d]+\s*가지|다음과\s*같은\s*이유)", "나눠 놓고 바로 센다"),
    ("D4", "완결 공식", r"([할입]\s*때입니다|시점입니다|시작일\s*뿐)", "무슨 일이 일어나는지 쓴다"),
    ("D5", "변환 공식", r"에서\s*[가-힣]+[로으]로\s*(나아|넘어|가는)", "제목에 잘 붙는다"),
    ("D6", "의인화 주어", r"(기술|데이터|시장|시대|사회)[이가]\s*(말|보여|원|요구)", "누가 하는지"),
    ("F7", "대시", r"[–—]", "한국어 자판으로 못 친다"),
    ("F6", "이모지", r"[\U0001F300-\U0001FAFF☀-➿]", "거의 확실한 표식"),
]

CLOSERS = ["습니다", "합니다", "됩니다", "줍니다", "입니다", "니다", "이다", "다"]


def strip_code(text):
    """코드 펜스와 인라인 코드와 링크 주소를 뺀다. 문체 검사 대상이 아니다.

    frontmatter 는 파일 맨 앞에서만 잡는다. 본문에도 --- 구분선이 있어서
    아무 데서나 잡으면 첫 구분선부터 다음 구분선까지 본문을 통째로 지운다.
    """
    text = re.sub(r"\A---\n[\s\S]*?\n---\n", " ", text)
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"`[^`\n]*`", " ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    # 인용은 남의 말이거나 나쁜 예다. 내 문체가 아니므로 뺀다.
    # 이것을 빼지 않으면 나쁜 예를 적은 문서가 그 예문 때문에 걸린다.
    text = re.sub(r"^\s*>.*$", " ", text, flags=re.M)
    # 표도 뺀다. 칸 안은 명사구라 문장 통계를 망친다.
    text = re.sub(r"^\s*\|.*$", " ", text, flags=re.M)
    return text


def unmark(text):
    """강조 기호를 뗀다.

    `**무엇이 없는 것**이다` 처럼 볼드가 낱말 중간에 끼면 문자열 검사가 끊긴다.
    사람이 읽는 것은 기호가 지워진 문장이므로 검사도 그것을 봐야 한다.
    """
    return re.sub(r"\*{1,2}", "", text)


def sentences(text):
    """이미 strip_code 를 거친 본문을 받는다. 여기서는 제목만 더 뺀다."""
    body = re.sub(r"^#{1,6}\s.*$", " ", text, flags=re.M)
    body = re.sub(r"^\s*[-*]\s", "", body, flags=re.M)
    parts = re.split(r"(?<=[.!?])\s+|\n\n+", body)
    return [s.strip() for s in parts if len(s.strip()) >= 10]


def paragraphs(text):
    body = re.sub(r"^#{1,6}\s.*$", " ", text, flags=re.M)
    parts = re.split(r"\n\s*\n", body)
    return [p.strip() for p in parts if len(p.strip()) >= 2]


def check(name, raw):
    text = unmark(strip_code(raw))
    chars = len(re.sub(r"\s", "", text))
    hits = []
    for code, label, pat, fix in PATTERNS:
        found = re.findall(pat, text, flags=re.M)
        if found:
            per10k = len(found) / max(chars, 1) * 10000
            hits.append((code, label, len(found), per10k, fix))

    sents = sentences(text)
    lengths = [len(s) for s in sents]
    paras = paragraphs(text)
    plens = [len(re.sub(r"\s", "", p)) for p in paras]

    closer_count = {}
    for s in sents:
        for c in CLOSERS:
            if s.rstrip().rstrip(".").endswith(c):
                closer_count[c] = closer_count.get(c, 0) + 1
                break

    print(f"\n{'=' * 62}")
    print(f"{name}")
    print(f"{'=' * 62}")
    print(f"본문 {chars:,}자, 문장 {len(sents)}개, 문단 {len(paras)}개")

    if hits:
        print(f"\n[1부 문자열] {len(hits)}종 {sum(h[2] for h in hits)}건")
        for code, label, n, per10k, fix in sorted(hits, key=lambda h: -h[3]):
            print(f"  {code} {label:14s} {n:4d}건  1만자당 {per10k:6.1f}   {fix}")
    else:
        print("\n[1부 문자열] 걸린 것 없음")

    if len(lengths) >= 5:
        sd = statistics.pstdev(lengths)
        mean = statistics.mean(lengths)
        print(f"\n[E1 문장 길이] 평균 {mean:.0f}자, 표준편차 {sd:.0f}, 최단 {min(lengths)}, 최장 {max(lengths)}")
        if sd < mean * 0.45:
            print("  경고: 길이가 고르다. 짧은 선언과 긴 설명을 섞는다")

    if closer_count:
        total = sum(closer_count.values())
        top = sorted(closer_count.items(), key=lambda x: -x[1])[:5]
        print(f"\n[E2 종결어미] " + ", ".join(f"{c} {n}({n / total * 100:.0f}%)" for c, n in top))
        ipnida = closer_count.get("입니다", 0)
        if total and ipnida / total > 0.35:
            print(f"  경고: 입니다가 {ipnida / total * 100:.0f}%. 정의할 때만 쓰고 나머지는 동사로")

    if plens:
        short = sum(1 for p in plens if p < 50) / len(plens) * 100
        print(f"\n[E3 문단 길이] 50자 미만 {short:.0f}%  (사람 글 실측 63%)")
        if short < 25:
            print("  경고: 짧은 문단이 없다. 한 줄짜리 선언을 섞는다")

    bold = len(re.findall(r"\*\*[^*\n]+\*\*", text))
    bullets = len(re.findall(r"^\s*[-*]\s", text, flags=re.M))
    lines = max(len(text.splitlines()), 1)
    print(f"\n[F 서식] 볼드 {bold}개, 불릿 {bullets}줄 (전체 {lines}줄의 {bullets / lines * 100:.0f}%)")
    if bullets / lines > 0.35:
        print("  경고: 불릿이 많다. 문단으로 쓸 것을 쪼갠 자리를 본다")


if __name__ == "__main__":
    for path in sys.argv[1:]:
        with open(path, encoding="utf-8") as f:
            check(path.split("/")[-1].split("\\")[-1], f.read())
