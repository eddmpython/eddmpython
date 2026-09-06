import base64
import contextlib
import io
import json
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

from tool.experiment import compareFiles, sampleTable

root = Path(__file__).parent
report = json.loads((root / "measurements.json").read_text(encoding="utf-8"))
article = (root / "index.md").read_text(encoding="utf-8")
assert pa.__version__ == report["pyarrow"]
for recorded in report["measurements"]:
    result = compareFiles(recorded["rows"])
    assert result["csvBytes"] == recorded["csvBytes"]
    assert result["parquetBytes"] == recorded["parquetBytes"]
    assert result["csvCode"] == 12
    assert result["parquetCode"] == result["csvFixedCode"] == "0012"
    assert len(base64.b64decode(result["csvData"])) == result["csvBytes"]
    decoded = pq.read_table(io.BytesIO(base64.b64decode(result["parquetData"])), use_threads=False)
    assert decoded.equals(sampleTable(recorded["rows"]))
    for key in ("csvBytes", "parquetBytes", "uncompressedParquetBytes"):
        if key == "uncompressedParquetBytes" and recorded["rows"] != 100000:
            continue
        assert f'{recorded[key]:,}바이트' in article
    for key in ("csvAll", "parquetAll"):
        assert f'{recorded["medianMs"][key]:.3f}ms' in article
    if recorded["rows"] == 100000:
        for key in ("csvQty", "parquetQty"):
            assert f'{recorded["medianMs"][key]:.3f}ms' in article

cells = json.loads((root / "cells.json").read_text(encoding="utf-8"))["examples"]
expected = {
    "csv-parquet-code": "[12, 13, 14]\n['0012', '0013', '0014']\n",
    "csv-parquet-schema": "code: string\nregion: string\nqty: int64\n['0012', '0013', '0014']\n",
    "csv-parquet-columns": "['qty']\n{'qty': [3, 5, 2]}\n",
    "csv-parquet-compression": "압축 없음: 184,643바이트\nSnappy: 18,217바이트\n",
}
for name, cell in cells.items():
    assert cell["packages"] == [f'pyarrow=={report["pyarrow"]}']
    assert f"?example={name}" in article
    scope = {}
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exec(compile(cell["code"], name, "exec"), scope)
    assert output.getvalue() == expected[name], output.getvalue()
    if "table" in scope:
        assert scope["table"].equals(sampleTable(scope.get("rowCount", 3)))
    else:
        assert scope["fixed"].equals(sampleTable(3))
    print(name, output.getvalue().strip().replace("\n", " / "))
changed = cells["csv-parquet-code"]["code"].replace("0012", "0007")
scope = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec(changed, scope)
assert scope["guessed"]["code"][0].as_py() == 7
assert scope["fixed"]["code"][0].as_py() == "0007"
changed = cells["csv-parquet-columns"]["code"].replace('columns=["qty"]', 'columns=["region", "qty"]')
with contextlib.redirect_stdout(io.StringIO()):
    exec(changed, scope)
assert scope["selected"].column_names == ["region", "qty"]
try:
    compareFiles(999)
    raise AssertionError("지원하지 않는 행 수를 받았습니다")
except ValueError:
    pass
print("실험 바이트, 자료형, 다운로드 바이트, 실행 칸과 수정 예제 확인 완료")
