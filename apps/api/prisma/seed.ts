/**
 * Idempotent seed for the design's sample world. Safe to run repeatedly:
 * every row is looked up by a natural key (email, slug, batch code, order reference) first.
 *
 *   bun run db:seed
 */
import type { Role } from '@azza/shared';
import { createAdapters, createContainer } from '../src/container';
import { loadConfig } from '../src/core/config';
import type { Mailer, PushNotifier } from '../src/core/ports';
import { addMinutes } from '../src/core/time';

const PASSWORD = 'password123';
const config = loadConfig();
const silentMailer: Mailer = { send: async () => {} };
const silentPush: PushNotifier = { send: async () => ({ invalidTokens: [] }) };
const adapters = { ...createAdapters(config), mailer: silentMailer, push: silentPush };
const container = createContainer(config, adapters);
const { db } = adapters;
const { auth, services } = container;

// ───────────────────────── users ─────────────────────────

async function ensureUser(name: string, email: string, role: Role, extra: { locale?: string; phone?: string } = {}) {
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    await auth.api.signUpEmail({ body: { name, email, password: PASSWORD } });
    user = await db.user.findUniqueOrThrow({ where: { email } });
  }
  return db.user.update({
    where: { id: user.id },
    data: { role, emailVerified: true, timezone: 'Asia/Dubai', locale: extra.locale ?? 'en', phone: extra.phone },
  });
}

const STUDENT_NAMES = [
  'Layla Hassan', 'Yousef Amin', 'Hana Mahmoud', 'Karim Nasser', 'Dana Khalil', 'Faris Odeh', 'Mariam Saeed', 'Ziad Fawzi',
  'Reem Al-Ali', 'Tariq Mansour', 'Salma Youssef', 'Adam Rahman', 'Leen Barakat', 'Hamza Qasim', 'Joud Darwish', 'Bilal Hamdan',
  'Aya Najjar', 'Khaled Ibrahim', 'Rania Aziz', 'Fadi Kanaan', 'Lara Mikhail', 'Sami Toukan', 'Nadia Shams',
];
const emailFor = (name: string) => `${name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.')}@azza.test`;

// ───────────────────────── catalog ─────────────────────────

const PDF_MODULES = [
  'Seeing like a designer', 'Research & interviews', 'Problem framing', 'Sketching & ideation', 'Information architecture',
  'Wireframes', 'Visual hierarchy', 'Typography & colour', 'Components & systems', 'Prototyping', 'Usability testing', 'Portfolio & critique',
];

const COURSES = [
  {
    slug: 'product-design-foundations',
    titleEn: 'Product Design Foundations',
    titleAr: 'أساسيات تصميم المنتجات',
    descriptionEn: 'Twelve live sessions from research to a portfolio-ready case study.',
    category: 'Design',
    level: 'BEGINNER' as const,
    coverStyle: 'sun',
    priceFils: 88_000,
    modules: PDF_MODULES,
  },
  {
    slug: 'spoken-arabic-a1',
    titleEn: 'Spoken Arabic A1',
    titleAr: 'العربية المحكية A1',
    descriptionEn: 'Gulf Arabic for everyday conversations.',
    category: 'Languages',
    level: 'BEGINNER' as const,
    coverStyle: 'sage',
    priceFils: 65_000,
    modules: ['Greetings', 'Numbers & time', 'Family', 'At the market', 'Directions', 'Food', 'Work', 'Weekend plans', 'Health', 'Review'],
  },
  {
    slug: 'python-for-data-l2',
    titleEn: 'Python for Data L2',
    titleAr: 'بايثون للبيانات - المستوى 2',
    descriptionEn: 'pandas, plotting and a real dataset project.',
    category: 'Data',
    level: 'INTERMEDIATE' as const,
    coverStyle: 'sky',
    priceFils: 120_000,
    modules: ['pandas refresher', 'Cleaning', 'Joins', 'Group-by', 'Time series', 'Plotting', 'Stats basics', 'APIs', 'Notebooks', 'Project I', 'Project II', 'Demo day'],
  },
  {
    slug: 'watercolour-l1',
    titleEn: 'Watercolour L1',
    titleAr: 'الألوان المائية - المستوى 1',
    descriptionEn: 'Washes, layering and loose botanicals.',
    category: 'Art',
    level: 'BEGINNER' as const,
    coverStyle: 'peach',
    priceFils: 54_000,
    modules: ['Materials', 'Flat & graded washes', 'Wet-in-wet', 'Layering', 'Botanicals', 'Final piece'],
  },
];

