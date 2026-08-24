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
                    className="group grid grid-cols-[5rem_1fr] items-start gap-4 py-7 transition-colors md:grid-cols-[8.5rem_1fr] md:gap-6"
                  >
                    <span
                      data-blog-thumb
                      className="block overflow-hidden rounded-lg border border-white/10 bg-white/5"
                    >
                      <span className="block aspect-[4/3]">
                        {p.ogImage && (
                          <img
                            src={p.ogImage}
                            alt={p.ogImageAlt ?? ""}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        )}
                      </span>
                    </span>
                    <span>
                      <span
                        data-blog-order
                        className="block font-mono text-xs text-sand/70"
                        aria-label={`${p.readingOrder}번째 글`}
                      >
                        {String(p.readingOrder).padStart(2, "0")}
                      </span>
                      <span className="mt-1.5 block text-lg font-medium tracking-tight transition-colors group-hover:text-white md:text-xl">
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
