import { SOCIAL } from "../social";
import { useReveal } from "../useReveal";
import { SectionHead } from "./SectionHead";

const POSES = [
  {
    image: "/brand/euddeum-wave.webp",
    alt: "꼬리를 흔들며 인사하는 분홍 뱀 캐릭터 으뜸이",
    title: "반갑게 인사하고",
    channel: "Threads",
    href: SOCIAL.threads,
  },
  {
    image: "/brand/euddeum-analyze.webp",
    alt: "돋보기로 데이터 차트를 살펴보는 분홍 뱀 캐릭터 으뜸이",
    title: "데이터를 들여다보고",
    channel: "YouTube",
    href: SOCIAL.youtube,
  },
  {
    image: "/brand/euddeum-build.webp",
    alt: "노트북과 톱니바퀴로 제품을 만드는 분홍 뱀 캐릭터 으뜸이",
    title: "작동하는 것을 만들어요",
    channel: "GitHub",
    href: SOCIAL.github,
  },
] as const;

function PoseCard({ pose, index }: { pose: (typeof POSES)[number]; index: number }) {
  const ref = useReveal<HTMLAnchorElement>();

  return (
    <a
      ref={ref}
      href={pose.href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${pose.channel}에서 으뜸이 만나기`}
      className="reveal group cursor-pointer overflow-hidden rounded-2xl border border-[var(--eddm-line-base)] bg-ink transition-colors hover:border-[var(--eddm-line-strong)]"
      style={{ transitionDelay: `${index * 0.08}s` }}
    >
      <div className="aspect-square overflow-hidden bg-ink">
        <img
          src={pose.image}
          alt={pose.alt}
          loading="lazy"
          width={900}
          height={900}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
        />
      </div>
      <div className="flex items-end justify-between gap-4 border-t border-[var(--eddm-line-base)] px-5 py-4">
        <div>
          <div className="text-[15px] font-medium text-ivory">{pose.title}</div>
          <div className="mt-1 text-xs text-ivory/45">{pose.channel}</div>
        </div>
        <span
          aria-hidden="true"
          className="text-sm text-sand transition-transform group-hover:translate-x-0.5"
        >
          ↗
        </span>
      </div>
    </a>
  );
}

export function Euddeum() {
  return (
    <section id="euddeum" className="scroll-mt-16 border-y border-[var(--eddm-line)] bg-[var(--eddm-raise)]">
      <div className="mx-auto w-full max-w-5xl px-6 py-16 md:py-24">
        <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <SectionHead
            title="SNS에서 먼저 인사하는 으뜸이"
            description="으뜸이를 캐릭터화한 분홍 뱀입니다. 낯선 데이터와 도구를 조금 더 가깝게 설명하려고 GitHub, Threads, YouTube에서 다양한 표정과 포즈로 등장합니다."
          />
          <div className="flex w-fit items-center gap-3 rounded-2xl border border-[var(--eddm-line-base)] bg-ink p-2.5 pr-5">
            <img
              src="/brand/euddeum-avatar.webp"
              alt="EDDM Python 이름표를 든 으뜸이 SNS 아바타"
              loading="lazy"
              width={512}
              height={512}
              className="h-20 w-20 rounded-xl object-contain"
            />
            <p className="text-xs leading-relaxed text-ivory/45">
              SNS AVATAR
              <br />
              <span className="text-sm font-medium text-ivory">으뜸이</span>
            </p>
          </div>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3 md:mt-12">
          {POSES.map((pose, index) => (
            <PoseCard key={pose.image} pose={pose} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
