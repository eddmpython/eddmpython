import { SectionHead } from "./SectionHead";
import { useReveal } from "../useReveal";

type Source = { name: string; note: string };

/* 각 제품이 실제로 읽고 쓰는 대상만 적는다. */
const SOURCES: Source[] = [
  { name: "DART", note: "한국 전자공시" },
  { name: "SEC EDGAR", note: "미국 공시" },
  { name: "한국거래소", note: "시세·상장" },
  { name: "금융위원회", note: "공공데이터포털" },
  { name: "Excel", note: "원본 파일 연결" },
  { name: "Google Sheets", note: "공유 링크로 열기" },
  { name: "OneDrive", note: "클라우드 저장소" },
  { name: "SharePoint", note: "조직 문서함" },
  { name: "PyPI", note: "패키지 배포" },
  { name: "Hugging Face", note: "데이터셋 배포" },
];

function SourceCard({ source, index }: { source: Source; index: number }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="reveal rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-colors hover:border-white/20"
      style={{ transitionDelay: `${Math.min(index, 6) * 0.05}s` }}
    >
      <div className="text-[15px] font-medium">{source.name}</div>
      <div className="mt-1 text-sm text-ivory/55">{source.note}</div>
    </div>
  );
}

export function DataSources() {
  return (
    <section id="data" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-5xl px-6 py-20 md:py-24">
        <SectionHead
          title="쓰던 데이터와 파일 그대로"
          description="새 포맷으로 옮기지 않습니다. 이미 쓰고 있는 공시, 시세, 스프레드시트, 클라우드 저장소를 그 자리에서 읽고 결과를 원본에 되돌립니다."
        />
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
          {SOURCES.map((s, i) => (
            <SourceCard key={s.name} source={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
