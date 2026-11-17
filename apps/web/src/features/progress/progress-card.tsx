'use client';

import { Button } from '@/components/ui/button';
import { Panel, SectionHeader } from '@/components/brand/section';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import type { LearnerProgress } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { BadgeMark } from './badge-mark';
import { GoalDialog } from './goal-dialog';
import { useProgress } from './hooks';
import { GoalMeter, WeekStrip } from './week-strip';

/** Student home: streak, this week, the weekly goal and the latest badges, in one calm card. */
export function ProgressCard() {
  const { t } = useI18n();
  const q = useProgress();
  if (q.isPending) return <LoadingBlock rows={1} height={180} />;
  if (q.isError) return <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />;
  const p = q.data;
  return (
    <Panel aria-labelledby="progress-card">
      <SectionHeader title={<span id="progress-card">{t.progress.cardTitle}</span>} href="/progress" linkLabel={t.progress.viewAll} />
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] md:gap-8">
        <StreakBlock p={p} />
        <div className="flex flex-col gap-4">
          <WeekStrip progress={p} />
          <GoalBlock p={p} />
        </div>
        <LatestBadges p={p} />
      </div>
    </Panel>
  );
}

export function StreakBlock({ p }: { p: LearnerProgress }) {
  const { t, f, fill } = useI18n();
  const s = p.streak;
  const hint = s.current === 0 ? t.progress.startStreak : s.todayDone ? t.progress.todayDone : t.progress.todayPending;
  return (
    <div className="flex flex-col gap-2">
      <span className="label-mono text-muted-foreground">{t.progress.streak}</span>
      <span className="font-display text-[40px] font-extrabold leading-none">{f.plural(s.current, t.progress.streakDays)}</span>
      <span className="text-sm text-muted-foreground">{hint}</span>
      <span className="text-xs text-muted-foreground">
        {fill(t.progress.best, { d: f.plural(s.best, t.progress.streakDays) })}
        {s.current > 0 && <> · {s.freezeAvailable ? t.progress.freezeAvailable : t.progress.freezeUsed}</>}
      </span>
    </div>
  );
}

export function GoalBlock({ p }: { p: LearnerProgress }) {
  const { t, f, fill } = useI18n();
  const g = p.goal;
  if (!g) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{t.progress.noGoal}</span>
        <GoalDialog goal={null} trigger={<Button size="sm" variant="outline">{t.progress.setGoal}</Button>} />
      </div>
    );
  }
  const label = fill(g.unit === 'DAYS' ? t.progress.goalDays : t.progress.goalLessons, { a: f.number(Math.min(g.progress, g.target)), b: f.number(g.target) });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">
          {t.progress.goal} · <span className="tabular-nums">{label}</span>
        </span>
        <GoalDialog goal={g} trigger={<button type="button" className="link-sun text-xs">{t.progress.editGoal}</button>} />
      </div>
      <GoalMeter progress={g.progress} target={g.target} label={label} />
      {g.met && <span className="text-xs text-muted-foreground">{t.progress.goalMet}</span>}
    </div>
  );
}

function LatestBadges({ p }: { p: LearnerProgress }) {
  const { t, fill, f } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label-mono text-muted-foreground">{t.progress.latestBadges}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{fill(t.progress.badgesCount, { a: f.number(p.badgeCount.earned), b: f.number(p.badgeCount.total) })}</span>
      </div>
      {p.latestBadges.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.progress.noBadges}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {p.latestBadges.map((b) => (
            <li key={b.id} className="flex items-center gap-3">
              <BadgeMark id={b.id} earned size="sm" />
              <span className="text-sm font-medium">{t.progress.badge[b.id].title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
