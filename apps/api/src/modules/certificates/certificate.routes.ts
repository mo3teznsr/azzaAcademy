import { Hono } from 'hono';
import { currentUser, requireAuth } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import type { CertificateService } from './certificate.service';

/** Mounted at /api/v1 — `/certificates/:code` is public (verify page, QR code on the certificate). */
export function certificateRoutes(service: CertificateService) {
  return new Hono<AppEnv>()
    .get('/me/certificates', requireAuth, async (c) => c.json(await service.mine(currentUser(c).id)))
    .get('/certificates/:code', async (c) => c.json(await service.verify(c.req.param('code'))));
}
