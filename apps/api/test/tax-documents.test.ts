import { describe, expect, test } from 'bun:test';
import { contactSettingsInput } from '@azza/shared';
import { creditNoteAmounts, taxDocumentNumber, vatPercentOf } from '../src/modules/invoices/tax-document-math';

describe('tax document rules', () => {
  test('numbers per series, without gaps in the format', () => {
    expect(taxDocumentNumber('INVOICE', 123)).toBe('INV-000123');
    expect(taxDocumentNumber('CREDIT_NOTE', 7)).toBe('CN-000007');
  });

  test('the VAT rate comes from the document amounts', () => {
    expect(vatPercentOf(88_000, 4_400)).toBe(5);
    expect(vatPercentOf(0, 0)).toBe(0);
  });

  test('credit notes carry their share of VAT and add up to the invoice exactly', () => {
    const invoice = { totalFils: 92_401, vatFils: 4_400 };
    const first = creditNoteAmounts(invoice, { totalFils: 0, vatFils: 0 }, 30_000);
    expect(first).toEqual({ totalFils: 30_000, vatFils: 1_429, subtotalFils: 28_571 });
    const rest = creditNoteAmounts(invoice, first, 999_999);
    expect(rest.totalFils).toBe(62_401);
    expect(first.vatFils + rest.vatFils).toBe(4_400);
  });

  test('a TRN has 15 digits; an empty value clears it', () => {
    expect(contactSettingsInput.safeParse({ taxRegistrationNumber: '100123456700003' }).success).toBe(true);
    expect(contactSettingsInput.safeParse({ taxRegistrationNumber: '12345' }).success).toBe(false);
    expect(contactSettingsInput.parse({ taxRegistrationNumber: '' })).toEqual({ taxRegistrationNumber: null });
  });
});
