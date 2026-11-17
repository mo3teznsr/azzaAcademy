'use client';

import { useId, useState, type ReactNode } from 'react';
import { LEARNING_GOAL_TARGETS, type LearningGoalUnit } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { LearnerProgress } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { useGoalMutation } from './hooks';

/** Pick or change the weekly goal (2, 3 or 5 learning days or lessons) and the late-week reminder. */
export function GoalDialog({ goal, trigger }: { goal: LearnerProgress['goal']; trigger: ReactNode }) {
  const { t, f } = useI18n();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<LearningGoalUnit>(goal?.unit ?? 'DAYS');
  const [target, setTarget] = useState<number>(goal?.target ?? 3);
  const [reminders, setReminders] = useState(goal?.reminders ?? true);
  const save = useGoalMutation();
  const targets: number[] = [...LEARNING_GOAL_TARGETS];
  if (!targets.includes(target)) targets.push(target); // keep a custom target set elsewhere

  const onOpenChange = (o: boolean) => {
    if (o) {
      setUnit(goal?.unit ?? 'DAYS');
      setTarget(goal?.target ?? 3);
      setReminders(goal?.reminders ?? true);
    }
    setOpen(o);
  };
  const submit = (input: Parameters<typeof save.mutate>[0]) => save.mutate(input, { onSuccess: () => setOpen(false) });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t.progress.goalDialogTitle}</DialogTitle>
          <DialogDescription>{t.progress.goalDialogBody}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span id={`${id}-unit`} className="text-sm font-medium">{t.progress.unitLabel}</span>
            <ToggleGroup type="single" variant="outline" value={unit} onValueChange={(v) => v && setUnit(v as LearningGoalUnit)} aria-labelledby={`${id}-unit`} className="flex justify-start gap-2">
              <ToggleGroupItem value="DAYS">{t.progress.unitDays}</ToggleGroupItem>
              <ToggleGroupItem value="LESSONS">{t.progress.unitLessons}</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-2">
            <span id={`${id}-target`} className="text-sm font-medium">{t.progress.targetLabel}</span>
            <ToggleGroup type="single" variant="outline" value={String(target)} onValueChange={(v) => v && setTarget(Number(v))} aria-labelledby={`${id}-target`} className="flex justify-start gap-2">
              {targets.map((n) => (
                <ToggleGroupItem key={n} value={String(n)} className="min-w-12 tabular-nums">
                  {f.number(n)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-reminders`}>{t.progress.remindersLabel}</Label>
              <span className="text-xs text-muted-foreground">{t.progress.remindersHint}</span>
            </div>
            <Switch id={`${id}-reminders`} checked={reminders} onCheckedChange={setReminders} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {goal ? (
            <Button variant="ghost" disabled={save.isPending} onClick={() => submit(null)}>
              {t.progress.removeGoal}
            </Button>
          ) : (
            <span />
          )}
          <Button disabled={save.isPending} onClick={() => submit({ unit, target, reminders })}>
            {t.progress.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
