import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { findPost, formatDate } from "../posts";
import { Markdown } from "../components/Markdown";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

export function Post() {
  const { slug } = useParams();
  const post = slug ? findPost(slug) : undefined;

  useEffect(() => {
    if (post) document.title = `${post.title} · eddmpython`;
    return () => {
      document.title = "eddmpython · 복잡한 업무를, 실제로 작동하는 자동화로";
    };
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto w-full max-w-3xl px-6 pt-10 md:pt-20">
          <Nav />
          <h1 className="text-2xl font-medium tracking-tight">
            글을 찾을 수 없습니다
          </h1>
          <Link
            to="/blog"
            className="mt-6 inline-block text-ivory/70 transition-colors hover:text-ivory"
          >
            글 목록으로
          </Link>
        </div>
        <div className="mt-24">
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <article className="mx-auto w-full max-w-3xl px-6 pt-10 md:pt-20">
        <Nav />
        <time className="font-mono text-xs text-ivory/40">
          {formatDate(post.date)}
        </time>
        <h1 className="mt-3 text-3xl leading-tight font-medium tracking-tight md:text-4xl">
          {post.title}
        </h1>
        <div className="mt-10 text-[16px]">
          <Markdown>{post.body}</Markdown>
        </div>
        <div className="mt-16 border-t border-white/10 pt-7">
          <Link
            to="/blog"
            className="text-sm text-ivory/60 transition-colors hover:text-ivory"
          >
            글 목록으로
          </Link>
        </div>
      </article>
      <div className="mt-24">
        <Footer />
      </div>
    </div>
  );
}
