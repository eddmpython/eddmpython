import { Link } from "react-router-dom";
import { POSTS, formatDate } from "../posts";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

export function Blog() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-6 pt-10 md:pt-20">
        <Nav />
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">글</h1>
        <p className="mt-4 max-w-lg text-ivory/60">
          만들면서 알게 된 것들을 적어 둡니다.
        </p>

        <ul className="mt-12 border-t border-white/10">
          {POSTS.map((p) => (
            <li key={p.slug} className="border-b border-white/10">
              <Link
                to={`/blog/${p.slug}`}
                className="group block py-7 transition-colors"
              >
                <time className="font-mono text-xs text-ivory/40">
                  {formatDate(p.date)}
                </time>
                <h2 className="mt-2 text-lg font-medium tracking-tight transition-colors group-hover:text-white md:text-xl">
                  {p.title}
                </h2>
                {p.summary && (
                  <p className="mt-2 text-[15px] leading-relaxed text-ivory/55">
                    {p.summary}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {POSTS.length === 0 && (
          <p className="mt-12 text-ivory/50">아직 쓴 글이 없습니다.</p>
        )}
      </div>
      <div className="mt-24">
        <Footer />
      </div>
    </div>
  );
}
