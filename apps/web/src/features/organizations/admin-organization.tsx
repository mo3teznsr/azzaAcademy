'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { OrganizationRole } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageTitle, Panel } from '@/components/brand/section';
import { Chip } from '@/components/brand/status-chip';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { batchesApi, coursesApi, organizationsAdminApi, type NewSeatPack } from '@/lib/api';
import { useApiError } from '@/lib/api-errors';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { SITE_URL } from '@/lib/site';
import { OrganizationDialog } from './admin-organizations';
import { OrgReportView } from './org-report-view';
import { PACK_TONE } from './seat-pack-panel';

/** `/admin/organizations/[id]`: details, members (managers and learners), seat packs and the learner report. */
export function AdminOrganization({ id }: { id: string }) {
  const { t, f } = useI18n();
  const c = t.organizations;
  const money = useMoney();
  const apiError = useApiError();
  const qc = useQueryClient();
  const key = ['admin', 'organizations', 'detail', id] as const;
  const q = useQuery({ queryKey: key, queryFn: () => organizationsAdminApi.get(id) });
  const [editing, setEditing] = useState(false);
  const [newPack, setNewPack] = useState(false);
  const [member, setMember] = useState<{ email: string; name: string; role: OrganizationRole }>({ email: '', name: '', role: 'LEARNER' });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['admin', 'organizations'] });

  const addMember = useMutation({
    mutationFn: () => organizationsAdminApi.addMember(id, { email: member.email.trim(), role: member.role, ...(member.name.trim() && { name: member.name.trim() }) }),
    onSuccess: () => {
      toast.success(c.saved);
      setMember({ email: '', name: '', role: 'LEARNER' });
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const removeMember = useMutation({
    mutationFn: (userId: string) => organizationsAdminApi.removeMember(id, userId),
    onSuccess: refresh,
    onError: (e) => toast.error(apiError(e)),
  });

  if (q.isPending) return <LoadingBlock rows={4} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const { organization: o, members, packs } = q.data;

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/organizations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" /> {c.back}
      </Link>
      <PageTitle
        kicker={c.kicker}
        title={<bdi>{o.name}</bdi>}
        aside={
          <Button variant="outline" onClick={() => setEditing(true)}>
            {c.edit}
          </Button>
        }
      />

      <Panel>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <Fact label={c.legalName} value={o.legalName} />
          <Fact label={c.trn} value={o.trn ?? '—'} ltr />
          <Fact label={c.billingEmail} value={o.billingEmail} ltr />
          <Fact label={c.contactName} value={o.contactName} />
          <Fact label={c.contactEmail} value={o.contactEmail} ltr />
          <Fact label={c.contactPhone} value={o.contactPhone ?? '—'} ltr />
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          {c.managerLink} <span dir="ltr" className="font-mono">{SITE_URL}/organization</span>
        </p>
      </Panel>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{c.packs}</h2>
          <Button variant="ink" onClick={() => setNewPack(true)}>
            {c.newPack}
          </Button>
        </div>
        {packs.length > 0 && (
          <Panel className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{c.reference}</TableHead>
                  <TableHead>{c.course}</TableHead>
                  <TableHead className="text-end">{c.used}</TableHead>
                  <TableHead className="text-end">{c.total}</TableHead>
                  <TableHead>{c.statusLabel}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/admin/organizations/${id}/packs/${p.id}`} dir="ltr" className="font-mono underline-offset-4 hover:underline">
                        {p.reference}
                      </Link>
                      <div className="text-xs text-muted-foreground">{f.dateLong(p.invoicedAt)}</div>
                    </TableCell>
                    <TableCell>
                      <bdi>{p.title}</bdi>
                      <div className="text-xs text-muted-foreground">{p.kind === 'LIVE' ? c.live : c.recorded}</div>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {p.used}/{p.seats}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{money.aed(p.totalFils)}</TableCell>
                    <TableCell>
                      <Chip tone={PACK_TONE[p.status]}>{c.status[p.status]}</Chip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{c.members}</h2>
        <Panel>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (member.email.trim()) addMember.mutate();
            }}
          >
            <div className="flex min-w-52 flex-1 flex-col gap-1.5">
              <Label htmlFor="mem-email">{c.email}</Label>
              <Input id="mem-email" type="email" dir="ltr" required value={member.email} onChange={(e) => setMember((m) => ({ ...m, email: e.target.value }))} />
            </div>
            <div className="flex min-w-52 flex-1 flex-col gap-1.5">
              <Label htmlFor="mem-name">{c.memberName}</Label>
              <Input id="mem-name" value={member.name} onChange={(e) => setMember((m) => ({ ...m, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mem-role">{c.role}</Label>
              <Select value={member.role} onValueChange={(v) => setMember((m) => ({ ...m, role: v as OrganizationRole }))}>
                <SelectTrigger id="mem-role" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEARNER">{c.roles.LEARNER}</SelectItem>
                  <SelectItem value="MANAGER">{c.roles.MANAGER}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="outline" disabled={addMember.isPending}>
              {c.addMember}
            </Button>
          </form>
          {members.length > 0 && (
            <ul className="mt-4 divide-y divide-border">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <bdi className="font-medium">{m.user.name}</bdi>
                    <div className="text-xs text-muted-foreground" dir="ltr">{m.user.email}</div>
                  </div>
                  <Chip tone={m.role === 'MANAGER' ? 'ink' : 'outline'}>{c.roles[m.role]}</Chip>
                  <Button size="sm" variant="ghost" disabled={removeMember.isPending} onClick={() => removeMember.mutate(m.userId)}>
                    {c.remove}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <OrgReportView queryKey={['admin', 'organizations', 'report', id]} load={() => organizationsAdminApi.report(id)} csvUrl={organizationsAdminApi.reportCsvUrl(id)} />

      <OrganizationDialog open={editing} onClose={() => setEditing(false)} current={o} />
      <NewPackDialog organizationId={id} open={newPack} onClose={() => setNewPack(false)} />
    </div>
  );
}

function Fact({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium" dir={ltr ? 'ltr' : undefined}>
        <bdi>{value}</bdi>
      </dd>
    </div>
  );
}

const aedToFils = (v: string) => Math.round((Number.parseFloat(v || '0') || 0) * 100);

/** Records a deal: a class or recorded course, seats, price, and whether the transfer already arrived. */
function NewPackDialog({ organizationId, open, onClose }: { organizationId: string; open: boolean; onClose: () => void }) {
  const { t, pick } = useI18n();
  const c = t.organizations;
  const money = useMoney();
  const apiError = useApiError();
  const qc = useQueryClient();
  const [kind, setKind] = useState<'LIVE' | 'RECORDED'>('LIVE');
  const [v, setV] = useState({ target: '', seats: '10', unit: '', discount: '', paid: false, reference: '', ends: '', note: '' });
  const batches = useQuery({ queryKey: ['admin', 'organizations', 'batches'], queryFn: () => batchesApi.list({ pageSize: 100 }), enabled: open && kind === 'LIVE' });
  const courses = useQuery({ queryKey: ['admin', 'organizations', 'courses'], queryFn: () => coursesApi.list({ pageSize: 100, type: 'RECORDED' }), enabled: open && kind === 'RECORDED' });
  const openBatches = (batches.data?.items ?? []).filter((b) => ['ENROLLING', 'FULL', 'RUNNING'].includes(b.status));
  const recorded = (courses.data?.items ?? []).filter((x) => x.type === 'RECORDED');

  const seats = Number.parseInt(v.seats, 10) || 0;
  const subtotal = seats * aedToFils(v.unit);
  const m = useMutation({
    mutationFn: () => {
      const input: NewSeatPack = {
        ...(kind === 'LIVE' ? { batchId: v.target } : { courseId: v.target, accessEndsAt: v.ends }),
        seats,
        unitPriceFils: aedToFils(v.unit),
        discountFils: aedToFils(v.discount),
        paid: v.paid,
        ...(v.paid && { paymentReference: v.reference.trim() }),
        ...(v.note.trim() && { note: v.note.trim() }),
      };
      return organizationsAdminApi.createPack(organizationId, input);
    },
    onSuccess: () => {
      toast.success(c.created);
      void qc.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      setV({ target: '', seats: '10', unit: '', discount: '', paid: false, reference: '', ends: '', note: '' });
      onClose();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const ready = !!v.target && seats > 0 && v.unit !== '' && (!v.paid || !!v.reference.trim()) && (kind === 'LIVE' || !!v.ends);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{c.newPack}</DialogTitle>
        </DialogHeader>
        <form
          id="pack-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) m.mutate();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label>{c.type}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={kind}
              onValueChange={(x) => {
                if (!x) return;
                setKind(x as 'LIVE' | 'RECORDED');
                setV((s) => ({ ...s, target: '' }));
              }}
            >
              <ToggleGroupItem value="LIVE">{c.live}</ToggleGroupItem>
              <ToggleGroupItem value="RECORDED">{c.recorded}</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pack-target">{kind === 'LIVE' ? c.batch : c.course}</Label>
            <Select value={v.target || undefined} onValueChange={(x) => setV((s) => ({ ...s, target: x }))}>
              <SelectTrigger id="pack-target" className="w-full">
                <SelectValue placeholder={kind === 'LIVE' ? c.pickBatch : c.pickCourse} />
              </SelectTrigger>
              <SelectContent>
                {kind === 'LIVE'
                  ? openBatches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {pick(b.course.titleEn, b.course.titleAr).text} · {b.code} · <span dir="ltr">{b.startsOn.slice(0, 10)}</span>
                      </SelectItem>
                    ))
                  : recorded.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {pick(x.titleEn, x.titleAr).text}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField id="pack-seats" label={c.seats} value={v.seats} step="1" onChange={(x) => setV((s) => ({ ...s, seats: x }))} />
            <NumberField id="pack-unit" label={c.unitPrice} value={v.unit} step="0.01" onChange={(x) => setV((s) => ({ ...s, unit: x }))} />
            <NumberField id="pack-discount" label={c.discount} value={v.discount} step="0.01" onChange={(x) => setV((s) => ({ ...s, discount: x }))} />
          </div>
          <p className="text-sm text-muted-foreground">
            {t.invoices.taxable}: <b className="tabular-nums text-foreground">{money.aed(Math.max(0, subtotal - aedToFils(v.discount)))}</b>
          </p>
          {kind === 'RECORDED' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pack-ends">{c.accessEndsAt}</Label>
              <Input id="pack-ends" type="date" dir="ltr" className="w-44" value={v.ends} onChange={(e) => setV((s) => ({ ...s, ends: e.target.value }))} />
            </div>
          )}
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={v.paid} onCheckedChange={(x) => setV((s) => ({ ...s, paid: x }))} />
            {c.paidNow}
          </label>
          {v.paid && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pack-ref">{c.paymentReference}</Label>
              <Input id="pack-ref" dir="ltr" value={v.reference} onChange={(e) => setV((s) => ({ ...s, reference: e.target.value }))} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pack-note">{c.note}</Label>
            <Textarea id="pack-note" rows={2} value={v.note} onChange={(e) => setV((s) => ({ ...s, note: e.target.value }))} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="pack-form" variant="ink" disabled={!ready || m.isPending}>
            {c.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumberField({ id, label, value, step, onChange }: { id: string; label: string; value: string; step: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min="0" step={step} dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
