import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Every notice reaches Arabic readers in-app, in realtime and in push (`localizedText`), so each
 * `notifier.notify(...)` / `notifyRole(...)` call must carry `ar: { title, body }`.
 * This reads the source instead of running every service, so a new notice without Arabic fails
 * here as soon as it is written. It follows a notice built inline, in a local `const`, or by a
 * builder function (`this.welcome(day)`, `friendRewardNotice(...)`); a notice passed through as a
 * parameter is checked where its builder is called.
 */

const MODULES = join(import.meta.dir, '..', 'src', 'modules');

/** `path:line` of notices that are English-only by design. Keep it empty unless there is a real reason. */
const ALLOWLIST: string[] = [];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') && !path.endsWith('.test.ts') ? [path] : [];
  });
}

const OPEN: Record<string, string> = { '(': ')', '{': '}', '[': ']' };

/** Index of the bracket closing the one at `open`, skipping strings and template literals. */
function matching(src: string, open: number): number {
  const stack: string[] = [];
  let quote: string | null = null;
  for (let i = open; i < src.length; i++) {
    const ch = src[i]!;
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      else if (quote === '`' && ch === '$' && src[i + 1] === '{') {
        // A template expression: jump over it as one balanced group.
        i = matching(src, i + 1);
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (OPEN[ch]) stack.push(OPEN[ch]!);
    else if (ch === stack[stack.length - 1]) {
      stack.pop();
      if (!stack.length) return i;
    }
  }
  return src.length - 1;
}

/** Top-level comma-separated arguments of the call whose `(` is at `open`. */
function callArgs(src: string, open: number): string[] {
  const close = matching(src, open);
  const args: string[] = [];
  let start = open + 1;
  for (let i = open + 1; i < close; i++) {
    const ch = src[i]!;
    if (OPEN[ch] || ch === "'" || ch === '"' || ch === '`') {
      if (OPEN[ch]) i = matching(src, i);
      else {
        let j = i + 1;
        while (j < close && src[j] !== ch) j += src[j] === '\\' ? 2 : 1;
        i = j;
      }
    } else if (ch === ',') {
      args.push(src.slice(start, i).trim());
      start = i + 1;
    }
  }
  args.push(src.slice(start, close).trim());
  return args.filter(Boolean);
}

/** The body of function/method `name` in any module file. */
function builderBody(files: Map<string, string>, name: string): string | null {
  const def = new RegExp(`(?:function\\s+${name}|(?:^|\\s)(?:private\\s+|public\\s+|protected\\s+)?(?:async\\s+)?${name})\\s*(?:<[^>]*>)?\\(`, 'gm');
  for (const src of files.values()) {
    for (const m of src.matchAll(def)) {
      const paramsClose = matching(src, (m.index ?? 0) + m[0].length - 1);
      const rest = src.slice(paramsClose + 1).match(/^\s*(?::\s*[\w<>[\]|.'" ]+?)?\s*(=>)?\s*([{(])/);
      if (!rest) continue;
      const bodyOpen = paramsClose + 1 + rest[0].length - 1;
      return src.slice(bodyOpen, matching(src, bodyOpen) + 1);
    }
  }
  return null;
}

/** The object literal assigned to local `name` before `before`, or null when it is a parameter. */
function localObject(src: string, name: string, before: number): string | null {
  const re = new RegExp(`(?:const|let)\\s+${name}\\s*(?::[^=]+)?=\\s*`, 'g');
  let at: number | null = null;
  for (const m of src.slice(0, before).matchAll(re)) at = (m.index ?? 0) + m[0].length;
  if (at === null) return null;
  const end = src.indexOf(';', at);
  const brace = src.indexOf('{', at);
  if (brace === -1 || (end !== -1 && end < brace)) return src.slice(at, end);
  return src.slice(at, matching(src, brace) + 1);
}

/** Each notice object (`type:`) needs its own `ar:` block, so both arms of a ternary are covered. */
function hasArabic(notice: string): boolean {
  const notices = notice.match(/\btype\s*:/g)?.length ?? 0;
  const ars = notice.match(/\bar\s*:/g)?.length ?? 0;
  return ars > 0 && ars >= notices;
}

export function noticesWithoutArabic(): string[] {
  const files = new Map(sourceFiles(MODULES).map((f) => [f, readFileSync(f, 'utf8')]));
  const missing: string[] = [];
  for (const [file, src] of files) {
    for (const m of src.matchAll(/\.notify(?:Role)?\(/g)) {
      const open = (m.index ?? 0) + m[0].length - 1;
      const noticeArg = callArgs(src, open)[1] ?? '';
      let notice: string | null = noticeArg;
      const builder = noticeArg.match(/^(?:this\.)?(\w+)\(/);
      if (builder) notice = builderBody(files, builder[1]!);
      else if (/^\w+$/.test(noticeArg)) {
        notice = localObject(src, noticeArg, open);
        if (notice === null) continue; // a parameter: forwarded from a caller that built it
      }
      if (notice && hasArabic(notice)) continue;
      const where = `${relative(MODULES, file)}:${src.slice(0, open).split('\n').length}`;
      if (!ALLOWLIST.includes(where)) missing.push(where);
    }
  }
  return missing;
}

describe('notices in Arabic', () => {
  test('every notify/notifyRole call carries an Arabic title and body', () => {
    expect(noticesWithoutArabic()).toEqual([]);
  });

  test('the scan sees the notices it is meant to check', () => {
    // Guards the scanner itself: if a refactor hid every call from it, the test above would pass vacuously.
    const calls = [...new Map(sourceFiles(MODULES).map((f) => [f, readFileSync(f, 'utf8')])).values()]
      .reduce((n, src) => n + (src.match(/\.notify(?:Role)?\(/g)?.length ?? 0), 0);
    expect(calls).toBeGreaterThan(40);
  });
});
