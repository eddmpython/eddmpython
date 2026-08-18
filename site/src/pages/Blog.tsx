import { POSTS, POSTS_BY_CATEGORY } from "../posts";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

export function Blog() {
  return (
    <div className="min-h-screen">
      <main id="content" className="mx-auto w-full max-w-3xl px-6 pt-10 md:pt-20">
        <Nav />
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">블로그</h1>

        {POSTS_BY_CATEGORY.map(({ category, posts }) => (
          <section key={category.slug} data-blog-category={category.slug} className="mt-14">
            <h2 className="text-xl font-medium tracking-tight text-white md:text-2xl">
              {category.title}
            </h2>
            {category.summary && (
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ivory/55">
                {category.summary}
              </p>
            )}
            <p className="mt-3 font-mono text-xs text-sand/70">{posts.length}편</p>

            <ol data-blog-list className="mt-8 border-t border-white/10">
              {posts.map((p) => (
                <li key={p.slug} className="border-b border-white/10">
                  <a
                    href={`/blog/${p.slug}`}
                    className="group grid grid-cols-[2.5rem_1fr] gap-3 py-7 transition-colors md:grid-cols-[3rem_1fr] md:gap-5"
                  >
                    <span
                      data-blog-order
                      className="pt-1 font-mono text-xs text-sand/70"
                      aria-label={`${p.readingOrder}번째 글`}
                    >
                      {String(p.readingOrder).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="block text-lg font-medium tracking-tight transition-colors group-hover:text-white md:text-xl">
                        {p.title}
                      </span>
                      {p.summary && (
                        <span className="mt-2 block text-[15px] leading-relaxed text-ivory/55">
                          {p.summary}
                        </span>
                      )}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ))}

        {POSTS.length === 0 && (
          <p className="mt-12 text-ivory/50">아직 쓴 글이 없습니다.</p>
        )}
      </main>
      <div className="mt-24">
        <Footer />
      </div>
    </div>
  );
}
