import { Wordmark } from "./Logo";
import { GitHubIcon } from "./icons";

const LINKS = [
  { label: "제품", href: "#products" },
  { label: "데이터", href: "#data" },
  { label: "코드", href: "#code" },
  { label: "FAQ", href: "#faq" },
];

export function Nav() {
  return (
    <nav className="mb-14 flex flex-col items-center gap-5 md:mb-16 md:flex-row md:justify-between md:gap-0">
      <a href="/" aria-label="eddmpython 홈">
        <Wordmark />
      </a>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ivory/70 md:gap-x-6">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="transition-colors hover:text-ivory"
          >
            {l.label}
          </a>
        ))}
        <a
          href="https://github.com/eddmpython"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className="transition-colors hover:text-ivory"
        >
          <GitHubIcon className="h-5 w-5" />
        </a>
      </div>
    </nav>
  );
}
