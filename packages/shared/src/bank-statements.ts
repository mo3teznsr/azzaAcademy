import { z } from 'zod';

/**
 * How one bank's CSV export maps to statement lines. Columns are named by their header text, so the mapping
 * survives reordered columns. Saved on the bank account the first time an admin imports its statement.
 */
export const statementMapping = z
  .object({
    date: z.string().min(1),
    /** Credits column (money in). Use this or `amount`. */
    credit: z.string().min(1).nullish(),
    /** A single signed amount column: positive values are credits. */
    amount: z.string().min(1).nullish(),
    /** One or more columns joined into the text searched for a reference (description, narrative, reference...). */
    description: z.array(z.string().min(1)).min(1),
    dateFormat: z.enum(['DMY', 'MDY', 'YMD']).default('DMY'),
  })
  .refine((m) => !!m.credit || !!m.amount, { message: 'Pick a credit or an amount column', path: ['credit'] });
export type StatementMapping = z.infer<typeof statementMapping>;

const csvText = z.string().min(1).max(5_000_000);

export const statementPreviewInput = z.object({ bankAccountId: z.string().min(1), csv: csvText });

export const statementImportInput = z.object({
  bankAccountId: z.string().min(1),
  fileName: z.string().min(1).max(200),
  csv: csvText,
  /** Given: used and saved on the bank account. Left out: the account's saved mapping, else detected headers. */
  mapping: statementMapping.optional(),
});
export type StatementImportInput = z.infer<typeof statementImportInput>;

export const statementLineConfirmInput = z.object({
  /** Left out: the proposed match. Given: the transfer the admin picked. */
  target: z.object({ kind: z.enum(['SEAT', 'PLAN']), id: z.string().min(1) }).optional(),
});
export type StatementLineConfirmInput = z.infer<typeof statementLineConfirmInput>;

export const STATEMENT_MATCH_KINDS = ['EXACT', 'AMOUNT_DIFFERS', 'SUGGESTED', 'UNMATCHED', 'DUPLICATE'] as const;
export type StatementMatchKind = (typeof STATEMENT_MATCH_KINDS)[number];
export const STATEMENT_LINE_STATUSES = ['OPEN', 'CONFIRMED', 'IGNORED'] as const;
export type StatementLineStatus = (typeof STATEMENT_LINE_STATUSES)[number];
