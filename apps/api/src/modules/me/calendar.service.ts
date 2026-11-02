import type { Role } from '@azza/shared';
import { NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import { addDays, isoDay } from '../../core/time';
import type { CalendarTokenSigner } from './calendar-token';
import { buildIcs } from './ics-calendar';
import type { MeService } from './me.service';

const PAST_DAYS = 30;
const AHEAD_DAYS = 180;

/** ICS subscription feed of the sessions a user attends or teaches. */
export class CalendarService {
  constructor(
    private readonly me: Pick<MeService, 'schedule'>,
    private readonly users: { profile(userId: string): Promise<{ id: string; name: string; role: Role } | null> },
    private readonly signer: CalendarTokenSigner,
    private readonly clock: Clock,
    private readonly urls: { api: string; web: string },
  ) {}

  feedUrls(userId: string) {
    const url = `${this.urls.api.replace(/\/$/, '')}/api/calendar/${userId}/${this.signer.sign(userId)}.ics`;
    return { url, webcalUrl: url.replace(/^https?:/, 'webcal:') };
  }

  async feed(userId: string, token: string) {
    if (!this.signer.verify(userId, token)) throw new NotFoundError('Calendar');
    const user = await this.users.profile(userId);
    if (!user) throw new NotFoundError('Calendar');
    const today = isoDay(this.clock.now());
    const { items } = await this.me.schedule(user, {
      from: `${addDays(today, -PAST_DAYS)}T00:00:00.000Z`,
      to: `${addDays(today, AHEAD_DAYS)}T00:00:00.000Z`,
    });
    const web = this.urls.web.replace(/\/$/, '');
    const isTeacher = user.role !== 'STUDENT';
    return buildIcs(
      'Azza · live sessions',
      items.map((s) => ({
        uid: `${s.id}@azza`,
        start: s.startsAt,
        end: s.endsAt,
        summary: `${s.batch.course.titleEn} ${s.batch.code}·S${String(s.number).padStart(2, '0')} — ${s.title}`,
        description: `Teacher: ${s.batch.teacher.name}`,
        url: isTeacher ? `${web}/studio/sessions/${s.id}` : `${web}/live/${s.id}`,
        status: s.status,
        updatedAt: s.updatedAt,
      })),
      this.clock.now(),
    );
  }
}
