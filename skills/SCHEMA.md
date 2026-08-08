# Skill 작성 규약

`skills/specs/**/*.md` 에 스킬을 추가하거나 고칠 때 따르는 규격이다.

## 1. 위치와 id

경로와 id 가 1대1로 대응한다.

```
skills/specs/{category}/{name}.md   ->   id: {category}.{name}
skills/specs/{category}/README.md   ->   id: {category}.README
```

카테고리는 `start` 와 `operation` 둘뿐이다. 새 카테고리는 그 표면이 실제로 생겼을 때 만든다.

## 2. frontmatter

필수 다섯 개다. 검사기가 이것만 본다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 경로에서 유도된다. 중복 금지 |
| `title` | string | 사람이 읽는 짧은 제목 |
| `category` | `start` \| `operation` | 디렉터리와 일치해야 한다 |
| `purpose` | string | 한두 문장. 이 스킬이 답하는 것 |
| `whenToUse` | string[] | 이 문서를 찾게 되는 질문. 비어 있으면 안 된다 |

선택 두 개다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `verify` | string[] | 이 문서의 주장을 확인하는 명령. 실행 가능한 것만 |
| `status` | `curated` \| `observed` | `observed` 는 실측으로 확인했다는 뜻이다 |

`whenToUse` 는 제목을 다시 쓰는 자리가 아니다. **찾는 사람이 실제로 떠올릴 말**을 적는다.

## 3. 본문 규칙

- **실측한 것만 쓴다.** 명령은 실제로 돌려 보고 옮긴다. 출력이 있으면 붙인다.
- **왜 그렇게 했는지 남긴다.** 다음 사람이 같은 최적화를 다시 시도하지 않게 한다.
  특히 시도했다가 되돌린 것은 이유와 함께 적는다.
- **되돌리는 법을 적는다.** 절차마다 롤백 경로가 한 줄 있어야 한다.
- 문서가 코드보다 낡은 것을 발견하면 그 자리에서 고친다.
- em dash 와 en dash 를 쓰지 않는다. 마침표는 평서형 종결에만 쓴다.

## 4. 산출물을 만들지 않는 이유

dartlab 은 spec 에서 여섯 종의 JSON 을 뽑는다. 랜딩, MCP, Pyodide 런타임이 그것을 읽기
때문이다. 이 저장소에는 그 소비자가 없다. **읽는 쪽이 생기기 전에 빌더를 만들지 않는다.**

검사기는 둔다. 문서가 실물과 어긋나는 것이 이 저장소의 실제 실패 방식이기 때문이다.

## 5. 검사

```bash
cd site && npm run check:skills
```

검사하는 것: frontmatter 필수 필드, id 와 경로 일치, id 중복, 저장소 안 상대 링크가
실제 파일을 가리키는지, 금지 문자.
