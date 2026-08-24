"""한국어 글의 AI 티와 문법 문제를 센다.

references/ai-tells-ko.md 와 references/korean-grammar-ko.md 의 셀 수 있는 항목만 다룬다.
읽어야 아는 항목(G 묶음)은 사람이 판정한다.

표준 라이브러리만 쓴다. 브라우저 Pyodide 에서 그대로 돈다.

사용:
    python -X utf8 count-ai-tells.py <파일 경로> [파일 경로...]

출력의 심각도와 문턱은 문서와 같은 값이다. 한쪽만 고치지 않는다.
"""

import re
import statistics
import sys

# 심각도. im-not-ai 의 분류(MIT)와 같은 뜻으로 쓴다.
#   S1 한 번만 나와도 표식이다. 문턱 1
#   S2 한두 번은 자연스럽다. 문서에서 반복될 때 표식이다
#   S3 혼자서는 문제가 아니다. 다른 것과 겹칠 때만 센다
#
# (코드, 이름, 정규식, 심각도, 문턱, 고치는 법, 예외)
# 문턱은 한 문서에서 몇 번부터 경고할지다. 예외는 정규식이 못 가르는 자리다.
PATTERNS = [
    ("A1", "~에 대하여", r"에\s*대(하여|해서|해|한)(?![가-힣])", "S2", 3,
     "목적어면 을/를 로 바꾸고, 서술어가 자동사면 문장을 다시 짠다",
     "제목이나 인용 안은 그대로 둔다"),
    ("A2", "~를 통하여", r"[을를]\s*통(하여|해서|해)(?![가-힣])", "S2", 3,
     "수단이면 ~로, 방법이면 동사로 푼다", ""),
    ("A3", "~에 있어서", r"에\s*있어(서)?(?![가-힣])", "S2", 2,
     "거의 언제나 지운다", ""),
    ("A4", "~라는 점에서", r"(라는|다는)\s*점에서|와\s*관련(하여|된|해서)", "S2", 2,
     "관계를 동사로 말한다", ""),
    ("A5", "가지고 있다", r"가지고\s*있", "S2", 2,
     "있다로 끝내거나 동사를 쓴다",
     "물건을 실제로 들고 있는 뜻이면 그대로 둔다"),
    ("A6", "이중 피동", r"되어[지진졌]|보여지|불려지|쓰여지|나뉘어지|모아지", "S1", 1,
     "되다가 이미 피동이다. 하나만 남긴다",
     "~지게 되다 는 변화를 뜻하면 정상이다"),
    ("A7", "~에 의해 피동", r"에\s*의(해|하여)(?![가-힣])", "S2", 2,
     "누가 하는지 밝히고 능동으로 쓴다",
     "앞 문단의 주제를 이어 가려고 쓴 피동은 그대로 둔다"),
    ("A8", "영어 대명사 직역", r"(?<![가-힣])그(것|들|녀)", "S2", 3,
     "이름을 다시 부르거나 생략한다",
     "바로 앞 문장을 통째로 받는 그것 은 정상이다"),
    ("A9", "고어투 하였", r"[가-힣]하였", "S2", 2,
     "했 으로 바꾼다", "법령이나 옛 문헌 인용은 그대로 둔다"),
    ("A10", "무주어 피동", r"(파악|확인|판단|분석|보고|조사)되었", "S2", 2,
     "누가 했는지 밝히고 능동으로 쓴다", ""),
    ("B1", "것이다 종결", r"것[이입]\s*(다|니다)(?![가-힣])", "S2", 3,
     "동사로 끝낸다", ""),
    ("B2", "형식명사 반복", r"(측면|부분|점|바|데|경우|상황|차원)[이가을를]\s*(있|없)", "S2", 3,
     "그 자리에 실제 대상을 넣는다", "법률 문서의 경우 는 그대로 둔다"),
    ("B3", "~할 필요가 있다", r"[가-힣]\s*필요가\s*있", "S2", 2,
     "행위자가 독자면 시키고, 필자면 무엇을 하기로 했는지 쓴다",
     "그대로 명령형으로 바꾸면 주체가 바뀌는 자리를 조심한다"),
    ("B4", "습관성 완곡", r"(것으로|으로)\s*(보인|예상|전망|판단|파악|기대|확인|분석|알려)", "S2", 2,
     "확인한 것은 단언하고 확인 못 한 것은 어디까지 봤는지 쓴다",
     "수치가 원문에 없으면 지어내지 말고 확인하지 못했다고만 쓴다"),
    ("B5", "~할 수 있다", r"[가-힣]\s+수\s*있", "S3", 5,
     "가능이 아니라 그냥 서술이면 동사로 끝낸다",
     "권한이나 가능을 말하는 자리는 그대로 둔다. 뜻이 바뀐다"),
    ("C1", "문장 첫머리 접속사", r"(?:^|(?<=[.!?])\s+)(또한|따라서|즉|나아가|한편|아울러|게다가)(?![가-힣])", "S2", 3,
     "앞에서 확인한 것을 이름으로 다시 부르며 잇는다", ""),
    ("C2", "이는 ~", r"(?<![가-힣])이는\s", "S2", 2,
     "무엇을 가리키는지 이름으로 적는다", ""),
    ("C3", "정도부사", r"(?<![가-힣])(매우|정말|굉장히|상당히|아주|너무나|너무|훨씬|다소)(?![가-힣])", "S2", 3,
     "그 자리에 수치를 넣는다", "구어체 글에서 감정을 담은 너무 는 그대로 둔다"),
    ("C4", "~적 추상어", r"[가-힣]적(인|으로)\s", "S2", 3,
     "무엇이 어떻게 되는지로 바꾼다", "기계적, 물리적 처럼 뜻이 또렷한 말은 둔다"),
    ("C5", "한자 명사화 결합", r"[가-힣]{2,}(성|화)\s*(향상|개선|강화|확보|제고|증대)", "S2", 2,
     "동사로 푼다. 안정성 향상 은 안정시킨다 로", ""),
    ("D1", "종결 공식", r"(결론적으로|요약하자면|정리하자면|마무리하며)", "S1", 1,
     "결론이면 결론을 바로 쓴다", ""),
    ("D2", "의의 과장", r"(시사하는\s*바|주목할\s*만|중요한\s*의미를)", "S1", 1,
     "무엇이 달라지는지 쓴다", ""),
    ("D3", "열거 도입", r"(크게\s*[일이삼사오육\d]+\s*가지|다음과\s*같은\s*이유)", "S2", 2,
     "나눠 놓고 바로 센다", ""),
    ("D4", "완결 공식", r"([할입]\s*때입니다|시점입니다|시작일\s*뿐)", "S1", 1,
     "무슨 일이 일어나는지 쓴다", ""),
    ("D5", "변환 공식", r"에서\s*[가-힣]+[로으]로\s*(나아|넘어|가는)", "S2", 2,
     "무엇이 무엇으로 바뀌는지 실제로 쓴다", ""),
    ("D6", "의인화 주어", r"(기술|데이터|시장|시대|사회)[이가]\s*(말|보여|원|요구)", "S2", 2,
     "누가 하는지 밝힌다", ""),
    ("F6", "이모지", r"[\U0001F300-\U0001FAFF☀-➿]", "S2", 1,
     "지운다", "이모지를 쓰는 사람 글도 많다. 다른 표식과 겹칠 때만 센다"),
    ("F7", "대시", r"[–—]", "S2", 1,
     "물결표나 마침표로 바꾼다", "범위 표기로 en dash 를 쓰는 조판 관례가 있다"),
]

