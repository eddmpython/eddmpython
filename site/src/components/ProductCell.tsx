import { useState } from "react";
import { PyCell } from "./PyCell";
import { SheetCell } from "./SheetCell";
import type { Product } from "../products";

/** 제품 섹션에 붙는 실행 셀. 프리셋 탭과 자체 코드 상태를 가진다. */
export function ProductCell({ product }: { product: Product }) {
  const cells = product.cells ?? [];
  const [tab, setTab] = useState(0);
  const [code, setCode] = useState(cells[0]?.code ?? "");

  if (product.cellKind === "sheet") return <SheetCell />;
  if (!cells.length) return null;

  const panelId = `${product.id}-cell`;

  return (
    <div>
      {cells.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {cells.map((c, i) => (
            <button
              key={c.label}
              type="button"
              aria-pressed={i === tab}
              aria-controls={panelId}
              onClick={() => {
                setTab(i);
                setCode(c.code);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                i === tab
                  ? "border-[var(--eddm-accent-line)] bg-[var(--eddm-accent-bg)] text-[var(--eddm-accent)]"
                  : "border-[var(--eddm-line-base)] text-ivory/55 hover:border-[var(--eddm-line-strong)] hover:text-ivory"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div id={panelId}>
        <PyCell
          code={code}
          onCodeChange={setCode}
          packages={product.cellPackages}
          minRows={6}
          hint={product.cellNote}
        />
      </div>
    </div>
  );
}
