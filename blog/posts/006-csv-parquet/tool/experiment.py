import base64
import io
import json

import pyarrow as pa
import pyarrow.csv as csv
import pyarrow.parquet as pq


def sampleTable(rowCount):
    return pa.table({
        "code": [f"{i % 1000 + 12:04d}" for i in range(rowCount)],
        "region": [["서울", "부산", "서울", "대구"][i % 4] for i in range(rowCount)],
        "qty": [[3, 5, 2, 7][i % 4] for i in range(rowCount)],
    })


def encodeTable(table):
    csvBuffer = io.BytesIO()
    parquetBuffer = io.BytesIO()
    csv.write_csv(table, csvBuffer)
    pq.write_table(table, parquetBuffer, compression="snappy")
    return csvBuffer.getvalue(), parquetBuffer.getvalue()


def compareFiles(rowCount):
    if rowCount not in (3, 1000, 100000):
        raise ValueError("행 수는 3, 1000, 100000 중에서 고릅니다")
    table = sampleTable(rowCount)
    csvBytes, parquetBytes = encodeTable(table)
    csvTable = csv.read_csv(io.BytesIO(csvBytes), read_options=csv.ReadOptions(use_threads=False))
    parquetTable = pq.read_table(io.BytesIO(parquetBytes), use_threads=False)
    csvFixed = csv.read_csv(
        io.BytesIO(csvBytes),
        read_options=csv.ReadOptions(use_threads=False),
        convert_options=csv.ConvertOptions(column_types={"code": pa.string()}),
    )
    assert parquetTable.equals(table)
    assert csvFixed.equals(table)
    return {
        "rows": rowCount,
        "version": pa.__version__,
        "csvBytes": len(csvBytes),
        "parquetBytes": len(parquetBytes),
        "csvCode": csvTable["code"][0].as_py(),
        "parquetCode": parquetTable["code"][0].as_py(),
        "csvFixedCode": csvFixed["code"][0].as_py(),
        "csvText": "\n".join(csvBytes.decode("utf-8").splitlines()[:4]),
        "schema": str(parquetTable.schema),
        "csvData": base64.b64encode(csvBytes).decode("ascii"),
        "parquetData": base64.b64encode(parquetBytes).decode("ascii"),
    }