# 종결어미. 앞에서부터 먼저 맞는 것으로 센다. 한다체와 합니다체를 가른다.
CLOSERS_FORMAL = ["습니다", "합니다", "됩니다", "줍니다", "입니다", "옵니다", "납니다", "니다"]
CLOSERS_PLAIN = ["이다", "한다", "된다", "있다", "없다", "간다", "온다", "다"]

# 리듬 문턱. 문서(ai-tells-ko.md E 묶음)와 같은 값이다.
SD_RATIO_FLOOR = 0.45   # 문장 길이 표준편차 / 평균. 이 아래면 고르다
DOMINANT_CLOSER_MAX = 0.55  # 한 종결어미가 이 비율을 넘으면 단조롭다
MIN_SENTENCE_LEN = 5    # 짧은 단언도 문장으로 센다
DENSITY_FLOOR = 50      # 1만자당 문자열 항목 건수. 이 위면 밀집
KIND_FLOOR = 8          # 걸린 항목 종류 수. 이 위면 밀집


def strip_code(text):
    """문체 검사 대상이 아닌 것을 뺀다.

    frontmatter 는 파일 맨 앞에서만 잡는다. 본문에도 --- 구분선이 있어서
    아무 데서나 잡으면 첫 구분선부터 다음 구분선까지 본문을 통째로 지운다.
    인용은 남의 말이거나 나쁜 예다. 표는 칸 안이 명사구라 문장 통계를 망친다.
    """
    text = re.sub(r"\A---\n[\s\S]*?\n---\n", " ", text)
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"`[^`\n]*`", " ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"^\s*>.*$", " ", text, flags=re.M)
    text = re.sub(r"^\s*\|.*$", " ", text, flags=re.M)
    return text


