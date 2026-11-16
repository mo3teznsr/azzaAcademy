/** Pure growth metrics for the admin dashboard. Money is fils of AED before VAT, as plan prices are stored. */

const DAY = 86_400_000;
const LIVE = new Set(['ACTIVE', 'CANCELLING', 'PAST_DUE']);

export interface PlanRow {
  plan: 'MONTHLY' | 'YEARLY';
  priceFils: number;
  status: string;
  createdAt: Date;
  currentPeriodEnd: Date | null;
}

/** Monthly recurring revenue: every live plan's price as a monthly amount (a yearly plan counts a twelfth). */
export function mrrFils(plans: PlanRow[]): number {
  return Math.round(plans.filter((p) => LIVE.has(p.status)).reduce((sum, p) => sum + (p.plan === 'YEARLY' ? p.priceFils / 12 : p.priceFils), 0));
}

export function livePlanCount(plans: PlanRow[]): number {
  return plans.filter((p) => LIVE.has(p.status)).length;
}

/**
 * Plan churn over [from, to): plans that had started before `from` and were still running then, and the share of them
 * that ended (EXPIRED with their last period ending inside the window). Null when there was nothing to churn.
 */
export function planChurn(plans: PlanRow[], from: Date, to: Date): { atStart: number; ended: number; rate: number | null } {
  const started = plans.filter((p) => p.status !== 'INCOMPLETE' && p.createdAt < from);
  const atStart = started.filter((p) => LIVE.has(p.status) || (p.currentPeriodEnd !== null && p.currentPeriodEnd >= from));
  const ended = atStart.filter((p) => p.status === 'EXPIRED' && p.currentPeriodEnd !== null && p.currentPeriodEnd >= from && p.currentPeriodEnd < to);
  return { atStart: atStart.length, ended: ended.length, rate: atStart.length ? ended.length / atStart.length : null };
}

export interface Purchase {
  userId: string;
  at: Date;
}

/** Each customer's purchases, oldest first. */
function byCustomer(purchases: Purchase[]): Map<string, Date[]> {
  const out = new Map<string, Date[]>();
  for (const p of purchases) out.set(p.userId, [...(out.get(p.userId) ?? []), p.at]);
  for (const list of out.values()) list.sort((a, b) => a.getTime() - b.getTime());
  return out;
}

/**
 * Second purchase within `days` of the first, among customers whose first purchase is at least `days` old (so each has
 * had the full window). Null when no customer qualifies yet.
 */
export function repeatPurchase(purchases: Purchase[], now: Date, days = 90): { eligible: number; repeated: number; rate: number | null } {
  const window = days * DAY;
  let eligible = 0;
  let repeated = 0;
  for (const list of byCustomer(purchases).values()) {
    const first = list[0]!;
    if (now.getTime() - first.getTime() < window) continue;
    eligible++;
    if (list.some((d, i) => i > 0 && d.getTime() - first.getTime() <= window)) repeated++;
  }
  return { eligible, repeated, rate: eligible ? repeated / eligible : null };
}

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/**
 * Customers grouped by the month of their first purchase (the last `months` months, oldest first), with how many bought
 * again in a later month. Retention by cohort, in purchases rather than logins.
 */
export function cohorts(purchases: Purchase[], now: Date, months = 6): Array<{ month: string; customers: number; returned: number; rate: number | null }> {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) keys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  const rows = new Map(keys.map((k) => [k, { customers: 0, returned: 0 }]));
  for (const list of byCustomer(purchases).values()) {
    const key = monthKey(list[0]!);
    const row = rows.get(key);
    if (!row) continue;
    row.customers++;
    if (list.some((d) => monthKey(d) > key)) row.returned++;
  }
  return keys.map((month) => {
    const r = rows.get(month)!;
    return { month, ...r, rate: r.customers ? r.returned / r.customers : null };
  });
}

/** Teacher earnings in a period, largest first, with each one's share and the share of the top five (concentration risk). */
export function teacherShares(rows: Array<{ teacherId: string; name: string; amountFils: number }>): {
  totalFils: number;
  topFiveShare: number | null;
  teachers: Array<{ teacherId: string; name: string; amountFils: number; share: number }>;
} {
  const sums = new Map<string, { teacherId: string; name: string; amountFils: number }>();
  for (const r of rows) {
    const cur = sums.get(r.teacherId) ?? { teacherId: r.teacherId, name: r.name, amountFils: 0 };
    cur.amountFils += r.amountFils;
    sums.set(r.teacherId, cur);
  }
  const list = [...sums.values()].filter((t) => t.amountFils > 0).sort((a, b) => b.amountFils - a.amountFils);
  const totalFils = list.reduce((s, t) => s + t.amountFils, 0);
  return {
    totalFils,
    topFiveShare: totalFils ? list.slice(0, 5).reduce((s, t) => s + t.amountFils, 0) / totalFils : null,
    teachers: list.map((t) => ({ ...t, share: totalFils ? t.amountFils / totalFils : 0 })),
  };
}

/** Sign-ups by first-touch source: `utm_source`, else the referring site's host, else "direct". Largest first. */
export function signupSources(acquisitions: Array<string | null>): Array<{ source: string; signups: number }> {
  const counts = new Map<string, number>();
  for (const raw of acquisitions) {
    let source = 'direct';
    try {
      const a = raw ? (JSON.parse(raw) as Record<string, string>) : null;
      if (a?.utm_source) source = a.utm_source.toLowerCase();
      else if (a?.referrer) source = new URL(a.referrer).hostname.replace(/^www\./, '');
    } catch {
      // unreadable: counted as direct
    }
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return [...counts.entries()].map(([source, signups]) => ({ source, signups })).sort((a, b) => b.signups - a.signups);
}
