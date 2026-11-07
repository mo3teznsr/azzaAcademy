import { NotFoundError } from '../../core/errors';
import { scheduleSummary } from './schedule-summary';
import type { TeacherRepository } from './teacher.repository';

export class TeacherService {
  constructor(private readonly repo: TeacherRepository) {}

  /** `GET /teachers` — the public instructors directory; teachers with open batches first. */
  async list() {
    const rows = await this.repo.listTeachers();
    const items = rows.map(({ teaching, ...t }) => ({
      ...t,
      languages: [...new Set(teaching.map((b) => b.language))].sort(),
      categories: [...new Set(teaching.map((b) => b.course.category))].sort(),
      courses: [...new Map(teaching.map((b) => [b.course.id, { id: b.course.id, slug: b.course.slug, titleEn: b.course.titleEn, titleAr: b.course.titleAr }])).values()],
      openBatches: teaching.filter((b) => b.status === 'ENROLLING' || b.status === 'FULL').length,
    }));
    items.sort((a, b) => b.openBatches - a.openBatches || b.courses.length - a.courses.length);
    return { items };
  }

  /** `GET /teachers/:id` — public profile. 404 unless the user is a (non-banned) teacher. */
  async profile(id: string) {
    const teacher = await this.repo.findTeacher(id);
    if (!teacher) throw new NotFoundError('Teacher', id);
    const batches = await this.repo.publicBatches(id);
    const upcoming = batches.filter((b) => b.status === 'ENROLLING' || b.status === 'FULL');
    const held = await this.repo.heldSeats(upcoming.map((b) => b.id));

    const courses = [...new Map(batches.map((b) => [b.course.id, b.course])).values()].map(({ priceFils: _p, ...c }) => c);
    const languages = [...new Set(batches.map((b) => b.language))].sort();

    return {
      ...teacher,
      languages,
      courses,
      upcomingBatches: upcoming.map((b) => ({
        id: b.id,
        code: b.code,
        courseId: b.course.id,
        courseTitle: b.course.titleEn,
        courseTitleAr: b.course.titleAr,
        courseSlug: b.course.slug,
        language: b.language,
        timezone: b.timezone,
        startsOn: b.startsOn,
        scheduleSummary: scheduleSummary(b.schedule),
        seatsLeft: Math.max(0, b.capacity - (held.get(b.id) ?? 0)),
        status: b.status,
        priceFils: b.priceFils,
      })),
    };
  }
}
