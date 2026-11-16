import { Hono } from 'hono';
import { statementImportInput, statementLineConfirmInput, statementMapping, statementPreviewInput } from '@azza/shared';
import { currentUser, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { ReconciliationService } from './reconciliation.service';

/** Admin bank statement reconciliation, mounted under /admin. */
export function adminReconciliationRoutes(service: ReconciliationService) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .put('/bank-accounts/:id/statement-mapping', validate('json', statementMapping), async (c) => c.json(await service.saveMapping(c.req.param('id'), c.req.valid('json'))))
    .post('/bank-statements/preview', validate('json', statementPreviewInput), async (c) => c.json(await service.preview(c.req.valid('json'))))
    .get('/bank-statements', async (c) => c.json(await service.listImports()))
    .post('/bank-statements', validate('json', statementImportInput), async (c) => c.json(await service.import(c.req.valid('json'), currentUser(c).id), 201))
    .get('/bank-statements/:id', async (c) => c.json(await service.view(c.req.param('id'))))
    .post('/bank-statements/:id/confirm-exact', async (c) => c.json(await service.confirmExact(c.req.param('id'), currentUser(c).id)))
    .post('/bank-statement-lines/:id/confirm', validate('json', statementLineConfirmInput), async (c) =>
      c.json(await service.confirm(c.req.param('id'), currentUser(c).id, c.req.valid('json').target)),
    )
    .post('/bank-statement-lines/:id/ignore', async (c) => c.json(await service.ignore(c.req.param('id'), currentUser(c).id)));
}
