# 섹션 이미지 브리프

**이 파일은 eddmpython 이미지 본보기다. 규칙은 `skills/specs/operation/blogMedia.md`가 맡는다.**

## 먼저 고를 것

1. 실제 제품 화면이 핵심이면 `sourceKind: screenshot`, `visualProfile: product-screen-v1`,
   `sourceUrl`, `captureState`를 쓴다.
2. 화면이 움직이는 녹화가 핵심이면 `sourceKind: recording`, `visualProfile: source-original-v1`,
   `captureState`, `credit`을 쓴다. 로그인과 개인정보가 보이면 올리지 않는다.
3. 공식 문서의 모양이 핵심이면 `sourceKind: official`, `visualProfile: source-original-v1`을 고른다.
4. 코드와 설정값이 핵심이면 본문의 코드 블록을 우선하고, 이미지는 파일과 결과의 관계만 설명한다.
5. 실제 화면이 없는 전후 차이, 순서, 공간 관계만 imagegen으로 만든다.

## 생성 이미지 색상

새로 만들거나 교체하는 imagegen 자산에는 다음 두 값을 쓴다.

```json
{
  "visualProfile": "eddmpython-dark-v2",
  "palettePolicy": "eddmpython-carbon-ivory-sand-v1"
}
```

- 배경과 가장 큰 면: carbon `#101514`
- 주요 피사체와 밝은 면: ivory `#f5f3ee`
- 유일한 작은 강조색: sand `#d8be91`
- 보조색: 채도가 거의 없는 검정, 흑연, 웜그레이
- 금지색: 파랑, 청록, 초록, 보라, 분홍, 빨강, 금색, 네온

성공과 실패를 초록과 빨강으로 구분하지 않는다. 성공은 닫힌 모양, 정렬, 밝은 ivory 면으로 표시하고,
실패는 끊긴 선, 열린 모양, 어두운 graphite 면으로 표시한다. 실제 제품 스크린샷과 공식 자료는 사실을
보존해야 하므로 생성 이미지 팔레트로 다시 칠하지 않는다.

## plan 필드

`contentAnchor`는 본문에 실제로 있는 한 문장을 그대로 복사한다. `visualSubject`에는 화면, 버튼, 코드,
파일, 명령, 결과처럼 눈으로 확인할 대상을 적는다. `visualRelationship`에는 무엇이 바뀌면 어떤 결과가
달라지는지 적는다.

나쁨:

```json
{
  "contentAnchor": "좋은 환경은 흐름을 만듭니다.",
  "visualSubject": "미래적인 작업장",
  "visualRelationship": "가능성을 보여 준다"
}
```

좋음:

```json
{
  "contentAnchor": "CLAUDE.md에 npm test를 적으면 다음 대화도 같은 명령을 실행합니다.",
  "visualSubject": "CLAUDE.md 파일과 npm test 결과가 보이는 터미널 화면",
  "visualRelationship": "파일에 적힌 명령과 다음 대화에서 실행된 명령이 같다"
}
```

## 직접 검수

- 축소한 화면에서도 `visualSubject`가 무엇인지 말할 수 있는가
- 캡션을 읽기 전에 절의 주제와 연결되는가
- 본문에 없는 제품 화면, 숫자, 로고를 지어내지 않았는가
- 공방, 길, 문, 기계 같은 범용 비유가 실제 대상을 밀어내지 않았는가
- 다른 H2 이미지와 바꿔 놓으면 어색한가. 자연스럽다면 구체성이 부족하다
- 생성 이미지에 파랑, 초록, 보라 같은 금지색이 눈에 띄는 면적으로 들어오지 않았는가
- carbon, ivory, sand와 중성색만으로도 전후와 성공 및 실패가 구분되는가

일곱 항목을 모두 통과한 파일만 `--reviewed`로 발행한다.
