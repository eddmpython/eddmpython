import { useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { GitHubIcon, ThreadsIcon, YouTubeIcon, MailIcon } from "./icons";
import { SOCIAL } from "../social";

const LINKS = [
  { label: "제품", to: "/#products" },
  { label: "데이터", to: "/#data" },
  { label: "블로그", to: "/blog" },
  { label: "FAQ", to: "/#faq" },
];

const ICONS = [
  { label: "GitHub", href: SOCIAL.github, Icon: GitHubIcon },
  { label: "Threads", href: SOCIAL.threads, Icon: ThreadsIcon },
  { label: "YouTube", href: SOCIAL.youtube, Icon: YouTubeIcon },
  { label: "메일", href: SOCIAL.mail, Icon: MailIcon },
];

export function Nav() {
  const { pathname } = useLocation();

  return (
    <nav className="mb-14 flex flex-col items-center gap-5 md:mb-16 md:flex-row md:justify-between md:gap-0">
      <a href="/" aria-label="eddmpython 홈">
        <Logo />
      </a>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-sm text-ivory/70">
        {LINKS.map((l) => {
          const active = l.to === "/blog" && pathname.startsWith("/blog");
          return (
            <a
              key={l.to}
              href={l.to}
              className={`transition-colors hover:text-ivory ${
                active ? "text-ivory" : ""
              }`}
            >
              {l.label}
            </a>
          );
        })}
        <span className="flex items-center gap-3.5">
          {ICONS.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer"
              aria-label={label}
              className="text-ivory/60 transition-colors hover:text-ivory"
            >
              <Icon className="h-[18px] w-[18px]" />
            </a>
          ))}
        </span>
      </div>
    </nav>
  );
}
