import { PRODUCTS, type Product } from "../products";
import { SectionHead } from "./SectionHead";
import { useReveal } from "../useReveal";
import { ProductCell } from "./ProductCell";

function ProductRow({ product, index }: { product: Product; index: number }) {
  const ref = useReveal<HTMLElement>();
  const flip = index % 2 === 1;

  return (
    <article
      id={product.id}
      ref={ref}
      className="reveal group flex scroll-mt-20 flex-col gap-7 md:grid md:grid-cols-2 md:items-center md:gap-x-12 md:gap-y-8"
    >
      {/* 모바일에서는 화면이 먼저 오고 CTA 가 맨 끝에 온다. */}
      <a
        href={product.primary.href}
        target="_blank"
        rel="noreferrer"
        aria-label={`${product.name} 열기`}
        className={`max-md:order-first overflow-hidden rounded-xl bg-white/[0.06] p-1.5 ring-1 ring-white/10 transition-colors hover:ring-white/25 sm:p-2 md:order-none md:rounded-2xl md:p-3 ${
          flip ? "md:col-start-1" : "md:col-start-2"
        } md:row-start-1`}
      >
        <div className="aspect-[16/10] overflow-hidden rounded-lg bg-carbon md:rounded-xl">
          <img
            src={product.heroShot}
            alt={product.shotAlt}
            loading="lazy"
            width={1800}
            height={1125}
            className="h-full w-full object-cover transition-transform duration-500 md:group-hover:scale-[1.02]"
          />
        </div>
      </a>

      <div
        className={`${flip ? "md:col-start-2" : "md:col-start-1"} md:row-start-1`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${product.dotClass}`} />
          <h3 className="text-xl font-medium tracking-tight md:text-2xl">
            {product.name}
          </h3>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-ivory/55">
            {product.status}
          </span>
        </div>

        <p className="mt-4 text-lg leading-snug font-medium md:mt-5 md:text-xl">
          {product.tagline}
        </p>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ivory/60">
          {product.description}
        </p>

        <ul className="mt-6 space-y-2.5">
          {product.points.map((pt) => (
            <li key={pt} className="flex items-start gap-3 text-sm text-ivory/70">
              <span
                aria-hidden="true"
                className="mt-2.5 h-px w-2.5 shrink-0 bg-ivory/30"
              />
              {pt}
            </li>
          ))}
        </ul>

        {product.install && (
          <code className="mt-6 block overflow-x-auto rounded-lg border border-white/10 bg-carbon px-3.5 py-2.5 font-mono text-[13px] whitespace-pre text-ivory/80">
            <span className="select-none text-sand/70">$ </span>
            {product.install}
          </code>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href={product.primary.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-ivory px-4 py-2.5 text-sm font-medium text-carbon transition-colors hover:bg-white"
          >
            {product.primary.label}
          </a>
          {product.secondary && (
            <a
              href={product.secondary.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-ivory transition-colors hover:bg-white/5"
            >
              {product.secondary.label}
            </a>
          )}
        </div>
      </div>

      {(product.cells || product.cellKind) && (
        <div className="md:col-span-2">
          <ProductCell product={product} />
        </div>
      )}
    </article>
  );
}

export function Products() {
  return (
    <section id="products" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-5xl px-6 py-16 md:py-24">
        <SectionHead
          title="만들고 있는 것들"
          description="공시 데이터, Python 학습, 스프레드시트, 그리고 그 셋을 떠받치는 실행 런타임. 각 제품 아래 셀은 설명이 아니라 진짜입니다. 눌러 보세요. 전부 pyproc 이 브라우저에 띄운 하나의 Python 머신에서 돕니다."
        />
        <div className="mt-12 space-y-16 md:mt-14 md:space-y-24">
          {PRODUCTS.map((p, i) => (
            <ProductRow key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
