import { LISTED_POSTS } from "../posts";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

/**
 * 블로그 목록.
 *
 * **카테고리로 묶지 않는다.** 2026-08-24 운영자 지시다. 글이 둘뿐인데 카테고리 제목과
 * 요약과 편수가 글보다 자리를 더 차지했다. 그냥 최신 글이 위에 오는 한 줄기 목록이다.
 * 폴더 이름은 파일을 묶는 데만 쓰고 이 화면은 읽지 않는다.
 *
 * 순서는 발행 순번의 역순이다. `LISTED_POSTS` 가 아카이브한 글을 이미 뺀 목록이라
 * 여기서 다시 거르지 않는다. 아카이브한 글은 URL 과 sitemap 으로만 남는다.
 *
 * 썸네일은 오른쪽이다. 읽는 사람이 제목부터 보고 그림은 곁들여 본다.
 */
export function Blog() {
  const posts = [...LISTED_POSTS].reverse();

  return (
    <div className="min-h-screen">
      <main id="content" className="mx-auto w-full max-w-3xl px-6 pt-10 md:pt-20">
        <Nav />
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">블로그</h1>

        {posts.length > 0 && (
          <ol data-blog-list className="mt-12 border-t border-white/10">
            {posts.map((p) => (
              <li key={p.slug} className="border-b border-white/10">
                <a
                  href={`/blog/${p.slug}`}
                  className="group grid grid-cols-[1fr_5rem] items-start gap-4 py-7 transition-colors md:grid-cols-[1fr_8.5rem] md:gap-6"
                >
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
                </a>
              </li>
            ))}
          </ol>
        )}

        {posts.length === 0 && <p className="mt-12 text-ivory/50">아직 쓴 글이 없습니다.</p>}
      </main>
      <div className="mt-24">
        <Footer />
      </div>
    </div>
  );
}
