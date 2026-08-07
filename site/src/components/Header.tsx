import { Wordmark } from "./Logo";
import { GitHubIcon } from "./icons";

const LINKS = [
  { label: "제품", href: "#products" },
  { label: "데이터", href: "#data" },
  { label: "코드", href: "#code" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-32">
      <a href="/" aria-label="eddmpython 홈">
        <Wordmark />
      </a>
      <nav className="flex items-center gap-5 text-sm text-ivory/70 md:gap-6">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="hidden transition-colors hover:text-ivory sm:block"
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
      </nav>
    </header>
  );
}
