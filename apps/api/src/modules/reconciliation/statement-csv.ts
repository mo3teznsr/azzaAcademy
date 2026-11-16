import type { StatementMapping } from '@azza/shared';
import { BusinessRuleError } from '../../core/errors';

/** One credit (money in) read from a bank statement. */
export interface ParsedStatementLine {
  /** 1-based row in the file, for the admin. */
  row: number;
  postedOn: Date;
  amountFils: number;
  description: string;
}

export interface ParsedStatement {
  headers: string[];
  mapping: StatementMapping;
  lines: ParsedStatementLine[];
  /** Rows skipped: debits, zero amounts, totals, unreadable dates or amounts. */
  skipped: number;
}

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
/** Arabic-Indic and Persian digits to ASCII. */
export const asciiDigits = (s: string) =>
  s.replace(ARABIC_DIGITS, (d) => String((d.charCodeAt(0) & 0xf) % 10));

/** RFC 4180 rows: quoted fields, doubled quotes, delimiters and line breaks inside quotes. Strips a UTF-8 BOM. */
export function parseCsvRows(text: string, delimiter = detectDelimiter(text)): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field.trim() === '') {
      field = '';
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((f) => f.trim())).filter((r) => r.some((f) => f !== ''));
}

/** The most frequent of `,` `;` tab outside quotes over the first lines. */
export function detectDelimiter(text: string): string {
  const sample = text.replace(/^﻿/, '').slice(0, 4000);
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (const ch of sample) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch]!++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0];
}

const norm = (h: string) => asciiDigits(h).toLowerCase().replace(/[\s_.\-:()/]+/g, ' ').trim();

const DATE_HEADERS = ['transaction date', 'txn date', 'trans date', 'posting date', 'post date', 'booking date', 'date', 'value date', 'تاريخ العملية', 'تاريخ المعاملة', 'تاريخ الحركة', 'تاريخ القيد', 'التاريخ', 'تاريخ'];
const CREDIT_HEADERS = ['credit', 'credit amount', 'credits', 'deposit', 'deposits', 'money in', 'paid in', 'cr', 'cr amount', 'دائن', 'المبلغ الدائن', 'إيداع', 'ايداع', 'الإيداعات', 'الايداعات'];
const AMOUNT_HEADERS = ['amount', 'transaction amount', 'amount aed', 'aed amount', 'المبلغ', 'مبلغ', 'قيمة العملية'];
const DESCRIPTION_HEADERS = ['description', 'transaction description', 'narrative', 'narration', 'details', 'transaction details', 'particulars', 'remarks', 'memo', 'reference', 'ref', 'customer reference', 'payment details', 'البيان', 'الوصف', 'التفاصيل', 'تفاصيل العملية', 'الملاحظات', 'المرجع', 'الرقم المرجعي'];

const pick = (headers: string[], aliases: string[]) => {
  const n = headers.map(norm);
  for (const a of aliases) {
    const i = n.indexOf(a);
    if (i >= 0) return headers[i]!;
  }
  return null;
};

/** A mapping from common English and Arabic headers, or null when the date or money column can't be found. */
export function detectMapping(headers: string[]): StatementMapping | null {
  const date = pick(headers, DATE_HEADERS);
  const credit = pick(headers, CREDIT_HEADERS);
  const amount = credit ? null : pick(headers, AMOUNT_HEADERS);
  const n = headers.map(norm);
  const description = headers.filter((_, i) => DESCRIPTION_HEADERS.includes(n[i]!));
  if (!date || (!credit && !amount) || !description.length) return null;
  return { date, credit, amount, description, dateFormat: 'DMY' };
}

/**
 * The header row: the first of the first 30 rows holding the mapping's date column (banks put account details above it),
 * or, with no mapping, the first row whose headers can be detected.
 */
export function findHeaderRow(rows: string[][], mapping?: StatementMapping | null): number {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const n = rows[i]!.map(norm);
    if (mapping ? n.includes(norm(mapping.date)) : detectMapping(rows[i]!)) return i;
  }
  return -1;
}

/**
 * Amount text to integer fils, without floating point: `1,234.50`, `AED 1,234.5`, `(250.00)`, `250.00-`, `250 CR`,
 * Arabic digits and separators (`١٬٢٣٤٫٥٠`). Null when unreadable or empty.
 */
