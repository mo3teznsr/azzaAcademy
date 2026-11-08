/**
 * Idempotent seed for the design's sample world. Safe to run repeatedly:
 * every row is looked up by a natural key (email, slug, batch code, order reference) first.
 *
 *   bun run db:seed
 */
import { randomBytes } from 'node:crypto';
import type { Role } from '@azza/shared';
import { createAdapters, createContainer } from '../src/container';
import { loadConfig } from '../src/core/config';
import type { Mailer, PushNotifier } from '../src/core/ports';
import { addMinutes } from '../src/core/time';
import { DemoReviewers } from '../src/modules/sessions/demo-reviewers';

const PASSWORD = 'password123';
const config = loadConfig();
const silentMailer: Mailer = { send: async () => {} };
const silentPush: PushNotifier = { send: async () => ({ invalidTokens: [] }) };
const adapters = { ...createAdapters(config), mailer: silentMailer, push: silentPush };
const container = createContainer(config, adapters);
const { db } = adapters;
const { auth, services } = container;

// ───────────────────────── users ─────────────────────────

const SEED_ADMIN = { id: 'seed', role: 'ADMIN' as const };

async function ensureUser(
  name: string,
  email: string,
  role: Role,
  extra: { locale?: string; phone?: string; image?: string; headline?: string; bio?: string } = {},
) {
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    await auth.api.signUpEmail({ body: { name, email, password: PASSWORD } });
    user = await db.user.findUniqueOrThrow({ where: { email } });
  }
  return db.user.update({
    where: { id: user.id },
    data: {
      role,
      emailVerified: true,
      timezone: 'Asia/Dubai',
      locale: extra.locale ?? 'en',
      phone: extra.phone,
      ...(extra.image && { image: extra.image }),
      ...(extra.headline && { headline: extra.headline }),
      ...(extra.bio && { bio: extra.bio }),
    },
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

const CATEGORIES = [
  { slug: 'design', nameEn: 'Design', nameAr: 'التصميم', icon: 'pen-tool', order: 0 },
  { slug: 'languages', nameEn: 'Languages', nameAr: 'اللغات', icon: 'languages', order: 1 },
  { slug: 'data', nameEn: 'Data & AI', nameAr: 'البيانات والذكاء الاصطناعي', icon: 'chart-line', order: 2 },
  { slug: 'art', nameEn: 'Art', nameAr: 'الفنون', icon: 'palette', order: 3 },
  { slug: 'business', nameEn: 'Business', nameAr: 'الأعمال', icon: 'briefcase', order: 4 },
  { slug: 'technology', nameEn: 'Technology', nameAr: 'التقنية', icon: 'code', order: 5 },
  { slug: 'quran-arabic', nameEn: 'Quran & Arabic', nameAr: 'القرآن والعربية', icon: 'book-open', order: 6 },
  { slug: 'personal-growth', nameEn: 'Personal growth', nameAr: 'تطوير الذات', icon: 'sprout', order: 7 },
];

type CourseDetail = {
  outcomesEn: string[]; outcomesAr: string[];
  requirementsEn: string[]; requirementsAr: string[];
  audienceEn: string[]; audienceAr: string[];
  faq: Array<{ qEn: string; aEn: string; qAr: string; aAr: string }>;
};

const FAQ_COMMON = [
  { qEn: 'What if I miss a session?', aEn: 'Every session is recorded and stays in your library.', qAr: 'ماذا لو فاتتني جلسة؟', aAr: 'كل جلسة مسجلة وتبقى في مكتبتك.' },
  { qEn: 'Do I get a certificate?', aEn: 'Yes — attend most sessions and pass the assignments.', qAr: 'هل أحصل على شهادة؟', aAr: 'نعم — احضر معظم الجلسات واجتز الواجبات.' },
];

/** FAQ for recorded courses: a plan, not a class. */
const FAQ_RECORDED = [
  { qEn: 'Can I try it first?', aEn: 'Yes. The first lesson is free to watch, no plan needed.', qAr: 'هل يمكنني التجربة أولًا؟', aAr: 'نعم، الدرس الأول مجاني ولا يحتاج إلى اشتراك.' },
  { qEn: 'Can I cancel any time?', aEn: 'Yes. You keep access until the end of the period you paid for.', qAr: 'هل يمكنني الإلغاء في أي وقت؟', aAr: 'نعم، ويبقى وصولك حتى نهاية المدة التي دفعت مقابلها.' },
  { qEn: 'What happens to my progress if my plan ends?', aEn: 'It is saved. Renew any time and pick up where you left off.', qAr: 'ماذا يحدث لتقدّمي إذا انتهى اشتراكي؟', aAr: 'يبقى محفوظًا، جدّد متى شئت وتابع من حيث توقفت.' },
  { qEn: 'Do I get a certificate?', aEn: 'Yes. Finish every lesson and pass every quiz.', qAr: 'هل أحصل على شهادة؟', aAr: 'نعم، بعد إتمام جميع الدروس واجتياز جميع الاختبارات.' },
];

/** Rich detail for the catalog demo (outcomes, requirements, audience, FAQ), one per course. */
const DETAIL: Record<string, CourseDetail> = {
  'product-design-foundations': {
    outcomesEn: ['Run user interviews and turn them into insights', 'Sketch, wireframe and prototype in Figma', 'Present a portfolio-ready case study'],
    outcomesAr: ['إجراء مقابلات المستخدمين وتحويلها إلى رؤى', 'الرسم والتخطيط والنماذج الأولية في Figma', 'تقديم دراسة حالة جاهزة لملف الأعمال'],
    requirementsEn: ['A laptop with a modern browser', 'No design experience needed'],
    requirementsAr: ['حاسوب محمول بمتصفح حديث', 'لا تحتاج إلى خبرة سابقة في التصميم'],
    audienceEn: ['Career switchers into product design', 'Developers and PMs who work with designers'],
    audienceAr: ['من يرغب في الانتقال إلى تصميم المنتجات', 'المطورون ومديرو المنتجات الذين يعملون مع المصممين'],
    faq: FAQ_COMMON,
  },
  'spoken-arabic-a1': {
    outcomesEn: ['Hold a short everyday conversation in Gulf Arabic', 'Count, tell the time and shop at the market', 'Introduce yourself and your family'],
    outcomesAr: ['إجراء محادثة يومية قصيرة باللهجة الخليجية', 'العد ومعرفة الوقت والتسوق في السوق', 'التعريف بنفسك وبعائلتك'],
    requirementsEn: ['No Arabic needed — we start from greetings', 'A microphone for speaking practice'],
    requirementsAr: ['لا تحتاج إلى معرفة العربية — نبدأ من التحيات', 'ميكروفون لتمارين المحادثة'],
    audienceEn: ['Newcomers to the UAE and the Gulf', 'Heritage learners who understand but rarely speak'],
    audienceAr: ['القادمون الجدد إلى الإمارات والخليج', 'من يفهم العربية لكنه نادرًا ما يتحدثها'],
    faq: FAQ_COMMON,
  },
  'python-for-data-l2': {
    outcomesEn: ['Clean, join and reshape real datasets with pandas', 'Plot clear charts and explain them', 'Ship a small data project end to end'],
    outcomesAr: ['تنظيف البيانات الحقيقية ودمجها وإعادة تشكيلها باستخدام pandas', 'رسم مخططات واضحة وشرحها', 'إنجاز مشروع بيانات صغير من البداية إلى النهاية'],
    requirementsEn: ['Python basics: variables, loops, functions', 'A laptop that can run Jupyter'],
    requirementsAr: ['أساسيات بايثون: المتغيرات والحلقات والدوال', 'حاسوب يمكنه تشغيل Jupyter'],
    audienceEn: ['Analysts moving from spreadsheets to code', 'Developers who want practical data skills'],
    audienceAr: ['المحللون المنتقلون من الجداول إلى البرمجة', 'المطورون الراغبون في مهارات بيانات عملية'],
    faq: FAQ_COMMON,
  },
  'watercolour-l1': {
    outcomesEn: ['Lay flat and graded washes with control', 'Paint wet-in-wet and build layers', 'Finish a loose botanical piece'],
    outcomesAr: ['وضع طبقات لونية مستوية ومتدرجة بتحكم', 'الرسم بتقنية الرطب على الرطب وبناء الطبقات', 'إنهاء لوحة نباتية بأسلوب حر'],
    requirementsEn: ['Watercolour paper, a round brush and a basic paint set', 'No drawing experience needed'],
    requirementsAr: ['ورق ألوان مائية وفرشاة دائرية وعلبة ألوان أساسية', 'لا تحتاج إلى خبرة في الرسم'],
    audienceEn: ['Complete beginners who want a calm creative hobby', 'Sketchers ready to add colour'],
    audienceAr: ['المبتدئون الباحثون عن هواية إبداعية هادئة', 'من يرسم بالقلم ويريد إضافة الألوان'],
    faq: FAQ_COMMON,
  },
};

const COURSES = [
  {
    slug: 'product-design-foundations',
    coverImageUrl: '/media/courses/product-design-foundations.jpg',
    titleEn: 'Product Design Foundations',
    titleAr: 'أساسيات تصميم المنتجات',
    descriptionEn: 'From user research to a portfolio-ready case study, one module at a time.',
    descriptionAr: 'من أبحاث المستخدمين إلى دراسة حالة جاهزة لملف أعمالك، وحدةً بعد وحدة.',
    category: 'design',
    level: 'BEGINNER' as const,
    coverStyle: 'sun',
    priceFils: 88_000,
    modules: PDF_MODULES,
  },
  {
    slug: 'spoken-arabic-a1',
    coverImageUrl: '/media/courses/spoken-arabic-a1.jpg',
    titleEn: 'Spoken Arabic A1',
    titleAr: 'العربية المحكية A1',
    descriptionEn: 'Gulf Arabic for everyday conversations.',
    descriptionAr: 'اللهجة الخليجية لمحادثات الحياة اليومية.',
    category: 'languages',
    level: 'BEGINNER' as const,
    coverStyle: 'sage',
    priceFils: 65_000,
    modules: ['Greetings', 'Numbers & time', 'Family', 'At the market', 'Directions', 'Food', 'Work', 'Weekend plans', 'Health', 'Review'],
  },
  {
    slug: 'python-for-data-l2',
    coverImageUrl: '/media/courses/python-for-data-l2.jpg',
    titleEn: 'Python for Data L2',
    titleAr: 'بايثون للبيانات - المستوى 2',
    descriptionEn: 'pandas, plotting and a real dataset project.',
    descriptionAr: 'مكتبة pandas والرسوم البيانية ومشروع على بيانات حقيقية.',
    category: 'data',
    level: 'INTERMEDIATE' as const,
    coverStyle: 'sky',
    priceFils: 120_000,
    modules: ['pandas refresher', 'Cleaning', 'Joins', 'Group-by', 'Time series', 'Plotting', 'Stats basics', 'APIs', 'Notebooks', 'Project I', 'Project II', 'Demo day'],
  },
  {
    slug: 'watercolour-l1',
    coverImageUrl: '/media/courses/watercolour-l1.jpg',
    titleEn: 'Watercolour L1',
    titleAr: 'الألوان المائية - المستوى 1',
    descriptionEn: 'Washes, layering and loose botanicals.',
    descriptionAr: 'الطبقات اللونية والتدرّج ورسم النباتات بأسلوب حرّ.',
    category: 'art',
    level: 'BEGINNER' as const,
    coverStyle: 'peach',
    priceFils: 54_000,
    modules: ['Materials', 'Flat & graded washes', 'Wet-in-wet', 'Layering', 'Botanicals', 'Final piece'],
  },
];

async function ensureCategories() {
  for (const c of CATEGORIES) await db.category.upsert({ where: { slug: c.slug }, create: c, update: c });
}

async function ensureCourse(c: (typeof COURSES)[number]) {
  const { modules, ...rest } = c;
  const data = { ...rest, ...DETAIL[c.slug] };
  return db.course.upsert({
    where: { slug: c.slug },
    create: { ...data, status: 'PUBLISHED', modules: { create: modules.map((titleEn, order) => ({ order, titleEn })) } },
    update: { ...data, status: 'PUBLISHED' },
  });
}

/** A RECORDED course: 2 modules x 2 lessons, a preview lesson and a published course quiz. Re-runnable (natural keys: slug, order, title). */
async function ensureRecordedCourse(teacherId: string) {
  const slug = 'excel-for-everyday-work';
  const videoUrl = process.env.DEMO_RECORDING_URL?.trim() || 'https://recordings.azza.test/excel/intro.mp4';
  const base = {
    titleEn: 'Excel for Everyday Work',
    titleAr: 'إكسل للعمل اليومي',
    descriptionEn: 'Self-paced Excel: tidy data, formulas and quick summaries for the tasks you actually do.',
    descriptionAr: 'إكسل بالسرعة التي تناسبك: ترتيب البيانات والصيغ وملخصات سريعة للمهام التي تؤديها فعلًا.',
    category: 'business',
    level: 'BEGINNER' as const,
    type: 'RECORDED' as const,
    coverStyle: 'sky',
    priceFils: 4_900,
    monthlyPriceFils: 4_900,
    yearlyPriceFils: 49_000,
    status: 'PUBLISHED' as const,
    createdById: teacherId,
    outcomesEn: ['Build clean, well-formatted tables', 'Use the formulas you need every day', 'Summarise data with a pivot table'],
    outcomesAr: ['بناء جداول نظيفة ومنسقة', 'استخدام الصيغ التي تحتاجها يوميًا', 'تلخيص البيانات بجدول محوري'],
    requirementsEn: ['Excel on a laptop or desktop', 'No prior experience needed'],
    requirementsAr: ['برنامج إكسل على حاسوب', 'لا تحتاج إلى خبرة سابقة'],
    audienceEn: ['Office staff who live in spreadsheets', 'Students preparing for their first job'],
    audienceAr: ['موظفو المكاتب الذين يعتمدون على الجداول', 'الطلاب الذين يستعدون لوظيفتهم الأولى'],
    faq: FAQ_RECORDED,
  };
  const course = await db.course.upsert({ where: { slug }, create: { slug, ...base }, update: base });

  const modules = [
    {
      titleEn: 'Getting started', titleAr: 'البداية',
      lessons: [
        { titleEn: 'The Excel workspace', titleAr: 'بيئة إكسل', bodyEn: 'A quick tour of the ribbon, cells and sheets.', bodyAr: 'جولة سريعة في الشريط والخلايا وأوراق العمل.', videoUrl },
        { titleEn: 'Entering and formatting data', titleAr: 'إدخال البيانات وتنسيقها', bodyEn: 'Type, fill and format a simple table.', bodyAr: 'اكتب البيانات واملأها ونسّق جدولًا بسيطًا.', videoUrl: null },
      ],
    },
    {
      titleEn: 'Formulas and summaries', titleAr: 'الصيغ والملخصات',
      lessons: [
        { titleEn: 'Everyday formulas', titleAr: 'الصيغ اليومية', bodyEn: 'SUM, AVERAGE and IF in real examples.', bodyAr: 'الدوال SUM وAVERAGE وIF في أمثلة حقيقية.', videoUrl: null },
        { titleEn: 'Pivot tables in five minutes', titleAr: 'الجداول المحورية في خمس دقائق', bodyEn: 'Summarise a list by category.', bodyAr: 'لخّص قائمة بحسب الفئة.', videoUrl: null },
      ],
    },
  ];
  const lessonIds: string[] = [];
  for (const [mi, m] of modules.entries()) {
    const { lessons, ...mdata } = m;
    const mod = await db.courseModule.upsert({
      where: { courseId_order: { courseId: course.id, order: mi } },
      create: { courseId: course.id, order: mi, ...mdata },
      update: mdata,
    });
    for (const [li, l] of lessons.entries()) {
      const existing = await db.lesson.findFirst({ where: { moduleId: mod.id, order: li } });
      const lesson = existing
        ? await db.lesson.update({ where: { id: existing.id }, data: l })
        : await db.lesson.create({ data: { moduleId: mod.id, order: li, ...l } });
      lessonIds.push(lesson.id);
    }
  }
  await db.course.update({ where: { id: course.id }, data: { previewLessonId: lessonIds[0]! } });

  const opt = (id: string, textEn: string, textAr: string, correct: boolean) => ({ id, textEn, textAr, correct });
  const quizData = {
    description: 'Check what you learned in the course.',
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2026-11-01T00:00:00Z'),
    maxAttempts: 3,
    passPercent: 70,
    questions: [
      {
        id: 'q1', type: 'SINGLE', promptEn: 'Which formula adds the values in A1 to A5?', promptAr: 'أي صيغة تجمع القيم من A1 إلى A5؟', points: 1,
        options: [opt('a', '=SUM(A1:A5)', '=SUM(A1:A5)', true), opt('b', '=ADD(A1:A5)', '=ADD(A1:A5)', false), opt('c', '=TOTAL(A1,A5)', '=TOTAL(A1,A5)', false)],
      },
      {
        id: 'q2', type: 'SINGLE', promptEn: 'What does a pivot table do?', promptAr: 'ماذا يفعل الجدول المحوري؟', points: 1,
        options: [opt('a', 'Summarises data by category', 'يلخّص البيانات بحسب الفئة', true), opt('b', 'Rotates the page', 'يدوّر الصفحة', false), opt('c', 'Locks the sheet', 'يقفل الورقة', false)],
      },
    ],
  };
  const title = 'Excel basics check';
  const quiz = await db.quiz.findFirst({ where: { courseId: course.id, title } });
  if (quiz) await db.quiz.update({ where: { id: quiz.id }, data: quizData });
  else await db.quiz.create({ data: { courseId: course.id, batchId: null, title, ...quizData } });
  return course;
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
  status: 'ENROLLING' | 'RUNNING' | 'FULL' | 'COMPLETED';
}) {
  const existing = await db.batch.findUnique({ where: { courseId_code: { courseId: args.courseId, code: args.code } } });
  if (existing) return existing;
  // Every batch carries its own price; the seed starts each batch at its course's list price.
  const coursePrice = (await db.course.findUniqueOrThrow({ where: { id: args.courseId }, select: { priceFils: true } })).priceFils ?? 50_000;
  const created = await services.batches.create({
    courseId: args.courseId,
    code: args.code,
    priceAed: coursePrice / 100,
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
  }, SEED_ADMIN);
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
  const lina = await ensureUser('Lina Haddad', 'lina@azza.test', 'TEACHER', {
    locale: 'ar',
    image: '/media/teachers/lina-haddad.jpg',
    headline: 'Product designer',
    bio: 'Product designer with ten years of work on mobile and web apps. Teaches research, wireframing and visual design through weekly hands-on projects.',
  });
  const omar = await ensureUser('Omar Saleh', 'omar@azza.test', 'TEACHER', {
    locale: 'ar',
    image: '/media/teachers/omar-saleh.jpg',
    headline: 'Arabic language teacher',
    bio: 'Teaches Gulf Arabic to adult beginners. Classes focus on everyday conversation, listening and pronunciation.',
  });
  const maya = await ensureUser('Maya Chen', 'maya@azza.test', 'TEACHER', {
    image: '/media/teachers/maya-chen.jpg',
    headline: 'Illustrator and watercolour painter',
    bio: 'Illustrator working mainly in watercolour. Teaches washes, layering and botanical painting in small groups.',
  });
  const tomas = await ensureUser('Tomás Rivera', 'tomas@azza.test', 'TEACHER', {
    image: '/media/teachers/tomas-rivera.jpg',
    headline: 'Data analyst',
    bio: 'Data analyst using Python and pandas day to day. Teaches data cleaning, analysis and plotting with real datasets.',
  });
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
  await ensureCategories();
  for (const c of COURSES) seededCourses.push(await ensureCourse(c)); // sequential: nested writes must not share a connection
  const [pdf, arabic, python, watercolour] = seededCourses;
  const earlybird = { percentOff: 10, courseId: pdf!.id, perUserLimit: 1, maxRedemptions: 50, startsOn: new Date('2026-10-01T00:00:00Z'), expiresOn: new Date('2026-12-31T00:00:00Z') };
  await db.coupon.upsert({ where: { code: 'EARLYBIRD' }, create: { code: 'EARLYBIRD', ...earlybird }, update: { courseId: pdf!.id } });
  const b07 = await ensureBatch({ courseId: pdf!.id, code: 'B07', teacherId: lina.id, capacity: 24, language: 'AR', weekdays: [2, 4], startTime: '19:00', durationMin: 90, sessionCount: 12, startsOn: '2026-11-10', status: 'RUNNING' });
  const b08 = await ensureBatch({ courseId: pdf!.id, code: 'B08', teacherId: lina.id, capacity: 24, language: 'EN', weekdays: [1, 3], startTime: '19:00', durationMin: 90, sessionCount: 12, startsOn: '2026-12-07', status: 'ENROLLING' });
  const b09 = await ensureBatch({ courseId: pdf!.id, code: 'B09', teacherId: lina.id, capacity: 20, language: 'EN', weekdays: [6, 0], startTime: '10:00', durationMin: 90, sessionCount: 12, startsOn: '2026-11-14', status: 'ENROLLING' });
  const arB01 = await ensureBatch({ courseId: arabic!.id, code: 'B01', teacherId: omar.id, capacity: 16, language: 'AR', weekdays: [0, 2], startTime: '20:00', durationMin: 60, sessionCount: 10, startsOn: '2026-11-15', status: 'ENROLLING' });
  const pyB01 = await ensureBatch({ courseId: python!.id, code: 'B01', teacherId: tomas.id, capacity: 20, language: 'EN', weekdays: [1, 3], startTime: '18:00', durationMin: 120, sessionCount: 12, startsOn: '2026-11-16', status: 'ENROLLING' });
  // B06: a finished cohort (Sep–Oct) so certificates, completion and the previous report period have data
  const b06 = await ensureBatch({ courseId: pdf!.id, code: 'B06', teacherId: lina.id, capacity: 12, language: 'EN', weekdays: [2, 4], startTime: '19:00', durationMin: 90, sessionCount: 12, startsOn: '2026-09-01', status: 'COMPLETED' });
  // Arabic B02: a small FULL batch with a waitlist (Sara is second in line)
  const arB02 = await ensureBatch({ courseId: arabic!.id, code: 'B02', teacherId: omar.id, capacity: 4, language: 'AR', weekdays: [1, 3], startTime: '20:00', durationMin: 60, sessionCount: 10, startsOn: '2026-11-23', status: 'FULL' });
  const wcB01 = await ensureBatch({ courseId: watercolour!.id, code: 'B01', teacherId: maya.id, capacity: 12, language: 'EN', weekdays: [6], startTime: '11:00', durationMin: 120, sessionCount: 6, startsOn: '2026-11-14', status: 'ENROLLING' });

  console.info('Seeding enrollments & orders…');
  // B07: 23 active (18 card, 5 bank transfer) + Nadia's transfer awaiting verification → 24/24 seats
  for (const [i, student] of b07Students.entries()) {
    const bank = i % 5 === 4;
    await ensurePaidEnrollment({
      userId: student.id,
      batchId: b07.id,
      priceFils: pdf!.priceFils!,
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
    [b09, pdf!.priceFils!, 7, 'B09'],
    [arB01, arabic!.priceFils!, 5, 'B01'],
    [pyB01, python!.priceFils!, 6, 'B01'],
    [wcB01, watercolour!.priceFils!, 4, 'B01'],
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
      priceFils: pdf!.priceFils!,
      reference: `AZ-B08-${String(60_100 + i * 7)}`,
      method: 'STRIPE',
      paidAt: new Date(Date.UTC(2026, 9, 28 + i, 12, 0)),
    });
  }

  // B06 (COMPLETED): Sara + 7 classmates, paid in August
  const b06Students = [sara, ...others.slice(0, 7)];
  for (const [i, student] of b06Students.entries()) {
    await ensurePaidEnrollment({
      userId: student.id,
      batchId: b06.id,
      priceFils: pdf!.priceFils!,
      reference: `AZ-B06-${String(20_101 + i * 113)}`,
      method: 'STRIPE',
      paidAt: new Date(Date.UTC(2026, 7, 18 + i, 10, 0)),
    });
  }

  // Arabic B02 (FULL, 4/4): four paid seats, then two people waiting — Lara first, Sara second
  for (let i = 0; i < 4; i++) {
    await ensurePaidEnrollment({
      userId: others[14 + i]!.id,
      batchId: arB02.id,
      priceFils: arabic!.priceFils!,
      reference: `AZ-B02-${String(70_100 + i * 9)}`,
      method: 'STRIPE',
      paidAt: new Date(Date.UTC(2026, 9, 25 + i, 12, 0)),
    });
  }
  for (const [student, joinedAt] of [
    [others[20]!, new Date('2026-10-30T08:00:00Z')],
    [sara, new Date('2026-11-01T18:30:00Z')],
  ] as const) {
    await db.enrollment.upsert({
      where: { userId_batchId: { userId: student.id, batchId: arB02.id } },
      create: { userId: student.id, batchId: arB02.id, status: 'WAITLISTED', createdAt: joinedAt },
      update: {},
    });
  }

  console.info('Seeding the finished B06 cohort…');
  const b06Sessions = await db.liveSession.findMany({ where: { batchId: b06.id }, orderBy: { number: 'asc' } });
  for (const s of b06Sessions) {
    await db.liveSession.update({
      where: { id: s.id },
      // every 4th session started 8 min late (on-time rate in reports)
      data: { status: 'ENDED', startedAt: addMinutes(s.startsAt, s.number % 4 === 0 ? 8 : 1), endedAt: s.endsAt },
    });
    if ((await db.attendance.count({ where: { sessionId: s.id } })) === 0) {
      const rows = b06Students
        .filter((_, i) => {
          if (i === 0) return s.number !== 5; // Sara: 11 of 12 → certificate
          if (i === 7) return s.number % 2 === 0 || s.number < 3; // Mariam: 7 of 12 → no certificate
          return (i + s.number) % 7 !== 0; // the rest: 10–11 of 12
        })
        .map((student, i) => {
          const joinedAt = addMinutes(s.startsAt, (i % 5) + 1);
          return { sessionId: s.id, userId: student.id, joinedAt, leftAt: s.endsAt, seconds: Math.round((s.endsAt.getTime() - joinedAt.getTime()) / 1000) };
        });
      rows.push({ sessionId: s.id, userId: lina.id, joinedAt: s.startsAt, leftAt: s.endsAt, seconds: 90 * 60 });
      await db.attendance.createMany({ data: rows });
    }
    await services.payouts.accrueForSession(s.id);
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

  const excel = await ensureRecordedCourse(tomas.id);
  console.info(`Recorded course: ${excel.slug} (${excel.id})`);

  const counts = {
    users: await db.user.count(),
    batches: await db.batch.count(),
    b07Active: await db.enrollment.count({ where: { batchId: b07.id, status: 'ACTIVE' } }),
    orders: await db.order.count(),
    earnings: await db.earning.count(),
  };
  console.info('Seed complete', counts);
  console.info(`Sign in with any of admin@azza.test, lina@azza.test, sara@azza.test (password: ${PASSWORD})`);

  await seedAppReviewer({ maya, lina, watercolour: watercolour!, pdf: pdf!, b06, b06Sessions });
}

// ───────────────────────── App Store review account ─────────────────────────

const REVIEWER_EMAIL = 'appreview@azza.academy';

/**
 * `appreview@azza.academy`: a paid student with something on every main screen — upcoming sessions in a private
 * batch (Watercolour B90, capacity 1, no waitlist, so no real student shares it), past sessions with recordings in
 * the library, and a certificate from the completed Product Design B06 cohort. List the email in
 * DEMO_REVIEWER_EMAILS so the API lets it into any of its sessions at any time (see DemoReviewers).
 *
 * Password: DEMO_REVIEWER_PASSWORD (also re-applied on every run, so rotating it is "change env, re-seed").
 * Without it a random one is generated and printed once, when the account is created.
 */
async function seedAppReviewer(ctx: {
  maya: { id: string };
  lina: { id: string };
  watercolour: { id: string; priceFils: number | null; slug: string };
  pdf: { id: string; priceFils: number | null };
  b06: { id: string };
  b06Sessions: { id: string; number: number; startsAt: Date; endsAt: Date }[];
}) {
  console.info('Seeding the App Store review account…');
  const envPassword = process.env.DEMO_REVIEWER_PASSWORD?.trim();
  if (envPassword !== undefined && envPassword !== '' && envPassword.length < 12) {
    throw new Error('DEMO_REVIEWER_PASSWORD must be at least 12 characters');
  }
  let user = await db.user.findUnique({ where: { email: REVIEWER_EMAIL } });
  let printedPassword: string | null = null;
  if (!user) {
    const password = envPassword || randomBytes(18).toString('base64url');
    await auth.api.signUpEmail({ body: { name: 'App Review', email: REVIEWER_EMAIL, password } });
    user = await db.user.findUniqueOrThrow({ where: { email: REVIEWER_EMAIL } });
    if (!envPassword) printedPassword = password;
  } else if (envPassword) {
    const hash = await (await auth.$context).password.hash(envPassword);
    await db.account.updateMany({ where: { userId: user.id, providerId: 'credential' }, data: { password: hash } });
  }
  const reviewer = await db.user.update({
    where: { id: user.id },
    data: { role: 'STUDENT', emailVerified: true, timezone: 'Asia/Dubai', locale: 'en' },
  });

  // Private batch: started two weeks ago, three sessions a week for about a year → always upcoming sessions.
  const today = new Date();
  const startsOn = addMinutes(today, -14 * 24 * 60).toISOString().slice(0, 10);
  let batch = await db.batch.findUnique({ where: { courseId_code: { courseId: ctx.watercolour.id, code: 'B90' } } });
  if (!batch) {
    const modules = COURSES.find((c) => c.slug === ctx.watercolour.slug)!.modules;
    const created = await services.batches.create({
      courseId: ctx.watercolour.id,
      code: 'B90',
      priceAed: (ctx.watercolour.priceFils ?? 54_000) / 100,
      teacherId: ctx.maya.id,
      capacity: 1,
      language: 'EN',
      timezone: 'Asia/Dubai',
      waitlistEnabled: false,
      minStudents: 1,
      schedule: { weekdays: [1, 3, 5], startTime: '12:00', durationMin: 60, sessionCount: 150, startsOn, skipDates: [] },
      sessionTitles: Array.from({ length: 150 }, (_, i) => `${modules[i % modules.length]} · studio ${Math.floor(i / modules.length) + 1}`),
    }, SEED_ADMIN);
    batch = await db.batch.update({ where: { id: created.id }, data: { status: 'RUNNING' } });
  }
  await ensurePaidEnrollment({
    userId: reviewer.id,
    batchId: batch.id,
    priceFils: ctx.watercolour.priceFils!,
    reference: 'AZ-B90-90001',
    method: 'STRIPE',
    paidAt: addMinutes(new Date(`${startsOn}T08:00:00Z`), -3 * 24 * 60),
  });

  // Sessions already in the past: delivered, attended, recorded.
  const recordingBase = process.env.DEMO_RECORDING_URL?.trim();
  const past = await db.liveSession.findMany({ where: { batchId: batch.id, status: 'SCHEDULED', endsAt: { lt: today } }, orderBy: { number: 'asc' } });
  for (const s of past) {
    await db.liveSession.update({
      where: { id: s.id },
      data: {
        status: 'ENDED',
        startedAt: addMinutes(s.startsAt, 1),
        endedAt: s.endsAt,
        recordingUrl: recordingBase || `https://recordings.azza.test/b90/s${String(s.number).padStart(2, '0')}.mp4`,
      },
    });
    const seconds = Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 1000) - 120;
    await db.attendance.createMany({
      data: [
        { sessionId: s.id, userId: reviewer.id, joinedAt: addMinutes(s.startsAt, 2), leftAt: s.endsAt, seconds },
        { sessionId: s.id, userId: ctx.maya.id, joinedAt: s.startsAt, leftAt: s.endsAt, seconds: seconds + 120 },
      ],
    });
  }

  // Certificate: a seat in the completed B06 cohort with 11 of 12 sessions attended (issued on GET /me/certificates).
  await ensurePaidEnrollment({
    userId: reviewer.id,
    batchId: ctx.b06.id,
    priceFils: ctx.pdf.priceFils!,
    reference: 'AZ-B06-90002',
    method: 'STRIPE',
    paidAt: new Date(Date.UTC(2026, 7, 25, 10, 0)),
  });
  if ((await db.attendance.count({ where: { userId: reviewer.id, sessionId: { in: ctx.b06Sessions.map((s) => s.id) } } })) === 0) {
    await db.attendance.createMany({
      data: ctx.b06Sessions
        .filter((s) => s.number !== 7)
        .map((s) => {
          const joinedAt = addMinutes(s.startsAt, 3);
          return { sessionId: s.id, userId: reviewer.id, joinedAt, leftAt: s.endsAt, seconds: Math.round((s.endsAt.getTime() - joinedAt.getTime()) / 1000) };
        }),
    });
  }

  if (!DemoReviewers.fromCsv(config.DEMO_REVIEWER_EMAILS).isDemo(REVIEWER_EMAIL)) {
    console.warn(`! ${REVIEWER_EMAIL} is not in DEMO_REVIEWER_EMAILS — the API will apply the normal lobby rules to it.`);
  }
  if (!recordingBase) console.warn('! DEMO_REVIEWER: set DEMO_RECORDING_URL to a playable MP4 so the reviewer\'s recordings play.');
  if (printedPassword) {
    console.info(`App Review account created: ${REVIEWER_EMAIL} / ${printedPassword}  (shown once — set DEMO_REVIEWER_PASSWORD to choose it)`);
  } else {
    console.info(`App Review account: ${REVIEWER_EMAIL} (password ${envPassword ? 'from DEMO_REVIEWER_PASSWORD' : 'unchanged'})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
