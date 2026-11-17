import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { organizationInput, organizationMemberInput, orgReportQuery, paginationQuery, seatAssignInput, seatPackInput, seatPackPaidInput } from '@azza/shared';
import { currentUser, requireAuth, requireRole } from '../../http/middleware';
import { paged } from '../../http/pagination';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { TaxDocumentService } from '../invoices/tax-document.service';
import type { Actor, OrganizationService } from './organization.service';

const csv = (c: Context<AppEnv>, body: string, name: string) =>
  c.body(body, 200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"` });

const admin = (c: Context<AppEnv>): Actor => ({ id: currentUser(c).id, as: 'ADMIN' });

/** Mounted at /api/v1/admin */
export function adminOrganizationRoutes(service: OrganizationService) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .get('/organizations', validate('query', paginationQuery.extend({ q: z.string().trim().optional() })), async (c) => {
      const { page, pageSize, q } = c.req.valid('query');
      return c.json(paged(await service.list(q || undefined, (page - 1) * pageSize, pageSize), page, pageSize));
    })
    .post('/organizations', validate('json', organizationInput), async (c) => c.json(await service.create(c.req.valid('json'), currentUser(c).id), 201))
    .get('/organizations/:id', async (c) => c.json(await service.detail(c.req.param('id'), admin(c))))
    .patch('/organizations/:id', validate('json', organizationInput), async (c) => c.json(await service.update(c.req.param('id'), c.req.valid('json'), currentUser(c).id)))
    .post('/organizations/:id/members', validate('json', organizationMemberInput), async (c) =>
      c.json(await service.addMember(c.req.param('id'), c.req.valid('json'), currentUser(c).id), 201),
    )
    .delete('/organizations/:id/members/:userId', async (c) => c.json(await service.removeMember(c.req.param('id'), c.req.param('userId'), currentUser(c).id)))
    .post('/organizations/:id/seat-packs', validate('json', seatPackInput), async (c) =>
      c.json(await service.createPack(c.req.param('id'), c.req.valid('json'), currentUser(c).id), 201),
    )
    .get('/organizations/:id/report', validate('query', orgReportQuery), async (c) => {
      const id = c.req.param('id');
      if (c.req.valid('query').format === 'csv') return csv(c, await service.reportCsv(id, admin(c)), `organization-report-${id}.csv`);
      return c.json(await service.report(id, admin(c)));
    })
    .get('/seat-packs/:packId', async (c) => c.json(await service.pack(c.req.param('packId'), admin(c))))
    .post('/seat-packs/:packId/mark-paid', validate('json', seatPackPaidInput), async (c) =>
      c.json(await service.markPaid(c.req.param('packId'), c.req.valid('json').paymentReference, currentUser(c).id)),
    )
    .post('/seat-packs/:packId/cancel', async (c) => c.json(await service.cancelPack(c.req.param('packId'), currentUser(c).id)))
    .post('/seat-packs/:packId/assignments', validate('json', seatAssignInput), async (c) =>
      c.json(await service.assign(c.req.param('packId'), c.req.valid('json'), admin(c)), 201),
    )
    .post('/seat-assignments/:id/revoke', async (c) => c.json(await service.revoke(c.req.param('id'), admin(c))));
}

/** Mounted at /api/v1/org — an organization's managers (any account role; membership decides). */
export function organizationManagerRoutes(service: OrganizationService, taxDocuments: Pick<TaxDocumentService, 'forOrganization'>) {
  const manager = (c: Context<AppEnv>) => service.managerActor(currentUser(c).id, c.req.param('orgId')!);
  return new Hono<AppEnv>()
    .use('*', requireAuth)
    .get('/mine', async (c) => c.json({ items: await service.managedBy(currentUser(c).id) }))
    .get('/:orgId', async (c) => c.json(await service.detail(c.req.param('orgId'), await manager(c))))
    .get('/:orgId/seat-packs/:packId', async (c) => c.json(await service.pack(c.req.param('packId'), await manager(c))))
    .post('/:orgId/seat-packs/:packId/assignments', validate('json', seatAssignInput), async (c) =>
      c.json(await service.assign(c.req.param('packId'), c.req.valid('json'), await manager(c)), 201),
    )
    .post('/:orgId/seat-assignments/:id/revoke', async (c) => c.json(await service.revoke(c.req.param('id'), await manager(c))))
    .get('/:orgId/report', validate('query', orgReportQuery), async (c) => {
      const actor = await manager(c);
      const id = c.req.param('orgId');
      if (c.req.valid('query').format === 'csv') return csv(c, await service.reportCsv(id, actor), `organization-report.csv`);
      return c.json(await service.report(id, actor));
    })
    .get('/:orgId/tax-documents', async (c) => {
      await manager(c);
      return c.json({ items: await taxDocuments.forOrganization(c.req.param('orgId')) });
    });
}
