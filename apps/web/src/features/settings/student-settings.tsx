'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderStatusChip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { LoadingBlock, QueryView } from '@/components/brand/states';
import { meApi, itemsOf } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { ThemeSegmented } from '@/components/brand/theme-switcher';
import { ProfileForm } from './profile-form';

export function StudentSettings() {
  const { t, f } = useI18n();
  const money = useMoney();
  const orders = useQuery({ queryKey: qk.myOrders, queryFn: meApi.orders, select: itemsOf });
  return (
    <>
      <PageTitle title={t.settings.title} />
      <ProfileForm />
      <Panel aria-labelledby="appearance-title">
        <SectionHeader title={<span id="appearance-title">{t.settings.appearance}</span>} />
        <ThemeSegmented labelledBy="appearance-title" className="self-start" />
        <p className="text-sm text-muted-foreground">{t.settings.appearanceNote}</p>
      </Panel>
      <Panel aria-labelledby="orders" id="orders">
        <SectionHeader title={<span id="orders-title">{t.settings.orders}</span>} />
        <QueryView query={orders} loading={<LoadingBlock rows={2} />} empty={<p className="text-sm text-muted-foreground">{t.settings.noOrders}</p>}>
          {(list) => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.payments.colOrder}</TableHead>
                  <TableHead>{t.admin.payments.colAmount}</TableHead>
                  <TableHead>{t.admin.payments.colMethod}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="link-sun font-mono text-xs" dir="ltr">
                        {o.reference}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{f.dayMonth(o.createdAt)}</span>
                    </TableCell>
                    <TableCell>{money.aed(o.totalFils)}</TableCell>
                    <TableCell>{t.status.method[o.method]}</TableCell>
                    <TableCell>
                      <OrderStatusChip status={o.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </QueryView>
      </Panel>
      <Panel aria-labelledby="delete-account-title">
        <SectionHeader title={<span id="delete-account-title">{t.legal.footer.deleteAccount}</span>} />
        <p className="text-sm text-muted-foreground">{t.legal.deletion.intro}</p>
        <Link href="/account/delete" className="link-sun self-start text-sm">
          {t.legal.deletion.button}
        </Link>
      </Panel>
    </>
  );
}
