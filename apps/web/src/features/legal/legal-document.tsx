'use client';

import { useI18n } from '@/lib/i18n/provider';

const anchor = (i: number) => `s${i + 1}`;
const num = (i: number) => String(i + 1).padStart(2, '0');

/** Shared layout for /privacy and /terms: numbered contents rail (sticky on desktop) + long-form sections. */
export function LegalDocument({ kind }: { kind: 'privacy' | 'terms' }) {
  const { t } = useI18n();
  const doc = t.legal[kind];
  return (
    <article className="mx-auto flex w-full max-w-[1360px] flex-col gap-12 px-4 sm:px-6 lg:px-10">
      <header className="flex max-w-3xl flex-col gap-5">
        <span className="label-mono text-muted-foreground">{doc.kicker}</span>
        <h1 className="font-display text-[clamp(44px,7vw,96px)] leading-[0.9] font-extrabold">{doc.title}</h1>
        <p className="text-lg text-soft-foreground">{doc.intro}</p>
        <p className="label-mono text-muted-foreground">
          {t.legal.updatedLabel} · {t.legal.updated}
        </p>
      </header>
      <div className="grid gap-12 lg:grid-cols-[minmax(200px,260px)_minmax(0,720px)] lg:gap-20">
        <nav aria-label={t.legal.contents} className="lg:sticky lg:top-8 lg:self-start">
          <span className="label-mono block pb-3 text-muted-foreground">{t.legal.contents}</span>
          <ol className="flex flex-col border-s border-border">
            {doc.sections.map((s, i) => (
              <li key={s.heading}>
                <a href={`#${anchor(i)}`} className="flex min-h-11 items-center gap-3 ps-4 text-sm text-soft-foreground no-underline hover:text-foreground">
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {num(i)}
                  </span>
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex flex-col gap-12">
          {doc.sections.map((s, i) => (
            <section key={s.heading} id={anchor(i)} aria-labelledby={`${anchor(i)}-h`} className="scroll-mt-8 flex flex-col gap-4 border-t border-border pt-6">
              <h2 id={`${anchor(i)}-h`} className="flex items-baseline gap-4 font-display text-[28px] leading-[1] font-extrabold">
                <span className="font-mono text-sm font-normal text-onair-fg" dir="ltr">
                  {num(i)}
                </span>
                {s.heading}
              </h2>
              {s.paragraphs?.map((p) => (
                <p key={p} className="leading-relaxed text-soft-foreground">
                  {p}
                </p>
              ))}
              {s.points && (
                <ul className="flex flex-col gap-3">
                  {s.points.map((p) => (
                    <li key={p} className="relative ps-5 leading-relaxed text-soft-foreground before:absolute before:start-0 before:top-[0.7em] before:size-1.5 before:rounded-full before:bg-sun">
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <p className="text-sm text-muted-foreground">
            <a href={`mailto:${t.legal.contact}`} className="link-sun" dir="ltr">
              {t.legal.contact}
            </a>
          </p>
        </div>
      </div>
    </article>
  );
}
