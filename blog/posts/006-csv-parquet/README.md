# CSV와 Parquet 비교 예제

`tool/experiment.py`가 표 생성과 파일 바이트를 소유한다. 브라우저 도구와 `measure.py`가 이 코드를
함께 사용한다. `measurements.json`은 본문에 실은 측정 기록이며, 다시 실행한 시간은 기계와 부하에
따라 달라진다. `test.py`는 저장 바이트 수, 자료형, 실행 칸 출력과 본문 수치를 대조한다.

`visuals.ts`는 기존 코드 렌더 도식의 재현 소스이며 그래프는 `measurements.json`을 읽는다.
신규 이미지와 교체 이미지의 제작 및 발행은
[블로그 미디어 운영 계약](../../../skills/specs/operation/blogMedia.md)을 따른다.

## 다시 측정하기

uv가 설치된 환경에서 이 폴더를 현재 작업 폴더로 연다. 아래 마지막 인자는 아직 없는 결과 폴더다.
이미 있는 폴더를 주면 원본 파일을 덮어쓰지 않고 멈춘다.

```powershell
uv run --python 3.14 --with pyarrow==22.0.0 python -B -X utf8 measure.py C:/Users/사용자이름/Desktop/parquet-results
```

CSV와 Parquet 여섯 파일, 새 `measurements.json`이 결과 폴더에 생긴다. 코드 종류는 1,000개이고 지역과
수량은 네 행 단위로 반복되는 합성 데이터다. 일반 데이터의 압축률이나 라이브러리 순위를 뜻하지 않는다.
읽기 시간은 파일을 한 번 읽어 캐시가 데워진 뒤 단일 스레드로 일곱 번 재서 중앙값을 구한다.

## 예제 확인

```powershell
uv run --python 3.14 --with pyarrow==22.0.0 python -B -X utf8 test.py
```
