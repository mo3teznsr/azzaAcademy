'use client';

import { useId, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aedToFils, filsToAed, REFERRAL_STATUSES, type ReferralProgramSettings } from '@azza/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Chip, type ChipTone } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { Pager } from '@/features/admin/courses';
import { referralsApi, type ReferralStatus } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';

const STATUS_TONE: Record<ReferralStatus, ChipTone> = { PENDING: 'outline', QUALIFIED: 'sky', REWARDED: 'sage', VOID: 'strike' };
const TOGGLE_ITEM = 'h-10 rounded-full border border-border px-4 text-sm data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground';
const programKey = ['admin', 'referral-program'] as const;

/** `/admin/referrals`: program rules (on/off, reward, teacher bonus) and every referral with its status. */
export function AdminReferrals() {
  const { t } = useI18n();
  return (
    <>
      <PageTitle title={t.adminReferrals.title} />
      <div className="flex flex-col gap-6">
        <ProgramForm />
        <ReferralList />
      </div>
    </>
  );
}

/** The form edits AED for amounts; the API stores fils. */
interface Draft {
  enabled: boolean;
  rewardType: 'PERCENT' | 'AMOUNT';
  rewardValue: string;
  couponValidDays: string;
  teacherBonusAed: string;
}
const toDraft = (p: ReferralProgramSettings): Draft => ({
  enabled: p.enabled,
  rewardType: p.rewardType,
  rewardValue: String(p.rewardType === 'AMOUNT' ? filsToAed(p.rewardValue) : p.rewardValue),
  couponValidDays: String(p.couponValidDays),
  teacherBonusAed: String(filsToAed(p.teacherBonusFils)),
});

function ProgramForm() {
  const q = useQuery({ queryKey: programKey, queryFn: referralsApi.program });
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data) return <LoadingBlock rows={2} />;
  return <ProgramFields initial={q.data} />;
}

function ProgramFields({ initial }: { initial: ReferralProgramSettings }) {
  const { t } = useI18n();
  const c = t.adminReferrals;
  const id = useId();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const save = useMutation({
    mutationFn: (d: Draft) =>
      referralsApi.saveProgram({
        enabled: d.enabled,
        rewardType: d.rewardType,
        rewardValue: d.rewardType === 'AMOUNT' ? aedToFils(Number(d.rewardValue)) : Math.round(Number(d.rewardValue)),
        couponValidDays: Math.round(Number(d.couponValidDays)),
        teacherBonusFils: aedToFils(Number(d.teacherBonusAed || 0)),
      }),
    onSuccess: (saved) => {
      qc.setQueryData(programKey, saved);
      toast.success(c.saved);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value });

  return (
    <Panel aria-labelledby={`${id}-title`}>
      <SectionHeader title={<span id={`${id}-title`}>{c.rulesTitle}</span>} />
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(draft);
        }}
      >
        <div className="flex items-start gap-3 sm:col-span-2">
          <Switch id={`${id}-enabled`} checked={draft.enabled} onCheckedChange={(v) => set('enabled', v)} />
          <div className="flex flex-col gap-0.5">
            <Label htmlFor={`${id}-enabled`}>{c.enabled}</Label>
            <span className="text-xs text-muted-foreground">{c.enabledNote}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-sm font-medium" id={`${id}-type`}>
            {c.rewardType}
          </span>
          <ToggleGroup
            type="single"
            value={draft.rewardType}
            onValueChange={(v) => v && set('rewardType', v as Draft['rewardType'])}
            aria-labelledby={`${id}-type`}
            className="flex flex-wrap gap-2"
          >
            <ToggleGroupItem value="PERCENT" className={TOGGLE_ITEM}>
              {c.percent}
            </ToggleGroupItem>
            <ToggleGroupItem value="AMOUNT" className={TOGGLE_ITEM}>
              {c.amount}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-value`}>{draft.rewardType === 'PERCENT' ? c.percentValue : c.amountValue}</Label>
          <Input
            id={`${id}-value`}
            type="number"
            inputMode="decimal"
            min={draft.rewardType === 'PERCENT' ? 1 : 0.01}
            max={draft.rewardType === 'PERCENT' ? 100 : undefined}
            step={draft.rewardType === 'PERCENT' ? 1 : 0.01}
            required
            value={draft.rewardValue}
            onChange={(e) => set('rewardValue', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-days`}>{c.validDays}</Label>
          <Input id={`${id}-days`} type="number" inputMode="numeric" min={1} max={365} step={1} required value={draft.couponValidDays} onChange={(e) => set('couponValidDays', e.target.value)} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor={`${id}-bonus`}>{c.teacherBonus}</Label>
          <Input id={`${id}-bonus`} type="number" inputMode="decimal" min={0} step={0.01} value={draft.teacherBonusAed} onChange={(e) => set('teacherBonusAed', e.target.value)} className="sm:max-w-xs" />
          <span className="text-xs text-muted-foreground">{c.teacherBonusNote}</span>
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-2">{c.holdNote}</p>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? t.common.saving : c.save}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function ReferralList() {
  const { t, f } = useI18n();
  const c = t.adminReferrals;
  const [status, setStatus] = useState<ReferralStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ['admin', 'referrals', status, page],
    queryFn: () => referralsApi.adminList({ page, status: status === 'ALL' ? undefined : status }),
    placeholderData: keepPreviousData,
  });
  return (
    <Panel aria-labelledby="referral-list">
      <SectionHeader title={<span id="referral-list">{c.listTitle}</span>} />
      <Tabs value={status} onValueChange={(v) => (setStatus(v as ReferralStatus | 'ALL'), setPage(1))}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="ALL">{t.common.all}</TabsTrigger>
          {REFERRAL_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {c.status[s]}
              {q.data && <span className="ms-1.5 tabular-nums text-muted-foreground">{f.number(q.data.counts[s])}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {q.isPending ? (
        <LoadingBlock rows={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.items.length === 0 ? (
        <EmptyState title={c.empty} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{c.colReferrer}</TableHead>
                <TableHead>{c.colReferred}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead>{c.colJoined}</TableHead>
                <TableHead>{c.colPaid}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="font-medium">{r.referrer.name}</span>
                    <span className="block text-xs text-muted-foreground" dir="ltr">
                      {r.referrer.email} · {r.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{r.referred.name}</span>
                    <span className="block text-xs text-muted-foreground" dir="ltr">
                      {r.referred.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip tone={STATUS_TONE[r.status]}>{c.status[r.status]}</Chip>
                  </TableCell>
                  <TableCell>{f.dayMonth(r.createdAt)}</TableCell>
                  <TableCell>{r.firstPaidAt ? f.dayMonth(r.firstPaidAt) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={q.data.page} pageCount={q.data.pageCount} onPage={setPage} />
        </>
      )}
    </Panel>
  );
}
