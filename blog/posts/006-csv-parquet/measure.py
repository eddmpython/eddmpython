"""브라우저 도구와 같은 표를 파일로 저장하고, 캐시가 데워진 읽기 시간을 잽니다."""

import argparse
import io
import json
import platform
from pathlib import Path
from statistics import median
from time import perf_counter

import pyarrow as pa
import pyarrow.csv as csv
import pyarrow.parquet as pq

from tool.experiment import encodeTable, sampleTable


def measure(outputDir):
    outputDir.mkdir(parents=True, exist_ok=False)
    report = {
        "python": platform.python_version(),
        "pyarrow": pa.__version__,
        "platform": platform.platform(),
        "method": "disk files, one warm-up, seven timed reads, alternating order, single-thread readers, median milliseconds",
        "data": "code repeats every 1000 rows; region and qty repeat every 4 rows; UTF-8 CSV without compression; Parquet with Snappy",
        "measurements": [],
    }
    for rows in (3, 1000, 100000):
        table = sampleTable(rows)
        csvBytes, parquetBytes = encodeTable(table)
        csvPath = outputDir / f"sample-{rows}.csv"
        parquetPath = outputDir / f"sample-{rows}.parquet"
        csvPath.write_bytes(csvBytes)
        parquetPath.write_bytes(parquetBytes)
        rawParquet = io.BytesIO()
        pq.write_table(table, rawParquet, compression=None)
        readers = {
            "csvAll": lambda: csv.read_csv(
                csvPath,
                read_options=csv.ReadOptions(use_threads=False),
                convert_options=csv.ConvertOptions(column_types={"code": pa.string()}),
            ),
            "parquetAll": lambda: pq.read_table(parquetPath, use_threads=False),
            "csvQty": lambda: csv.read_csv(
                csvPath,
                read_options=csv.ReadOptions(use_threads=False),
                convert_options=csv.ConvertOptions(include_columns=["qty"]),
            ),
            "parquetQty": lambda: pq.read_table(parquetPath, columns=["qty"], use_threads=False),
        }
        for name, reader in readers.items():
            expected = table if name.endswith("All") else table.select(["qty"])
            assert reader().equals(expected), name
        samples = {name: [] for name in readers}
        for run in range(7):
            order = list(readers)
            if run % 2:
                order.reverse()
            for name in order:
                start = perf_counter()
                output = readers[name]()
                samples[name].append((perf_counter() - start) * 1000)
                assert output.num_rows == rows
        report["measurements"].append({
            "rows": rows,
            "csvBytes": csvPath.stat().st_size,
            "parquetBytes": parquetPath.stat().st_size,
            "uncompressedParquetBytes": len(rawParquet.getvalue()),
            "medianMs": {name: round(median(values), 3) for name, values in samples.items()},
            "samplesMs": samples,
        })
    (outputDir / "measurements.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("outputDir", type=Path, help="아직 없는 결과 폴더의 경로")
    measure(parser.parse_args().outputDir)
