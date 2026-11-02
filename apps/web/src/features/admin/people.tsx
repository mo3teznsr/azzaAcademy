'use client';

import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminCreateUserInput, ROLES, type Role } from '@azza/shared';
import type { z } from 'zod';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Chip } from '@/components/brand/status-chip';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { Pager } from './courses';

export function People() {
  const { t, f, fill } = useI18n();
  const qc = useQueryClient();
  const [role, setRole] = useState<Role>('STUDENT');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDeferredValue(q);
  const params = { role, q: dq || undefined, page, pageSize: 25 };
  const list = useQuery({ queryKey: qk.admin.users(params), queryFn: () => adminApi.users(params) });
  const update = useMutation({
    mutationFn: ({ id, ...input }: { id: string; role?: Role; banned?: boolean }) => adminApi.updateUser(id, input),
    onSuccess: () => {
      toast.success(t.common.saved);
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageTitle title={t.admin.people.title} aside={<InviteDialog />} />
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={role} onValueChange={(v) => (setRole(v as Role), setPage(1))}>
          <TabsList>
            <TabsTrigger value="STUDENT">{t.admin.people.students}</TabsTrigger>
            <TabsTrigger value="TEACHER">{t.admin.people.teachers}</TabsTrigger>
            <TabsTrigger value="ADMIN">{t.admin.people.admins}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} placeholder={t.common.search} aria-label={t.common.search} className="max-w-xs rounded-full" />
      </div>
      <Panel className="p-2">
        {list.isPending ? (
          <LoadingBlock rows={6} height={52} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState title={t.admin.people.empty} />
        ) : (
          <>
            <p className="px-3 pt-2 text-sm text-muted-foreground">{fill(t.common.showing, { n: f.number(list.data.items.length), total: f.number(list.data.total) })}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.people.colPerson}</TableHead>
                  <TableHead>{t.admin.people.colRole}</TableHead>
                  <TableHead>{t.admin.people.colJoined}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="text-end">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <span className="flex items-center gap-2.5">
                        <InitialsAvatar name={u.name} src={u.image} size={32} />
                        <span>
                          <bdi className="block font-medium">{u.name}</bdi>
                          <span className="text-xs text-muted-foreground" dir="ltr">
                            {u.email}
                          </span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>{t.status.role[u.role]}</TableCell>
                    <TableCell>{u.createdAt ? f.dayMonth(u.createdAt) : '—'}</TableCell>
                    <TableCell>{u.banned ? <Chip tone="danger">{t.admin.people.suspended}</Chip> : <Chip tone="sage">{t.status.enrollment.ACTIVE}</Chip>}</TableCell>
                    <TableCell className="text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={t.common.actions}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ROLES.filter((r) => r !== u.role).map((r) => (
                            <DropdownMenuItem key={r} onSelect={() => update.mutate({ id: u.id, role: r })}>
                              {fill(t.admin.people.makeRole, { r: t.status.role[r] })}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant={u.banned ? 'default' : 'destructive'} onSelect={() => update.mutate({ id: u.id, banned: !u.banned })}>
                            {u.banned ? t.admin.people.restore : t.admin.people.suspend}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pager page={list.data.page} pageCount={list.data.pageCount} onPage={setPage} />
          </>
        )}
      </Panel>
    </>
  );
}

function InviteDialog() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<z.input<typeof adminCreateUserInput>, unknown, z.output<typeof adminCreateUserInput>>({
    resolver: zodResolver(adminCreateUserInput),
    defaultValues: { name: '', email: '', role: 'TEACHER', locale: 'en' },
  });
  const m = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      toast.success(t.admin.people.invited);
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setOpen(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const err = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ink">{t.admin.people.invite}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.admin.people.inviteTitle}</DialogTitle>
        </DialogHeader>
        <form id="invite-form" className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="i-name">{t.admin.people.name}</Label>
            <Input id="i-name" {...form.register('name')} aria-invalid={!!err.name} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="i-email">{t.admin.people.email}</Label>
            <Input id="i-email" type="email" dir="ltr" {...form.register('email')} aria-invalid={!!err.email} />
            {err.email && <span className="text-[13px] text-destructive">{err.email.message}</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t.admin.people.role}</Label>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {t.status.role[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t.common.language}</Label>
              <Controller
                control={form.control}
                name="locale"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="invite-form" variant="ink" disabled={m.isPending}>
            {t.admin.people.sendInvite}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