def unmark(text):
    """강조 기호를 뗀다.

    무엇이 없는 것이다 처럼 볼드가 낱말 중간에 끼면 문자열 검사가 끊긴다.
    사람이 읽는 것은 기호가 지워진 문장이므로 검사도 그것을 봐야 한다.
    """
    return re.sub(r"\*{1,2}", "", text)


def sentences(text):
    body = re.sub(r"^#{1,6}\s.*$", " ", text, flags=re.M)
    body = re.sub(r"^\s*[-*]\s", "", body, flags=re.M)
    parts = re.split(r"(?<=[.!?])\s+|\n\n+", body)
    return [s.strip() for s in parts if len(s.strip()) >= MIN_SENTENCE_LEN]


def closer_of(sentence):
    """문장의 종결을 고른다. 긴 것부터 맞춰야 니다 가 습니다 를 삼키지 않는다."""
    tail = sentence.rstrip().rstrip(".!?")
    for c in CLOSERS_FORMAL:
        if tail.endswith(c):
            return c, "formal"
    for c in CLOSERS_PLAIN:
        if tail.endswith(c):
            return c, "plain"
    return None, None


def check(name, raw):
    text = unmark(strip_code(raw))
    chars = len(re.sub(r"\s", "", text))

    print(f"\n{'=' * 66}")
    print(f"{name}")
    print(f"{'=' * 66}")

    sents = sentences(text)
    lengths = [len(s) for s in sents]
    print(f"본문 {chars:,}자, 문장 {len(sents)}개")

    # 1. 문자열 항목
    over, under = [], []
    for code, label, pat, sev, floor, fix, note in PATTERNS:
        n = len(re.findall(pat, text, flags=re.M))
        if not n:
            continue
        (over if n >= floor else under).append((code, label, n, sev, floor, fix, note))

    if over:
        print(f"\n[문턱 넘음] {len(over)}종")
        for code, label, n, sev, floor, fix, note in sorted(over, key=lambda x: (x[3], -x[2])):
            print(f"  {sev} {code} {label:14s} {n:3d}건 (문턱 {floor})  {fix}")
            if note:
                print(f"       예외: {note}")
    if under:
        line = ", ".join(f"{c} {l} {n}건" for c, l, n, *_ in under)
        print(f"\n[문턱 아래] {line}")
        print("  혼자서는 표식이 아니다. 다른 것과 겹치는 자리만 본다")
    if not over and not under:
        print("\n[문자열] 걸린 것 없음")

    # 짧은 글은 절대 횟수 문턱에 걸리지 않는다.
    #
    # 항목마다 한 번씩만 나와도 종류가 열 가지면 그 글은 AI 글이다. 그런데 문턱을
    # 낮추면 긴 글에서 오탐이 터진다. 그래서 횟수가 아니라 밀도와 종류 수로 한 번 더 본다.
    # S3 는 혼자서는 표식이 아니라고 정의했으므로 밀도에서도 뺀다. 넣으면
    # ~할 수 있다 하나로 멀쩡한 글이 밀집으로 뒤집힌다. 실제로 발행한 글에서 그랬다.
    graded = [x for x in over + under if x[3] in ("S1", "S2")]
    total_hits = sum(x[2] for x in graded)
    kinds = len(graded)
    if chars:
        density = total_hits / chars * 10000
        verdict = "밀집" if density >= DENSITY_FLOOR or kinds >= KIND_FLOOR else "보통"
        print(f"\n[밀도] {total_hits}건 {kinds}종, 1만자당 {density:.0f}건 "
              f"(문턱 {DENSITY_FLOOR}건 또는 {KIND_FLOOR}종) {verdict}")
        if verdict == "밀집":
            print("  항목마다 한 번씩이라도 종류가 많으면 글 전체가 표식이다. 문턱 아래도 함께 고친다")

    # 2. 리듬
    if len(lengths) >= 5:
        sd = statistics.pstdev(lengths)
        mean = statistics.mean(lengths)
        ratio = sd / mean if mean else 0
        mark = "경고" if ratio < SD_RATIO_FLOOR else "통과"
        print(f"\n[E1 문장 길이] 평균 {mean:.0f}자, 표준편차 {sd:.0f}, 비율 {ratio:.2f} (문턱 {SD_RATIO_FLOOR}) {mark}")
        print(f"  최단 {min(lengths)}자, 최장 {max(lengths)}자")
        if ratio < SD_RATIO_FLOOR:
            print("  짧은 단언과 긴 설명을 섞는다. 붙일 때 원문에 없는 내용을 더하지 않는다")
    else:
        print("\n[E1 문장 길이] 문장이 적어 재지 않는다")

    counts, styles = {}, {}
    for s in sents:
        c, style = closer_of(s)
        if c:
            counts[c] = counts.get(c, 0) + 1
            styles[style] = styles.get(style, 0) + 1
    if counts:
        total = sum(counts.values())
        top = sorted(counts.items(), key=lambda x: -x[1])
        share = top[0][1] / total
        mark = "경고" if share > DOMINANT_CLOSER_MAX else "통과"
        head = ", ".join(f"{c} {n}({n / total * 100:.0f}%)" for c, n in top[:5])
        style = "합니다체" if styles.get("formal", 0) >= styles.get("plain", 0) else "한다체"
        print(f"\n[E2 종결어미] {style}  {head}")
        print(f"  으뜸 어미 {share * 100:.0f}% (문턱 {DOMINANT_CLOSER_MAX * 100:.0f}%) {mark}")
        if share > DOMINANT_CLOSER_MAX:
            print("  한 어미가 이어진다. 입니다 는 정의할 때만 쓰고 나머지는 동사로 끝낸다")
    else:
        print("\n[E2 종결어미] 종결을 찾지 못했다")

    # 3. 서식. 기호가 살아 있는 원문에서 센다
    marked = strip_code(raw)
    bold = len(re.findall(r"\*\*[^*\n]+\*\*", marked))
    bullets = len(re.findall(r"^\s*[-*]\s", marked, flags=re.M))
    lines = max(len(marked.splitlines()), 1)
    ratio = bullets / lines
    print(f"\n[F 서식] 볼드 {bold}개, 불릿 {bullets}줄 ({ratio * 100:.0f}%)")
    if ratio > 0.35:
        print("  불릿이 많다. 문단으로 쓸 것을 쪼갠 자리를 본다")

    print("\n[사람이 볼 것] G 묶음은 셀 수 없다. 겪은 사람이 있는가, 독자가 정해져")
    print("  있는가, 판단이 있는가, 확인한 것과 안 한 것이 갈리는가를 읽고 정한다")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    for path in sys.argv[1:]:
        with open(path, encoding="utf-8") as f:
            check(path.replace("\\", "/").split("/")[-1], f.read())
