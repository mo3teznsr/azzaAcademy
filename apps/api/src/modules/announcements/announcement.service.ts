import type {
  AnnouncementAudience,
  AnnouncementScope,
  BatchAnnouncementInput,
  PlatformAnnouncementInput,
  Role,
  UpdateAnnouncementInput,
} from '@azza/shared';
import { AppError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { BatchAccessPolicy } from '../batches/batch-access';
import { communicationEmails } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';

type Actor = { id: string; role: Role };

export interface AnnouncementRecord {
  id: string;
  authorId: string;
  scope: AnnouncementScope;
  batchId: string | null;
  audience: AnnouncementAudience;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; image: string | null };
  batch: { id: string; code: string; course: { titleEn: string; titleAr: string | null } } | null;
}

export interface NewAnnouncement {
  authorId: string;
  scope: AnnouncementScope;
  batchId: string | null;
  audience: AnnouncementAudience;
  title: string;
  body: string;
  pinned: boolean;
}

/** What `GET /me/announcements` covers: platform announcements for these audiences, plus these classes. */
export interface AnnouncementFeedFilter {
  audiences: AnnouncementAudience[];
  batchIds: string[];
}

export interface AnnouncementRepository {
  find(id: string): Promise<AnnouncementRecord | null>;
  create(data: NewAnnouncement): Promise<AnnouncementRecord>;
  update(id: string, data: Partial<Pick<AnnouncementRecord, 'title' | 'body' | 'pinned' | 'audience'>>): Promise<AnnouncementRecord>;
  delete(id: string): Promise<void>;
  /** Pinned first, then newest. */
  listForBatch(batchId: string, skip: number, take: number): Promise<{ items: AnnouncementRecord[]; total: number }>;
  /** Pinned first, then newest. */
  feed(filter: AnnouncementFeedFilter, skip: number, take: number): Promise<{ items: AnnouncementRecord[]; total: number }>;
  /** Batches a student is ACTIVE in, or a teacher teaches. */
  memberBatchIds(user: Actor): Promise<string[]>;
  /** The batch teacher plus ACTIVE students. */
  classMemberIds(batchId: string): Promise<string[]>;
  /** Non-banned users to notify: every role for ALL, otherwise students or teachers. */
  audienceUserIds(audience: AnnouncementAudience): Promise<string[]>;
}

/** Who reads a PLATFORM announcement: everyone for ALL, otherwise the matching role (and admins). */
export function audiencesFor(role: Role): AnnouncementAudience[] {
  if (role === 'ADMIN') return ['ALL', 'STUDENTS', 'TEACHERS'];
  return role === 'TEACHER' ? ['ALL', 'TEACHERS'] : ['ALL', 'STUDENTS'];
}

export const notClassMember = () => new AppError('You are not a member of this class', 403, 'NOT_CLASS_MEMBER');

/**
 * One-way news. Class announcements: the batch teacher or an admin posts, class members (teacher + ACTIVE students) read.
 * Platform announcements: admins post to an audience. New announcements notify recipients (in-app, realtime, push;
 * email for PLATFORM only) unless `notify: false`.
 */
export class AnnouncementService {
  constructor(
    private readonly repo: AnnouncementRepository,
    private readonly access: BatchAccessPolicy,
    private readonly notifier: Notifier,
    private readonly webUrl: string,
  ) {}

  async mine(user: Actor, page: number, pageSize: number) {
    const batchIds = user.role === 'ADMIN' ? [] : await this.repo.memberBatchIds(user);
    const { items, total } = await this.repo.feed({ audiences: audiencesFor(user.role), batchIds }, (page - 1) * pageSize, pageSize);
    return { items: items.map(toItem), total, page, pageSize };
  }

  async listForBatch(batchId: string, user: Actor, page: number, pageSize: number) {
    if (!(await this.access.roleIn(batchId, user))) throw notClassMember();
    const { items, total } = await this.repo.listForBatch(batchId, (page - 1) * pageSize, pageSize);
    return { items: items.map(toItem), total, page, pageSize };
  }

  async postToBatch(batchId: string, input: BatchAnnouncementInput, user: Actor) {
    const role = await this.access.roleIn(batchId, user);
    if (!role) throw notClassMember();
    if (role === 'student') throw new ForbiddenError('Only the class teacher can post announcements');
    const { notify, ...data } = input;
    const a = await this.repo.create({ ...data, authorId: user.id, scope: 'BATCH', batchId, audience: 'ALL' });
    if (notify) {
      const recipients = (await this.repo.classMemberIds(batchId)).filter((id) => id !== user.id);
      const course = a.batch?.course.titleEn;
      if (recipients.length) {
        await this.notifier.notify(
          recipients,
          { type: 'ANNOUNCEMENT', title: course ? `${course}: ${a.title}` : a.title, body: preview(a.body), data: { announcementId: a.id, batchId } },
          { channels: ['in-app', 'realtime', 'push'] },
        );
      }
    }
    return toItem(a);
  }

  async postToPlatform(input: PlatformAnnouncementInput, user: Actor) {
    if (user.role !== 'ADMIN') throw new ForbiddenError();
    const { notify, ...data } = input;
    const a = await this.repo.create({ ...data, authorId: user.id, scope: 'PLATFORM', batchId: null });
    if (notify) {
      const recipients = (await this.repo.audienceUserIds(a.audience)).filter((id) => id !== user.id);
      const url = `${this.webUrl.replace(/\/$/, '')}/announcements`;
      if (recipients.length) {
        await this.notifier.notify(
          recipients,
          {
            type: 'ANNOUNCEMENT',
            title: a.title,
            body: preview(a.body),
            data: { announcementId: a.id },
            email: () => communicationEmails.announcement(a.title, a.body, url),
          },
          { channels: ['in-app', 'realtime', 'push', 'email'] },
        );
      }
    }
    return toItem(a);
  }

  async update(id: string, input: UpdateAnnouncementInput, user: Actor) {
    const a = await this.editable(id, user);
    const { audience, ...rest } = input;
    const updated = await this.repo.update(id, { ...rest, ...(a.scope === 'PLATFORM' && audience && { audience }) });
    return toItem(updated);
  }

  async remove(id: string, user: Actor) {
    await this.editable(id, user);
    await this.repo.delete(id);
    return { ok: true };
  }

  /** The author or an admin. */
  private async editable(id: string, user: Actor) {
    const a = await this.repo.find(id);
    if (!a) throw new NotFoundError('Announcement', id);
    if (user.role !== 'ADMIN' && a.authorId !== user.id) throw new ForbiddenError();
    return a;
  }
}

const preview = (body: string) => (body.length > 140 ? `${body.slice(0, 139)}…` : body);

export function toItem(a: AnnouncementRecord) {
  return {
    id: a.id,
    scope: a.scope,
    audience: a.audience,
    batch: a.batch ? { id: a.batch.id, code: a.batch.code, courseTitle: a.batch.course.titleEn, courseTitleAr: a.batch.course.titleAr } : null,
    title: a.title,
    body: a.body,
    pinned: a.pinned,
    author: a.author,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}
