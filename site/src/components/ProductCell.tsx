import { useState } from "react";
import { PyCell } from "./PyCell";

/** 제품 섹션에 붙는 실행 셀. 자체 코드 상태를 가진다. */
export function ProductCell({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  return <PyCell code={code} onCodeChange={setCode} />;
}
