import { Link } from "react-router-dom";
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
          <Link
            to="/"
            className="rounded-lg bg-ivory px-4 py-2.5 text-sm font-medium text-carbon transition-colors hover:bg-white"
          >
            홈으로
          </Link>
          <Link
            to="/blog"
            className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-ivory transition-colors hover:bg-white/5"
          >
            블로그
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
