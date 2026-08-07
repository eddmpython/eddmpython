import { Wordmark } from "./Logo";
import { PRODUCTS } from "../products";

const CHANNELS = [
  { label: "GitHub", href: "https://github.com/eddmpython" },
  { label: "PyPI · dartlab", href: "https://pypi.org/project/dartlab/" },
  { label: "Hugging Face", href: "https://huggingface.co/eddmpython" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ivory/50">
            복잡한 업무를, 실제로 작동하는 자동화로.
          </p>
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
            {CHANNELS.map((c) => (
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
