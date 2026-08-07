import { Wordmark } from "./Logo";
import { GitHubIcon } from "./icons";

export function Header() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
      <a href="/" aria-label="eddmpython 홈">
        <Wordmark />
      </a>
      <nav className="flex items-center gap-6 text-sm text-ivory/70">
        <a href="#products" className="transition-colors hover:text-ivory">
          제품
        </a>
        <a href="#philosophy" className="transition-colors hover:text-ivory">
          철학
        </a>
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