export function parseAmountFils(raw: string): number | null {
  let s = asciiDigits(raw).replace(/٬/g, ',').replace(/٫/g, '.').trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/\bdr\b/i.test(s) || /-\s*$/.test(s) || /^\s*-/.test(s)) negative = true;
  s = s.replace(/aed|د\.?إ|dhs?|cr|dr/gi, '').replace(/[\s+\- ']/g, '');
  // European style `1.234,50`: a comma as the last separator with two digits after it.
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s) || /^\d+,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const m = /^(\d+)(?:\.(\d{0,3}))?$/.exec(s);
  if (!m) return null;
  const frac = (m[2] ?? '').padEnd(2, '0');
  // Three decimals round half up to fils.
  let fils = Number(m[1]) * 100 + Number(frac.slice(0, 2));
  if (frac.length === 3 && Number(frac[2]) >= 5) fils += 1;
  return negative ? -fils : fils;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** Date text to a UTC midnight. dd/mm/yyyy by default (UAE banks); also yyyy-mm-dd, 15-Nov-2026, two-digit years, a trailing time. */
export function parseStatementDate(raw: string, format: StatementMapping['dateFormat'] = 'DMY'): Date | null {
  const s = asciiDigits(raw).trim().split(/[ T]+(?=\d{1,2}:)/)[0]!.trim();
  const year = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));
  const make = (y: number, mo: number, d: number) => {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const date = new Date(Date.UTC(y, mo - 1, d));
    return date.getUTCDate() === d ? date : null;
  };
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (m) return make(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[-/. ]([A-Za-z]{3,})[-/. ,]+(\d{2,4})$/.exec(s);
  if (m) {
    const mo = MONTHS[m[2]!.slice(0, 3).toLowerCase()];
    return mo ? make(year(m[3]!), mo, Number(m[1])) : null;
  }
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(s);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return format === 'MDY' ? make(year(m[3]!), a, b) : make(year(m[3]!), b, a);
  }
  return null;
}

/** Reads the statement's credits. Throws when the mapping's columns aren't in the file. */
export function parseStatement(csv: string, given?: StatementMapping | null): ParsedStatement {
  const rows = parseCsvRows(csv);
  const headerAt = findHeaderRow(rows, given);
  if (headerAt < 0) {
    throw new BusinessRuleError(
      given ? `Column "${given.date}" was not found in this file` : 'Could not recognise the columns; map them first',
      given ? 'STATEMENT_COLUMNS_MISSING' : 'STATEMENT_MAPPING_REQUIRED',
    );
  }
  const headers = rows[headerAt]!;
  const mapping = given ?? detectMapping(headers)!;
  const col = (name: string) => headers.findIndex((h) => norm(h) === norm(name));
  const dateI = col(mapping.date);
  const moneyI = col((mapping.credit ?? mapping.amount)!);
  const descI = mapping.description.map(col);
  const missing = [mapping.date, (mapping.credit ?? mapping.amount)!, ...mapping.description].filter((name) => col(name) < 0);
  if (missing.length) throw new BusinessRuleError(`Columns not found: ${missing.join(', ')}`, 'STATEMENT_COLUMNS_MISSING', { missing });

  const lines: ParsedStatementLine[] = [];
  let skipped = 0;
  for (let r = headerAt + 1; r < rows.length; r++) {
    const row = rows[r]!;
    const postedOn = parseStatementDate(row[dateI] ?? '', mapping.dateFormat);
    const amountFils = parseAmountFils(row[moneyI] ?? '');
    if (!postedOn || amountFils == null || amountFils <= 0) {
      skipped++;
      continue;
    }
    const description = descI
      .map((i) => row[i] ?? '')
      .filter(Boolean)
      .join(' | ');
    lines.push({ row: r + 1, postedOn, amountFils, description });
  }
  return { headers, mapping, lines, skipped };
}

/** Headers, a detected mapping and a few rows, for the admin to map columns before importing. */
export function previewStatement(csv: string, saved?: StatementMapping | null) {
  const rows = parseCsvRows(csv);
  let headerAt = saved ? findHeaderRow(rows, saved) : -1;
  const usable = headerAt >= 0;
  if (!usable) headerAt = findHeaderRow(rows);
  if (headerAt < 0) headerAt = 0;
  const headers = rows[headerAt] ?? [];
  return {
    headers,
    mapping: usable ? saved! : detectMapping(headers),
    savedMappingFits: usable,
    sample: rows.slice(headerAt + 1, headerAt + 6),
  };
}
