'use client';

/**
 * Display-currency layer. Money only moves in AED (fils); SAR/QAR/USD are computed estimates
 * prefixed with "≈" (pay-00-system). Never send display amounts to the API.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BASE_CURRENCY, DISPLAY_CURRENCIES, convertFromAed, filsToAed, type DisplayCurrency } from '@azza/shared';
import { checkoutApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';

const CURRENCY_KEY = 'azza_currency';

interface MoneyValue {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
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
      if (saved && (DISPLAY_CURRENCIES as readonly string[]).includes(saved)) setCurrencyState(saved);
    } catch {
      /* storage blocked */
    }
  }, []);

  const fx = useQuery({ queryKey: qk.fxRates, queryFn: checkoutApi.fxRates, staleTime: 60 * 60 * 1000, retry: 1 });
  const rates = useMemo<Partial<Record<DisplayCurrency, number>>>(
    () => ({ AED: 1, ...(fx.data?.rates ?? {}) }),
    [fx.data],
  );

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
      const rate = rates[cur];
      if (cur === BASE_CURRENCY || rate === undefined) {
        const amount = filsToAed(fils);
        return `AED ${f.number(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      const amount = convertFromAed(fils, cur, rate);
      return `≈ ${cur} ${f.number(amount, { maximumFractionDigits: 0 })}`;
    };
    const effective: DisplayCurrency = rates[currency] === undefined ? 'AED' : currency;
    return {
      currency: effective,
      setCurrency,
      rates,
      ratesAvailable: !!fx.data,
      display: (fils) => formatIn(fils, effective),
      aed: (fils) => formatIn(fils, 'AED'),
      in: formatIn,
      rateOf: (c) => rates[c],
    };
  }, [currency, rates, setCurrency, f, fx.data]);

  return <MoneyContext value={value}>{children}</MoneyContext>;
}

export function useMoney(): MoneyValue {
  const ctx = useContext(MoneyContext);
  if (!ctx) throw new Error('useMoney must be used inside <MoneyProvider>');
  return ctx;
}
