'use client';

import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { ErrorState, LoadingBlock, LoadingGrid } from '@/components/brand/states';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { BadgeMark } from './badge-mark';
import { useBadges, useProgress } from './hooks';
import { GoalBlock, StreakBlock } from './progress-card';
import { WeekStrip } from './week-strip';

/** "My progress": streak, this week and goal, then every badge (earned and not yet) and the rules in plain words. */
export function ProgressPage() {
  const { t, f, fill } = useI18n();
  const progress = useProgress();
  const badges = useBadges();
  const earned = badges.data?.filter((b) => b.earnedAt).length ?? 0;

  return (
    <>
      <PageTitle kicker={t.progress.kicker} title={t.progress.title} aside={<p className="max-w-sm text-sm text-muted-foreground">{t.progress.intro}</p>} />

      {progress.isPending ? (
        <LoadingBlock rows={1} height={220} />
      ) : progress.isError ? (
        <ErrorState error={progress.error} onRetry={() => void progress.refetch()} />
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <Panel aria-label={t.progress.streak}>
            <StreakBlock p={progress.data} />
          </Panel>
          <Panel aria-label={t.progress.weekLabel}>
            <span className="label-mono text-muted-foreground">{t.progress.weekLabel}</span>
            <WeekStrip progress={progress.data} />
            <GoalBlock p={progress.data} />
          </Panel>
        </div>
      )}

      <section aria-labelledby="badges" className="flex flex-col gap-4">
        <SectionHeader
          title={<span id="badges">{t.progress.badges}</span>}
          aside={badges.data && <span className="label-mono tabular-nums text-muted-foreground">{fill(t.progress.badgesCount, { a: f.number(earned), b: f.number(badges.data.length) })}</span>}
        />
        {badges.isPending ? (
          <LoadingGrid count={4} height={96} />
        ) : badges.isError ? (
          <ErrorState compact error={badges.error} onRetry={() => void badges.refetch()} />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
            {badges.data.map((b) => {
              const copy = t.progress.badge[b.id];
              return (
                <li key={b.id} className={cn('flex items-center gap-4 rounded-xl border border-border bg-card p-4', !b.earnedAt && 'bg-transparent')}>
                  <BadgeMark id={b.id} earned={!!b.earnedAt} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className={cn('font-medium', !b.earnedAt && 'text-muted-foreground')}>{copy.title}</span>
                    <span className="text-sm text-muted-foreground">{copy.body}</span>
                    <span className="text-xs text-muted-foreground">{b.earnedAt ? fill(t.progress.earnedOn, { d: f.dayMonth(b.earnedAt) }) : t.progress.locked}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">{t.progress.privateNote}</p>
      </section>

      <Panel aria-labelledby="rules" className="max-w-3xl">
        <SectionHeader size="sm" title={<span id="rules">{t.progress.rulesTitle}</span>} as="h3" />
        <ul className="flex list-disc flex-col gap-2 ps-5 text-sm text-muted-foreground">
          {t.progress.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
