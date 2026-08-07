import { SectionHead } from "./SectionHead";
import { useReveal } from "../useReveal";

/* 답은 각 제품의 실제 동작에서만 가져온다. */
const ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "설치해야 쓸 수 있나요?",
    a: "제품마다 다릅니다. Codaro Web Learn 과 xlpod 은 브라우저에서 바로 열립니다. DartLab 은 Python 라이브러리라 pip install dartlab 한 줄이면 됩니다.",
  },
  {
    q: "데이터는 어디서 오나요?",
    a: "DartLab 은 한국 DART 전자공시와 미국 SEC EDGAR, 그리고 금융위원회·한국거래소가 공공데이터포털로 공개하는 시세를 씁니다. 미리 정리한 데이터셋은 Hugging Face 로 배포합니다.",
  },
  {
    q: "내 파일은 어디에 저장되나요?",
    a: "xlpod 은 여러분이 연결한 원본에 되돌려 저장합니다. Excel 파일, Google Sheets, OneDrive, SharePoint 중 연 곳 그대로입니다. Codaro 는 Local 스튜디오로 넘어가면 내 컴퓨터의 실제 파일을 다룹니다.",
  },
  {
    q: "어떤 브라우저가 필요한가요?",
    a: "xlpod 에서 셀 안 Python 실행 기능은 Chromium 계열 (Chrome, Edge) 이 필요합니다. 그 외 기능과 Codaro Web Learn 은 최신 브라우저면 동작합니다.",
  },
  {
    q: "Windows 에서만 되나요?",
    a: "아닙니다. DartLab 은 Python 이 도는 곳이면 어디서나 동작하고, 브라우저 제품은 OS 를 가리지 않습니다. 다만 Codaro 데스크톱 런처는 현재 Windows 실행 파일만 배포합니다.",
  },
  {
    q: "AI 가 다 알아서 하나요?",
    a: "아닙니다. 반복은 코드와 흐름이 처리하고, AI 는 예외와 판단이 필요한 지점에만 개입합니다. 결과가 왜 그렇게 나왔는지 코드로 따라갈 수 있게 만듭니다.",
  },
];

function Item({ q, a, index }: { q: string; a: string; index: number }) {
  const ref = useReveal<HTMLDetailsElement>();
  return (
    <details
      ref={ref}
      className="reveal group border-b border-white/10"
      style={{ transitionDelay: `${Math.min(index, 5) * 0.05}s` }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 py-5 text-[15px] font-medium transition-colors hover:text-ivory md:text-base [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="text-ivory/40 transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
        {q}
      </summary>
      <p className="pb-5 pl-6 text-[15px] leading-relaxed text-ivory/60">{a}</p>
    </details>
  );
}

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-5xl px-6 py-20 md:py-24">
        <SectionHead
          title="자주 묻는 것"
          description="쓰기 전에 확인하게 되는 것들을 모았습니다."
        />
        <div className="mt-10 border-t border-white/10">
          {ITEMS.map((it, i) => (
            <Item key={it.q} q={it.q} a={it.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
