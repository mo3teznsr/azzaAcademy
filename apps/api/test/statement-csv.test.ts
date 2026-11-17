import { describe, expect, test } from 'bun:test';
import { detectMapping, parseAmountFils, parseCsvRows, parseStatement, parseStatementDate, previewStatement } from '../src/modules/reconciliation/statement-csv';

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe('CSV rows', () => {
  test('quoted fields keep commas, doubled quotes and line breaks', () => {
    const rows = parseCsvRows('a,b,c\r\n"1,234.50","say ""hi""","two\nlines"\n');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1,234.50', 'say "hi"', 'two\nlines'],
    ]);
  });

  test('semicolon and tab files, BOM stripped, blank rows dropped', () => {
    expect(parseCsvRows('﻿Date;Amount\n\n01/11/2026;10,50\n')).toEqual([
      ['Date', 'Amount'],
      ['01/11/2026', '10,50'],
    ]);
    expect(parseCsvRows('Date\tCredit\n01/11/2026\t5')[1]).toEqual(['01/11/2026', '5']);
  });
});

describe('amounts', () => {
  test.each([
    ['1,234.50', 123_450],
    ['AED 924.00', 92_400],
    ['924', 92_400],
    ['924.5', 92_450],
    ['1.234,50', 123_450],
    ['(250.00)', -25_000],
    ['250.00-', -25_000],
    ['250.00 DR', -25_000],
    ['250.00 CR', 25_000],
    ['١٬٢٣٤٫٥٠', 123_450],
    ['10.005', 1_001],
  ])('%s', (raw, fils) => expect(parseAmountFils(raw)).toBe(fils));

  test('empty or text is null', () => {
    expect(parseAmountFils('')).toBeNull();
    expect(parseAmountFils('n/a')).toBeNull();
  });
});

describe('dates', () => {
  test('dd/mm/yyyy by default, other layouts too', () => {
    expect(parseStatementDate('03/11/2026')).toEqual(d('2026-11-03'));
    expect(parseStatementDate('3-11-26')).toEqual(d('2026-11-03'));
    expect(parseStatementDate('2026-11-03')).toEqual(d('2026-11-03'));
    expect(parseStatementDate('03-Nov-2026')).toEqual(d('2026-11-03'));
    expect(parseStatementDate('3 November 2026')).toEqual(d('2026-11-03'));
    expect(parseStatementDate('03/11/2026 14:22:01')).toEqual(d('2026-11-03'));
    expect(parseStatementDate('٠٣/١١/٢٠٢٦')).toEqual(d('2026-11-03'));
    expect(parseStatementDate('11/03/2026', 'MDY')).toEqual(d('2026-11-03'));
  });

  test('impossible dates are null', () => {
    expect(parseStatementDate('31/02/2026')).toBeNull();
    expect(parseStatementDate('Opening balance')).toBeNull();
  });
});

describe('statements', () => {
  test('English layout with debit and credit columns and a preamble', () => {
    const csv = [
      'Account Statement,,,,',
      'Account,AE070331234567890123456,,,',
      'Transaction Date,Value Date,Description,Debit,Credit,Balance',
      '02/11/2026,02/11/2026,"IPI TRF FROM SARA AHMED REF AZ-B08-48213",,"924.00","10,924.00"',
      '02/11/2026,02/11/2026,DEWA BILL,350.00,,"10,574.00"',
      '03/11/2026,03/11/2026,"Transfer, ref az b08 51234","1,000.00",,',
      '04/11/2026,04/11/2026,"Inward, ref REC-20001","1,499.00",',
    ].join('\n');
    const s = parseStatement(csv);
    expect(s.mapping).toMatchObject({ date: 'Transaction Date', credit: 'Credit', description: ['Description'] });
    expect(s.lines).toHaveLength(1);
    expect(s.lines[0]).toEqual({ row: 4, postedOn: d('2026-11-02'), amountFils: 92_400, description: 'IPI TRF FROM SARA AHMED REF AZ-B08-48213' });
    expect(s.skipped).toBe(3);
  });

  test('Arabic headers and text, signed amount column', () => {
    const csv = ['التاريخ,البيان,المبلغ,الرصيد', '05/11/2026,"تحويل من محمد علي، المرجع AZ-B08-77777","1,234.50",9000', '06/11/2026,رسوم,-25.00,8975'].join('\n');
    const s = parseStatement(csv);
    expect(s.mapping).toMatchObject({ date: 'التاريخ', amount: 'المبلغ', description: ['البيان'] });
    expect(s.lines).toEqual([{ row: 2, postedOn: d('2026-11-05'), amountFils: 123_450, description: 'تحويل من محمد علي، المرجع AZ-B08-77777' }]);
  });

  test('a saved mapping reads a layout no header list knows, joining two text columns', () => {
    const csv = ['Posted|Txn Text|Cust Ref|In|Out'.replaceAll('|', ';'), '2026-11-07;INWARD;AZ-REC-55555;499,00;'].join('\n');
    expect(detectMapping(csv.split('\n')[0]!.split(';'))).toBeNull();
    const s = parseStatement(csv, { date: 'Posted', credit: 'In', description: ['Txn Text', 'Cust Ref'], dateFormat: 'YMD' });
    expect(s.lines).toEqual([{ row: 2, postedOn: d('2026-11-07'), amountFils: 49_900, description: 'INWARD | AZ-REC-55555' }]);
  });

  test('unknown layout without a mapping, or a mapping whose columns are gone, is refused', () => {
    expect(() => parseStatement('foo,bar\n1,2')).toThrow(expect.objectContaining({ code: 'STATEMENT_MAPPING_REQUIRED' }));
    expect(() => parseStatement('Date,Credit,Narrative\n01/11/2026,5,x', { date: 'Date', credit: 'Credit', description: ['Details'], dateFormat: 'DMY' })).toThrow(
      expect.objectContaining({ code: 'STATEMENT_COLUMNS_MISSING' }),
    );
  });

  test('preview finds headers and samples', () => {
    const p = previewStatement('x,y\nDate,Narrative,Credit\n01/11/2026,a,5\n');
    expect(p.headers).toEqual(['Date', 'Narrative', 'Credit']);
    expect(p.mapping).toMatchObject({ date: 'Date', credit: 'Credit', description: ['Narrative'] });
    expect(p.sample).toEqual([['01/11/2026', 'a', '5']]);
  });
});
