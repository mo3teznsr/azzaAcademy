'use client';

/**
 * Display-currency layer. Money only moves in AED (fils); SAR/QAR/USD are computed estimates
 * prefixed with "≈" (pay-00-system). Never send display amounts to the API.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { filsToAed } from '@azza/shared';
import { checkoutApi, type Currency } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';

const CURRENCY_KEY = 'azza_currency';
const BASE = 'AED';
type DisplayCurrency = string;

/** The base currency, shown before the list loads or when the list can't be read. */
const AED_ONLY: Currency = { code: BASE, nameEn: 'UAE dirham', nameAr: 'درهم إماراتي', symbol: null, decimals: 2, ratePerAed: 1, sortOrder: 0 };

interface MoneyValue {
  /** Currency actually used for display (falls back to AED when its rate is missing). */
  currency: DisplayCurrency;
  /** Currency the person picked in the switcher, even when it can't be shown. */
  chosen: DisplayCurrency;
  /** The pick isn't AED but its rate failed to load, so amounts show in AED. */
  rateMissing: boolean;
  setCurrency: (c: DisplayCurrency) => void;
  /** Enabled currencies from GET /currencies, AED first when listed. */
  currencies: Currency[];
  rates: Partial<Record<DisplayCurrency, number>>;
  ratesAvailable: boolean;
  /** Formats in the chosen display currency (≈ for non-AED). */
  display: (fils: number) => string;
  /** Always AED, 2 decimals. */
  aed: (fils: number) => string;
  /** Formats in an explicit currency. */
  in: (fils: number, currency: DisplayCurrency) => string;
  rateOf: (c: DisplayCurrency) => number | undefined;
}

const MoneyContext = createContext<MoneyValue | null>(null);

export function MoneyProvider({ children }: { children: ReactNode }) {
  const { f } = useI18n();
  const [currency, setCurrencyState] = useState<DisplayCurrency>('AED');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_KEY) as DisplayCurrency | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted preference after mount
      if (saved) setCurrencyState(saved);
    } catch {
      /* storage blocked */
    }
  }, []);

  const fx = useQuery({ queryKey: qk.currencies, queryFn: checkoutApi.currencies, staleTime: 60 * 60 * 1000, retry: 1 });
  const currencies = useMemo<Currency[]>(() => {
    const items = [...(fx.data?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    return items.some((c) => c.code === BASE) ? items : [AED_ONLY, ...items];
  }, [fx.data]);
  const byCode = useMemo(() => new Map(currencies.map((c) => [c.code, c])), [currencies]);
  const rates = useMemo<Partial<Record<DisplayCurrency, number>>>(() => Object.fromEntries(currencies.map((c) => [c.code, c.ratePerAed])), [currencies]);

  const setCurrency = useCallback((c: DisplayCurrency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(CURRENCY_KEY, c);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<MoneyValue>(() => {
    const formatIn = (fils: number, cur: DisplayCurrency) => {
      const def = byCode.get(cur);
      if (cur === BASE || !def) {
        const amount = filsToAed(fils);
        return `AED ${f.number(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      // Each currency says how many decimals it shows (JPY 0, KWD 3).
      const amount = filsToAed(fils) * def.ratePerAed;
      return `≈ ${cur} ${f.number(amount, { minimumFractionDigits: def.decimals, maximumFractionDigits: def.decimals })}`;
    };
    // A stored or saved currency that is no longer listed falls back to AED.
    const listed = byCode.has(currency);
    const effective: DisplayCurrency = listed ? currency : 'AED';
    return {
      currency: effective,
      chosen: effective,
      // Only a failed load counts as "rates missing"; a removed currency quietly becomes AED.
      rateMissing: fx.isError && currency !== BASE,
      setCurrency,
      currencies,
      rates,
      ratesAvailable: !!fx.data,
      display: (fils) => formatIn(fils, effective),
      aed: (fils) => formatIn(fils, 'AED'),
      in: formatIn,
      rateOf: (c) => rates[c],
    };
  }, [currency, currencies, byCode, rates, setCurrency, f, fx.data, fx.isError]);

  return <MoneyContext value={value}>{children}</MoneyContext>;
}

export function useMoney(): MoneyValue {
  const ctx = useContext(MoneyContext);
  if (!ctx) throw new Error('useMoney must be used inside <MoneyProvider>');
  return ctx;
}
