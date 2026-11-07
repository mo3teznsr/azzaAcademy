# Communications: announcements, chat, support

Three features close the gap between live sessions:
- **announcements:** one-way news from a teacher or admin;
- **chat:** class group chat, plus private messages to your teacher;
- **support:** tickets answered by the Azza team.

Everything reuses the existing Notifier (in-app, realtime, push, email) and the Socket.IO `RealtimeBroadcaster.toUser`.

**Product decisions (confirmed by the owner):**
- **Chat:** every class gets a group chat with its students and teacher. A student can message **their own teacher** privately. There are **no** student-to-student private messages.
- **Support:** in-app tickets, with a thread per ticket. Admins work from an inbox.

Learner-facing copy follows docs/VOICE.md: "class" (صفّ) for a batch, plain and friendly tone, Arabic written natively, Western digits.

## Data model (Prisma)
Add these models. The SQL table for users is `"user"` (lowercase).

### Announcements
- **`Announcement`:**
  - `id`, `authorId` → user
  - `scope`: `BATCH` | `PLATFORM`
  - `batchId?` → batch
  - `audience` (PLATFORM only): `ALL` | `STUDENTS` | `TEACHERS`, default ALL
  - `title` (≤ 120), `body` (markdown, ≤ 4000)
  - `pinned` Boolean
  - `createdAt`, `updatedAt`
  - indexes: `[batchId, createdAt]`, `[scope, createdAt]`

### Chat
- **`Conversation`:**
  - `id`
  - `type`: `CLASS` | `DIRECT`
  - `batchId` → batch; both types belong to a batch
  - `studentId?` (DIRECT only)
  - `createdAt`, `lastMessageAt?`
  - unique `[batchId, type, studentId]`; for CLASS, studentId is null. Postgres treats nulls as distinct, so enforce one CLASS conversation per batch in the service with an upsert-by-find, or use a partial unique index in SQL.
- **`Message`:**
  - `id`, `conversationId`, `senderId`
  - `body` (≤ 2000)
  - `createdAt`, `deletedAt?`, `deletedById?`
  - index `[conversationId, createdAt]`
  - Don't reuse the session-only `ChatMessage` model.
- **`ConversationRead`:**
  - `conversationId`, `userId`, `lastReadAt`
  - id `[conversationId, userId]`
  - drives the unread counts

### Support
- **`SupportTicket`:**
  - `id`, `userId`
  - `subject` (≤ 140)
  - `category`: `PAYMENT` | `CLASS` | `ACCOUNT` | `TECHNICAL` | `OTHER`
  - `status`: `OPEN` | `AWAITING_USER` | `RESOLVED`, default OPEN
  - `orderId?`, `batchId?`
  - `assigneeId?`
  - `createdAt`, `updatedAt`, `lastMessageAt`
  - indexes: `[userId, updatedAt]`, `[status, lastMessageAt]`
- **`SupportMessage`:**
  - `id`, `ticketId`, `authorId`
  - `body` (≤ 4000)
  - `fromStaff` Boolean
  - `createdAt`

## Access rules
**Class members** are the batch teacher, plus students with an **ACTIVE** enrollment. Admins can read everything; they can post in a CLASS chat and delete messages.

| Action | Who |
|---|---|
| Post a class announcement | the batch teacher, admin |
| Read class announcements | class members |
| Post a platform announcement | admin |
| Read platform announcements | everyone in `audience` |
| Read or post in a class chat | class members; admin read/post |
| Delete a class chat message | the sender, the batch teacher, admin |
| Open a private chat (`POST /batches/:id/dm`) | an ACTIVE student of that batch (with its teacher only) |
| Read or post in a private chat | that student, that batch's teacher, admin (read only) |
| Delete a private chat message | the sender, admin |
| Open a support ticket | any signed-in user |
| Read a ticket, reply to it, mark it resolved | the ticket owner, admin |
| Assign a ticket, set any status | admin |

**Chat lifecycle:**
- When a batch is COMPLETED or CANCELLED, its chats become **read-only** (422 `CHAT_CLOSED`).
- Students whose enrollment is no longer ACTIVE lose access.

**Rate limit:** at most 20 chat messages a minute per user per conversation (429 `RATE_LIMITED`); keep it simple, in memory.

## Endpoints (`/api/v1`)

### Announcements
- `GET /me/announcements?page` → `{ items: [{ id, scope, batch: {id, code, courseTitle, courseTitleAr} | null, title, body, pinned, author: {id, name, image}, createdAt }], total }`
  - Covers the platform announcements for my role plus my classes' announcements.
  - Pinned items come first, then newest.
- `GET /batches/:id/announcements`
- `POST /batches/:id/announcements` `{ title, body, pinned?, notify? = true }`
  - `PATCH /announcements/:id` and `DELETE /announcements/:id`: the author or an admin.
- `POST /announcements` (admin) `{ title, body, audience, pinned?, notify? }`
- **Notifications:** new announcements notify their recipients with type `ANNOUNCEMENT`, `data: { announcementId, batchId? }`.
  - In-app and push for both kinds.
  - Email only for PLATFORM announcements.