async function ensureCourse(c: (typeof COURSES)[number]) {
  const { modules, ...data } = c;
  return db.course.upsert({
    where: { slug: c.slug },
    create: { ...data, status: 'PUBLISHED', modules: { create: modules.map((titleEn, order) => ({ order, titleEn })) } },
    update: { ...data, status: 'PUBLISHED' },
  });
}

async function ensureBatch(args: {
  courseId: string;
  code: string;
  teacherId: string;
  capacity: number;
  language: 'AR' | 'EN';
  weekdays: number[];
  startTime: string;
  durationMin: number;
  sessionCount: number;
  startsOn: string;
  status: 'ENROLLING' | 'RUNNING' | 'FULL';
}) {
  const existing = await db.batch.findUnique({ where: { courseId_code: { courseId: args.courseId, code: args.code } } });
  if (existing) return existing;
  const created = await services.batches.create({
    courseId: args.courseId,
    code: args.code,
    teacherId: args.teacherId,
    capacity: args.capacity,
    language: args.language,
    timezone: 'Asia/Dubai',
    waitlistEnabled: true,
    minStudents: 6,
    schedule: {
      weekdays: args.weekdays,
      startTime: args.startTime,
      durationMin: args.durationMin,
      sessionCount: args.sessionCount,
      startsOn: args.startsOn,
      skipDates: [],
    },
  });
  return db.batch.update({ where: { id: created.id }, data: { status: args.status } });
}

// ───────────────────────── orders ─────────────────────────

const VAT = 0.05;
const stripeFee = (total: number) => Math.round(total * 0.029) + 100;

async function ensurePaidEnrollment(args: {
  userId: string;
  batchId: string;
  priceFils: number;
  reference: string;
  method: 'STRIPE' | 'BANK_TRANSFER';
  paidAt: Date;
  bankAccountId?: string;
  verifiedById?: string;
}) {
  const enrollment = await db.enrollment.upsert({
    where: { userId_batchId: { userId: args.userId, batchId: args.batchId } },
    create: { userId: args.userId, batchId: args.batchId, status: 'ACTIVE', createdAt: args.paidAt },
    update: {},
  });
  const vatFils = Math.round(args.priceFils * VAT);
  const totalFils = args.priceFils + vatFils;
  await db.order.upsert({
    where: { reference: args.reference },
    update: {},
    create: {
      reference: args.reference,
      enrollmentId: enrollment.id,
      userId: args.userId,
      method: args.method,
      status: 'PAID',
      subtotalFils: args.priceFils,
      vatFils,
      totalFils,
      receivedFils: totalFils,
      feeFils: args.method === 'STRIPE' ? stripeFee(totalFils) : 0,
      stripePaymentIntentId: args.method === 'STRIPE' ? `pi_seed_${args.reference}` : null,
      bankAccountId: args.bankAccountId,
      receiptUrl: args.method === 'BANK_TRANSFER' ? `https://files.azza.test/receipts/${args.reference}.pdf` : null,
      receiptUploadedAt: args.method === 'BANK_TRANSFER' ? addMinutes(args.paidAt, -600) : null,
      verifiedById: args.verifiedById,
      verifiedAt: args.verifiedById ? args.paidAt : null,
      paidAt: args.paidAt,
      createdAt: addMinutes(args.paidAt, -30),
    },
  });
  return enrollment;
}

// ───────────────────────── main ─────────────────────────

