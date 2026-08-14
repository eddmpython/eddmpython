# 섹션 이미지 브리프

## 먼저 고를 것

1. 실제 제품 화면이 핵심이면 `sourceKind: screenshot`, `visualProfile: product-screen-v1`,
   `sourceUrl`, `captureState`를 쓴다.
2. 공식 문서의 모양이 핵심이면 `sourceKind: official`, `visualProfile: source-original-v1`을 고른다.
3. 코드와 설정값이 핵심이면 본문의 코드 블록을 우선하고, 이미지는 파일과 결과의 관계만 설명한다.
4. 실제 화면이 없는 전후 차이, 순서, 공간 관계만 imagegen으로 만든다.

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

다섯 항목을 모두 통과한 파일만 `--reviewed`로 발행한다.