### Chat
- `GET /me/conversations` → one entry per conversation:
  ```
  { items: [{ id, type, batch: { id, code, courseTitle, courseTitleAr },
              counterpart: { id, name, image, role } | null,
              lastMessage: { body, senderName, createdAt } | null,
              unread, closed }] }
  ```
  - CLASS conversations are created lazily for every class I'm in.
  - Teachers see all DIRECT conversations of their batches.
  - Admins don't get conversations listed here; they browse via the batch endpoints.
- `GET /batches/:id/conversation` → the CLASS conversation (created if missing).
- `POST /batches/:id/dm` → the DIRECT conversation between me (a student) and the batch teacher (created if missing).
- `GET /conversations/:id/messages?before=<ISO>&limit=50` → `{ items: [{ id, sender: {id, name, image, role}, body, createdAt, deleted }], hasMore }`, newest last.
  - Deleted messages come back with `body: ''` and `deleted: true`.
- `POST /conversations/:id/messages` `{ body }` → the message (201).
  - Broadcasts the socket event `conversation:message` `{ conversationId, message }` with `toUser` to every member except the sender.
  - Notifies the other members with type `CHAT_MESSAGE` and `data: { conversationId }`: push and in-app, **collapsed**, so at most one notification per conversation per recipient per 10 minutes (keep a timestamp in memory), and only for DIRECT chats or when the teacher posts in a CLASS chat. That avoids spamming a busy class.
- `POST /conversations/:id/read` → `{ ok }`; sets `lastReadAt` to now.
- `DELETE /messages/:id`; broadcasts `conversation:message-deleted` `{ conversationId, messageId }`.
- **Shared constants:** add `CONVERSATION_MESSAGE: 'conversation:message'` and `CONVERSATION_MESSAGE_DELETED: 'conversation:message-deleted'` to `SOCKET_EVENTS` in packages/shared/src/realtime.ts, plus their payload types.

### Support
- `POST /support/tickets` `{ subject, category, body, orderId?, batchId? }` → the ticket with its first message (201).
  - Notifies `notifyRole('ADMIN')` with type `SUPPORT_TICKET`, by email and in-app.
- `GET /support/tickets?status&page`
  - The owner sees their own tickets; an admin sees all, newest activity first.
  - Each item: `{ id, subject, category, status, user: {id, name, email}, lastMessageAt, unreadForMe? }`
- `GET /support/tickets/:id` → the ticket, its messages (oldest first) and the linked order/batch summary.
- `POST /support/tickets/:id/messages` `{ body }`
  - **A staff reply** sets status to `AWAITING_USER` and notifies the owner with type `SUPPORT_REPLY` (email, push, in-app).
  - **An owner reply** sets status back to `OPEN` (it also reopens a RESOLVED ticket) and notifies admins.
- `PATCH /support/tickets/:id` `{ status?, assigneeId? }`: admin any; the owner only `{status: 'RESOLVED'}`.

### Errors
All on the existing error shape:
- `CHAT_CLOSED`
- `RATE_LIMITED`
- `NOT_CLASS_MEMBER` (403)
- `DM_NOT_ALLOWED`
- `TICKET_CLOSED` (only if you need it)

## Clients

### Web
- **Header:** a Messages icon with a total unread badge, next to the bell. It opens `/messages`.
- **`/messages`:** a two-pane inbox (a list on the left, the thread on the right; it stacks on mobile widths), shared by students, teachers and admins.
  - Live updates over the socket.
  - Composer: an input group with a send button; Enter sends, Shift+Enter makes a new line.
  - "Load earlier" for history.
  - Delete through a message menu.
  - The read-only state shows a "This class has ended" note.
- **Class page and studio batch workspace:** an "Announcements" panel (pinned first) and a "Class chat" tab.
  - The student's class card gets a "Message your teacher" button.
  - Teachers get a "New announcement" dialog (title, markdown body, pin, notify).
- **Admin:**
  - "Announcements": post platform-wide by audience; list and edit.
  - "Support inbox" at `/admin/support`: filters (Open / Awaiting user / Resolved, category), a ticket thread with reply, a status change, a linked order or batch, and a nav badge for Open tickets.
- **Users:**
  - "Help & support" at `/support`: my tickets, plus "New ticket" (an input group form with subject, category, an optional order or class picker, and the message).
  - A thread view where they can reply and mark the ticket resolved.
  - Linked from the footer, the account menu, and the order page ("Problem with this order?" prefills it).
- **Notifications:** the bell links each type: `ANNOUNCEMENT` → the class page or `/announcements`, `CHAT_MESSAGE` → `/messages?c=<id>`, `SUPPORT_*` → `/support/<id>` or `/admin/support/<id>`.
- **Learner home:** a "Latest from your classes" announcements strip.

### Mobile
- **Tab badge:** a Messages entry in each role's navigation (or the home app bar if the tabs are full), with an unread badge.
- **Inbox list, then the thread screen:**
  - The thread uses a chat-bubble layout with your own messages on the end side (RTL aware).
  - A composer with a send button.
  - Live updates via the socket.
  - Pull to load earlier messages.
  - Long-press to delete.
- **Class screen:** Announcements plus "Class chat" plus "Message your teacher" (students).
- **Teachers:** a "New announcement" sheet.
- **Profile → Help & support:** tickets list, new ticket, thread. The order status screen gets "Need help?".
- **Admin:** the support inbox (list plus thread plus status), and platform announcements (compose).
- **Routing:** `notificationRoute` covers the new types.
