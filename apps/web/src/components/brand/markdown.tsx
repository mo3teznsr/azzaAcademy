import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A small, safe markdown renderer for lesson text. It builds React elements (never HTML strings), so nothing in the
 * source can inject markup or scripts. Supported: `#`–`###` headings, paragraphs, `-`/`*` and `1.` lists, `>` quotes,
 * fenced code, `---` rules, **bold**, *italic*, `code` and [links](https://…) (http, https and mailto only).
 */
export function Markdown({ source, className, dir }: { source: string; className?: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div dir={dir} className={cn('flex flex-col gap-4 text-[15px] leading-[1.7]', className)}>
      {blocks(source.replace(/\r\n?/g, '\n'))}
    </div>
  );
}

const SAFE_URL = /^(https?:\/\/|mailto:)/i;

function blocks(src: string): ReactNode[] {
  const lines = src.split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  const key = () => `b${out.length}`;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) body.push(lines[i++]!);
      i++;
      out.push(
        <pre key={key()} dir="ltr" className="overflow-x-auto rounded-2xl bg-muted p-4 font-mono text-[13px] leading-6">
          <code>{body.join('\n')}</code>
        </pre>,
      );
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      const cls = level === 1 ? 'font-display text-2xl font-extrabold' : level === 2 ? 'font-display text-xl font-bold' : 'text-base font-bold';
      const Tag = (['h2', 'h3', 'h4'] as const)[level - 1]!;
      out.push(
        <Tag key={key()} className={cn(cls, 'mt-2')}>
          {inline(heading[2]!)}
        </Tag>,
      );
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push(<hr key={key()} className="border-border" />);
      i++;
      continue;
    }
    if (line.startsWith('>')) {
      const body: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('>')) body.push(lines[i++]!.replace(/^>\s?/, ''));
      out.push(
        <blockquote key={key()} className="border-s-4 border-green ps-4 text-muted-foreground">
          {inline(body.join(' '))}
        </blockquote>,
      );
      continue;
    }
    const bullet = /^\s*[-*]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const marker = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && marker.test(lines[i]!)) items.push(lines[i++]!.replace(marker, ''));
      const List = ordered ? 'ol' : 'ul';
      out.push(
        <List key={key()} className={cn('flex flex-col gap-1.5 ps-6', ordered ? 'list-decimal' : 'list-disc')}>
          {items.map((it, n) => (
            <li key={n}>{inline(it)}</li>
          ))}
        </List>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,3}\s|```|>|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i]!)) para.push(lines[i++]!);
    out.push(<p key={key()}>{inline(para.join(' '))}</p>);
  }
  return out;
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(\[[^\]]+\]\([^)\s]+\))/;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let n = 0;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const token = m[0];
    const k = `i${n++}`;
    if (m[1]) {
      out.push(
        <code key={k} dir="ltr" className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (m[2]) {
      out.push(<strong key={k}>{inline(token.slice(2, -2))}</strong>);
    } else if (m[3]) {
      out.push(<em key={k}>{inline(token.slice(1, -1))}</em>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)!;
      const href = link[2]!;
      out.push(
        SAFE_URL.test(href) ? (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer nofollow" className="link-sun underline underline-offset-2">
            {inline(link[1]!)}
          </a>
        ) : (
          <Fragment key={k}>{link[1]}</Fragment>
        ),
      );
    }
    rest = rest.slice(m.index + token.length);
  }
  return out;
}