async function main() {
  console.info('Seeding users…');
  const nour = await ensureUser('Nour Adel', 'admin@azza.test', 'ADMIN');
  const lina = await ensureUser('Lina Haddad', 'lina@azza.test', 'TEACHER', { locale: 'ar' });
  const omar = await ensureUser('Omar Saleh', 'omar@azza.test', 'TEACHER', { locale: 'ar' });
  const maya = await ensureUser('Maya Chen', 'maya@azza.test', 'TEACHER');
  const tomas = await ensureUser('Tomás Rivera', 'tomas@azza.test', 'TEACHER');
  const sara = await ensureUser('Sara Kamal', 'sara@azza.test', 'STUDENT', { phone: '+971501234567' });
  const others = [];
  for (const name of STUDENT_NAMES) others.push(await ensureUser(name, emailFor(name), 'STUDENT'));
  const nadia = others.at(-1)!; // the student with the VERIFYING transfer
  const b07Students = [sara, ...others.slice(0, 22)];

  console.info('Seeding bank accounts, FX, coupons…');
  const banks = [
    { id: 'bank_enbd', bankName: 'Emirates NBD', swift: 'EBILAEAD', iban: 'AE070331234567890123456', branch: 'Dubai Mall', sortOrder: 0 },
    { id: 'bank_adcb', bankName: 'ADCB', swift: 'ADCBAEAA', iban: 'AE460030000123456789012', branch: 'Abu Dhabi Main', sortOrder: 1 },
    { id: 'bank_fab', bankName: 'First Abu Dhabi Bank', swift: 'NBADAEAA', iban: 'AE330350000098765432101', branch: 'Khalifa Street', sortOrder: 2 },
  ];
  for (const b of banks) {
    const data = { ...b, accountName: '[COMPANY LEGAL NAME]', currency: 'AED', active: true, instructions: 'Put your order reference (AZ-…) in the transfer notes.' };
    await db.bankAccount.upsert({ where: { id: b.id }, create: data, update: data });
  }
  for (const [currency, ratePerAed] of Object.entries({ SAR: 1.0211, QAR: 0.9912, USD: 0.2723 })) {
    await db.fxRate.upsert({ where: { currency }, create: { currency, ratePerAed, source: 'seed' }, update: {} });
  }
  await db.coupon.upsert({ where: { code: 'WELCOME10' }, create: { code: 'WELCOME10', percentOff: 10, maxRedemptions: 100 }, update: {} });
  await db.coupon.upsert({ where: { code: 'RAMADAN100' }, create: { code: 'RAMADAN100', amountOffFils: 10_000, expiresOn: new Date('2027-03-31T00:00:00Z') }, update: {} });

  console.info('Seeding courses & batches…');
  const seededCourses = [];
  for (const c of COURSES) seededCourses.push(await ensureCourse(c)); // sequential: nested writes must not share a connection
  const [pdf, arabic, python, watercolour] = seededCourses;
  const b07 = await ensureBatch({ courseId: pdf!.id, code: 'B07', teacherId: lina.id, capacity: 24, language: 'AR', weekdays: [2, 4], startTime: '19:00', durationMin: 90, sessionCount: 12, startsOn: '2026-11-10', status: 'RUNNING' });
  const b08 = await ensureBatch({ courseId: pdf!.id, code: 'B08', teacherId: lina.id, capacity: 24, language: 'EN', weekdays: [1, 3], startTime: '19:00', durationMin: 90, sessionCount: 12, startsOn: '2026-12-07', status: 'ENROLLING' });
  const b09 = await ensureBatch({ courseId: pdf!.id, code: 'B09', teacherId: lina.id, capacity: 20, language: 'EN', weekdays: [6, 0], startTime: '10:00', durationMin: 90, sessionCount: 12, startsOn: '2026-11-14', status: 'ENROLLING' });
  const arB01 = await ensureBatch({ courseId: arabic!.id, code: 'B01', teacherId: omar.id, capacity: 16, language: 'AR', weekdays: [0, 2], startTime: '20:00', durationMin: 60, sessionCount: 10, startsOn: '2026-11-15', status: 'ENROLLING' });
  const pyB01 = await ensureBatch({ courseId: python!.id, code: 'B01', teacherId: tomas.id, capacity: 20, language: 'EN', weekdays: [1, 3], startTime: '18:00', durationMin: 120, sessionCount: 12, startsOn: '2026-11-16', status: 'ENROLLING' });
  const wcB01 = await ensureBatch({ courseId: watercolour!.id, code: 'B01', teacherId: maya.id, capacity: 12, language: 'EN', weekdays: [6], startTime: '11:00', durationMin: 120, sessionCount: 6, startsOn: '2026-11-14', status: 'ENROLLING' });

  console.info('Seeding enrollments & orders…');
  // B07: 23 active (18 card, 5 bank transfer) + Nadia's transfer awaiting verification → 24/24 seats
  for (const [i, student] of b07Students.entries()) {
    const bank = i % 5 === 4;
    await ensurePaidEnrollment({
      userId: student.id,
      batchId: b07.id,
      priceFils: pdf!.priceFils,
      reference: `AZ-B07-${String(30_101 + i * 137)}`,
      method: bank ? 'BANK_TRANSFER' : 'STRIPE',
      bankAccountId: bank ? banks[i % 3]!.id : undefined,
      verifiedById: bank ? nour.id : undefined,
      paidAt: new Date(Date.UTC(2026, 9, 5 + i, 9, 30)),
    });
  }
  const nadiaEnrollment = await db.enrollment.upsert({
    where: { userId_batchId: { userId: nadia.id, batchId: b07.id } },
    create: { userId: nadia.id, batchId: b07.id, status: 'VERIFYING' },
    update: {},
  });
  await db.order.upsert({
    where: { reference: 'AZ-B07-48213' },
    update: {},
    create: {
      reference: 'AZ-B07-48213',
      enrollmentId: nadiaEnrollment.id,
      userId: nadia.id,
      method: 'BANK_TRANSFER',
      status: 'VERIFYING',
      subtotalFils: 88_000,
      vatFils: 4_400,
      totalFils: 92_400,
      bankAccountId: 'bank_enbd',
      receiptUrl: 'https://files.azza.test/receipts/AZ-B07-48213.jpg',
      receiptUploadedAt: new Date('2026-11-01T16:12:00Z'),
      expiresAt: new Date('2026-11-03T14:00:00Z'),
      createdAt: new Date('2026-11-01T14:00:00Z'),
    },
  });

  // B09 & other batches: a handful of card payments
  const smallCohorts: Array<[typeof b09, number, number, string]> = [
    [b09, pdf!.priceFils, 7, 'B09'],
    [arB01, arabic!.priceFils, 5, 'B01'],
    [pyB01, python!.priceFils, 6, 'B01'],
    [wcB01, watercolour!.priceFils, 4, 'B01'],
  ];
  for (const [batchIdx, [batch, price, count, code]] of smallCohorts.entries()) {
    for (let i = 0; i < count; i++) {
      const student = others[(i * 3 + batchIdx * 5) % 22]!;
      await ensurePaidEnrollment({
        userId: student.id,
        batchId: batch.id,
        priceFils: price,
        reference: `AZ-${code}-${String(50_000 + batchIdx * 1000 + i * 11)}`,
        method: 'STRIPE',
        paidAt: new Date(Date.UTC(2026, 9, 20 + i, 12, 0)),
      });
    }
  }
  // B08: 3 early birds (Sara is not enrolled — she checks out in the demo)
  for (let i = 0; i < 3; i++) {
    await ensurePaidEnrollment({
      userId: others[10 + i]!.id,
      batchId: b08.id,
      priceFils: pdf!.priceFils,
      reference: `AZ-B08-${String(60_100 + i * 7)}`,
      method: 'STRIPE',
      paidAt: new Date(Date.UTC(2026, 9, 28 + i, 12, 0)),
    });
  }

  console.info('Seeding delivered sessions S01–S04…');
  const b07Sessions = await db.liveSession.findMany({ where: { batchId: b07.id }, orderBy: { number: 'asc' } });
  for (const s of b07Sessions.slice(0, 4)) {
    await db.liveSession.update({
      where: { id: s.id },
      data: {
        status: 'ENDED',
        startedAt: addMinutes(s.startsAt, 2),
        endedAt: s.endsAt,
        recordingUrl: s.recordingUrl ?? `https://recordings.azza.test/b07/s${String(s.number).padStart(2, '0')}.mp4`,
        agenda: [
          { minute: 0, label: 'Warm-up & recap' },
          { minute: 15, label: s.title },
          { minute: 60, label: 'Studio time' },
          { minute: 80, label: 'Q&A' },
        ],
      },
    });
    if ((await db.attendance.count({ where: { sessionId: s.id } })) === 0) {
      const rows = b07Students
        .filter((_, i) => (i + s.number) % 9 !== 0) // ~89% attendance
        .map((student, i) => {
          const joinedAt = addMinutes(s.startsAt, (i % 6) + 1);
          const leftAt = s.endsAt;
          return { sessionId: s.id, userId: student.id, joinedAt, leftAt, seconds: Math.round((leftAt.getTime() - joinedAt.getTime()) / 1000) };
        });
      rows.push({ sessionId: s.id, userId: lina.id, joinedAt: s.startsAt, leftAt: s.endsAt, seconds: 90 * 60 });
      await db.attendance.createMany({ data: rows });
    }
    if ((await db.material.count({ where: { sessionId: s.id } })) === 0) {
      await db.material.create({
        data: { batchId: b07.id, sessionId: s.id, title: `S${String(s.number).padStart(2, '0')} slides · ${s.title}`, url: `https://files.azza.test/b07/s${s.number}.pdf`, kind: 'SLIDES' },
      });
    }
    if ((await db.chatMessage.count({ where: { sessionId: s.id } })) === 0) {
      await db.chatMessage.createMany({
        data: [
          { sessionId: s.id, userId: lina.id, body: 'مرحباً جميعاً! Welcome back 👋', createdAt: addMinutes(s.startsAt, 3) },
          { sessionId: s.id, userId: sara.id, body: 'Can you share the slides after class?', createdAt: addMinutes(s.startsAt, 40) },
          { sessionId: s.id, userId: lina.id, body: 'Yes — they are in Materials already.', createdAt: addMinutes(s.startsAt, 41) },
        ],
      });
    }
    for (const [i, student] of b07Students.slice(0, 6).entries()) {
      await db.sessionFeedback.upsert({
        where: { sessionId_userId: { sessionId: s.id, userId: student.id } },
        create: { sessionId: s.id, userId: student.id, rating: 4 + ((i + s.number) % 2), tags: ['clear', 'engaging'].slice(0, 1 + (i % 2)) },
        update: {},
      });
    }
    await services.payouts.accrueForSession(s.id);
  }

  if ((await db.assignment.count({ where: { batchId: b07.id } })) === 0) {
    const s04 = b07Sessions[3]!;
    const assignment = await db.assignment.create({
      data: {
        batchId: b07.id,
        sessionId: s04.id,
        title: 'Sketch 3 directions for the onboarding screen',
        description: 'Upload a photo or Figma link with three distinct sketches.',
        dueAt: addMinutes(b07Sessions[4]!.startsAt, -60),
      },
    });
    await db.submission.create({ data: { assignmentId: assignment.id, userId: sara.id, url: 'https://figma.com/file/sara-onboarding', submittedAt: addMinutes(s04.endsAt, 600) } });
  }

  console.info('Seeding teacher bank details…');
  const teacherBanks = [
    { user: lina, bankName: 'Emirates NBD', iban: 'AE120260001015555555501', swift: 'EBILAEAD', verified: true },
    { user: maya, bankName: 'Mashreq', iban: 'AE580330000019100000002', swift: 'BOMLAEAD', verified: true },
    { user: omar, bankName: 'ADCB', iban: 'AE690030000999999999903', swift: 'ADCBAEAA', verified: false },
  ];
  for (const t of teacherBanks) {
    const data = { bankName: t.bankName, accountHolder: t.user.name, iban: t.iban, swift: t.swift, verified: t.verified, verifiedAt: t.verified ? new Date('2026-10-01T09:00:00Z') : null };
    await db.teacherBankDetails.upsert({ where: { userId: t.user.id }, create: { userId: t.user.id, ...data }, update: {} });
  }

  if ((await db.notification.count({ where: { userId: sara.id } })) === 0) {
    await db.notification.createMany({
      data: [
        { userId: sara.id, type: 'ENROLLED', title: 'You’re enrolled · Product Design Foundations B07', body: 'First session Tue 10 Nov, 19:00', data: { batchId: b07.id }, readAt: new Date('2026-10-05T10:00:00Z'), createdAt: new Date('2026-10-05T09:31:00Z') },
        { userId: sara.id, type: 'RECORDING_READY', title: 'Recording ready · Problem framing', body: 'Product Design Foundations B07 S03', data: { sessionId: b07Sessions[2]!.id } },
        { userId: sara.id, type: 'SUBMISSION_GRADED', title: 'New assignment', body: 'Sketch 3 directions for the onboarding screen', data: { batchId: b07.id } },
      ],
    });
  }

  const counts = {
    users: await db.user.count(),
    batches: await db.batch.count(),
    b07Active: await db.enrollment.count({ where: { batchId: b07.id, status: 'ACTIVE' } }),
    orders: await db.order.count(),
    earnings: await db.earning.count(),
  };
  console.info('Seed complete', counts);
  console.info(`Sign in with any of admin@azza.test, lina@azza.test, sara@azza.test (password: ${PASSWORD})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
