import { PRODUCTS, type Product } from "../products";
import { useReveal } from "../useReveal";

function ProductCard({ product, index }: { product: Product; index: number }) {
  const ref = useReveal<HTMLElement>();
  return (
    <article
      id={product.id}
      ref={ref}
      className="reveal group flex scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/20"
      style={{ transitionDelay: `${index * 0.08}s` }}
    >
      <a
        href={product.primary.href}
        target="_blank"
        rel="noreferrer"
        aria-label={`${product.name} 열기`}
        className="block aspect-[16/10] overflow-hidden border-b border-white/10 bg-carbon"
      >
        <img
          src={product.shot}
          alt={product.shotAlt}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${product.shotClass ?? ""}`}
        />
      </a>
      <div className="flex flex-1 flex-col p-7">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <span className={`h-2 w-2 rounded-full ${product.dotClass}`} />
            {product.name}
          </h3>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-ivory/55">
            {product.status}
          </span>
        </div>
        <p className="mt-4 text-[15px] font-medium text-ivory/90">
          {product.tagline}
        </p>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ivory/60">
          {product.description}
        </p>
        {product.install && (
          <code className="mt-5 block overflow-x-auto rounded-lg border border-white/10 bg-carbon px-3.5 py-2.5 font-mono text-[13px] whitespace-pre text-ivory/80">
            <span className="select-none text-sand/70">$ </span>
            {product.install}
          </code>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={product.primary.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-ivory px-3.5 py-1.5 text-sm font-medium text-carbon transition-colors hover:bg-white"
          >
            {product.primary.label}
          </a>
          {product.secondary && (
            <a
              href={product.secondary.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/15 px-3.5 py-1.5 text-sm text-ivory transition-colors hover:bg-white/5"
            >
              {product.secondary.label}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export function Products() {
  const headRef = useReveal<HTMLDivElement>();
  return (
    <section id="products" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-5xl px-6 py-20">
        <div ref={headRef} className="reveal">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            만들고 있는 것들
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ivory/60">
            각 제품은 독립적으로 배포되고 운영됩니다. eddmpython은 방향과 품질을
            관리합니다.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PRODUCTS.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
