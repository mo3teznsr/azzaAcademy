import { Hono } from 'hono';
import { conversationMessageInput, conversationMessagesQuery } from '@azza/shared';
import { currentUser, requireAuth } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { ConversationService } from './conversation.service';

/** Mounted at /api/v1 */
export function conversationRoutes(service: ConversationService) {
  return new Hono<AppEnv>()
    .get('/me/conversations', requireAuth, async (c) => c.json(await service.mine(currentUser(c))))
    .get('/batches/:id/conversation', requireAuth, async (c) => c.json(await service.classConversation(c.req.param('id'), currentUser(c))))
    .post('/batches/:id/dm', requireAuth, async (c) => c.json(await service.openDirect(c.req.param('id'), currentUser(c))))
    .get('/conversations/:id/messages', requireAuth, validate('query', conversationMessagesQuery), async (c) => {
      const { before, limit } = c.req.valid('query');
      return c.json(await service.messages(c.req.param('id'), currentUser(c), before ? new Date(before) : null, limit));
    })
    .post('/conversations/:id/messages', requireAuth, validate('json', conversationMessageInput), async (c) =>
      c.json(await service.send(c.req.param('id'), c.req.valid('json').body, currentUser(c)), 201),
    )
    .post('/conversations/:id/read', requireAuth, async (c) => c.json(await service.markRead(c.req.param('id'), currentUser(c))))
    .delete('/messages/:id', requireAuth, async (c) => c.json(await service.deleteMessage(c.req.param('id'), currentUser(c))));
}
