import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-3xl grow px-6 pt-10 md:pt-20">
        <Nav />
        <p className="font-mono text-sm text-ivory/55">404</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">
          찾는 페이지가 없습니다
        </h1>
        <p className="mt-4 text-ivory/60">
          주소가 바뀌었거나 지워진 것 같습니다.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/"
            className="eddm-button-primary rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            홈으로
          </a>
          <a
            href="/blog"
            className="rounded-lg border border-[var(--eddm-line-strong)] px-4 py-2.5 text-sm text-ivory transition-colors hover:bg-[var(--eddm-hover)]"
          >
            블로그
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
}
