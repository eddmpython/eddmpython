import { PRODUCTS, type Product } from "../products";
import { SectionHead } from "./SectionHead";
import { useReveal } from "../useReveal";

function ProductRow({ product, index }: { product: Product; index: number }) {
  const ref = useReveal<HTMLElement>();
  const flip = index % 2 === 1;

  return (
    <article
      id={product.id}
      ref={ref}
      className="reveal group grid scroll-mt-24 items-center gap-8 md:grid-cols-2 md:gap-12"
    >
      <div className={flip ? "md:order-2" : ""}>
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${product.dotClass}`} />
          <h3 className="text-xl font-medium tracking-tight md:text-2xl">
            {product.name}
          </h3>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-ivory/55">
            {product.status}
          </span>
        </div>

        <p className="mt-5 text-lg leading-snug font-medium md:text-xl">
          {product.tagline}
        </p>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ivory/60">
          {product.description}
        </p>

        <ul className="mt-6 space-y-2.5">
          {product.points.map((pt) => (
            <li key={pt} className="flex gap-3 text-sm text-ivory/70">
              <span aria-hidden="true" className="text-ivory/30">
                —
              </span>
              {pt}
            </li>
          ))}
        </ul>

        {product.install && (
          <code className="mt-6 inline-block overflow-x-auto rounded-lg border border-white/10 bg-carbon px-3.5 py-2 font-mono text-[13px] whitespace-pre text-ivory/80">
            <span className="select-none text-sand/70">$ </span>
            {product.install}
          </code>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href={product.primary.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-ivory px-4 py-2 text-sm font-medium text-carbon transition-colors hover:bg-white"
          >
            {product.primary.label}
          </a>
          {product.secondary && (
            <a
              href={product.secondary.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-ivory transition-colors hover:bg-white/5"
            >
              {product.secondary.label}
            </a>
          )}
        </div>
      </div>

      <a
        href={product.primary.href}
        target="_blank"
        rel="noreferrer"
        aria-label={`${product.name} 열기`}
        className={`overflow-hidden rounded-xl bg-white/[0.06] p-2 ring-1 ring-white/10 transition-colors hover:ring-white/25 sm:rounded-2xl sm:p-3 ${
          flip ? "md:order-1" : ""
        }`}
      >
        <div className="aspect-[16/10] overflow-hidden rounded-lg bg-carbon sm:rounded-xl">
          <img
            src={product.heroShot}
            alt={product.shotAlt}
            loading="lazy"
            width={1800}
            height={1125}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      </a>
    </article>
  );
}

export function Products() {
  return (
    <section id="products" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-5xl px-6 py-20 md:py-24">
        <SectionHead
          title="만들고 있는 것들"
          description="각 제품은 독립적으로 배포되고 운영됩니다. 공시 데이터, Python 학습, 스프레드시트 자동화. 셋 다 같은 원칙으로 만듭니다."
        />
        <div className="mt-14 space-y-20 md:space-y-24">
          {PRODUCTS.map((p, i) => (
            <ProductRow key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
