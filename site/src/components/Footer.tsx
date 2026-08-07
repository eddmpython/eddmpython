import { Link } from "react-router-dom";
import { Wordmark } from "./Logo";
import { PRODUCTS } from "../products";
import { SOCIAL } from "../social";
import { GitHubIcon, ThreadsIcon, YouTubeIcon, MailIcon } from "./icons";

const CHANNELS = [
  { label: "GitHub", href: SOCIAL.github, Icon: GitHubIcon },
  { label: "Threads", href: SOCIAL.threads, Icon: ThreadsIcon },
  { label: "YouTube", href: SOCIAL.youtube, Icon: YouTubeIcon },
];

const REGISTRIES = [
  { label: "PyPI · dartlab", href: "https://pypi.org/project/dartlab/" },
  { label: "npm · pyproc", href: "https://www.npmjs.com/package/pyproc" },
  { label: "Hugging Face", href: "https://huggingface.co/eddmpython" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:py-14">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ivory/50">
            복잡한 업무를, 실제로 작동하는 자동화로.
          </p>
          <a
            href={SOCIAL.mail}
            className="mt-5 inline-flex items-center gap-2 text-sm text-ivory/70 transition-colors hover:text-ivory"
          >
            <MailIcon className="h-4 w-4" />
            eddmpython@gmail.com
          </a>
          <div className="mt-4 flex items-center gap-4">
            {CHANNELS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer"
                aria-label={label}
                className="text-ivory/55 transition-colors hover:text-ivory"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        <nav aria-label="제품">
          <h3 className="text-sm font-medium text-ivory/55">제품</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {PRODUCTS.map((p) => (
              <li key={p.id}>
                <a
                  href={p.primary.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ivory/70 transition-colors hover:text-ivory"
                >
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="채널">
          <h3 className="text-sm font-medium text-ivory/55">채널</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link
                to="/blog"
                className="text-ivory/70 transition-colors hover:text-ivory"
              >
                블로그
              </Link>
            </li>
            {REGISTRIES.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ivory/70 transition-colors hover:text-ivory"
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto w-full max-w-5xl px-6 py-6 text-xs text-ivory/55">
          © 2026 eddmpython
        </div>
      </div>
    </footer>
  );
}
