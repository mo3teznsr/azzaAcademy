// Email bodies in English and Arabic, picked by the recipient's locale. Kept separate from delivery (SRP).

type Lang = 'en' | 'ar';
const langOf = (locale: string | null | undefined): Lang => (locale?.startsWith('ar') ? 'ar' : 'en');

const FOOTER: Record<Lang, string> = { en: 'Azza · learn live, together', ar: 'عازة · تعلّم مباشر مع معلّم يعرفك' };

const layout = (lang: Lang, title: string, body: string) => `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><body style="margin:0;background:#F5EFE4;font-family:${lang === 'ar' ? "Tahoma,'Segoe UI',Arial" : 'Arial'},sans-serif;color:#121110">
<div style="max-width:560px;margin:0 auto;padding:32px;text-align:${lang === 'ar' ? 'right' : 'left'}">
<p style="font-weight:800;font-size:22px;margin:0 0 24px">${lang === 'ar' ? 'عازة' : 'azza'}<span style="color:#FF5A36">.</span></p>
<h1 style="font-size:26px;margin:0 0 16px">${title}</h1>${body}
<p style="color:#6B645B;font-size:12px;margin-top:32px">${FOOTER[lang]}</p></div></body></html>`;

const button = (url: string, label: string) =>
  `<p><a href="${url}" style="display:inline-block;background:#121110;color:#FBF8F2;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">${label}</a></p>`;

/** Codes, amounts and IBANs stay left-to-right inside Arabic text. */
const ltr = (s: string) => `<bdi dir="ltr">${s}</bdi>`;

const ROLE_AR: Record<string, string> = { STUDENT: 'طالب', TEACHER: 'معلّم', ADMIN: 'مسؤول' };

const enAuth = {
  verifyEmail: (name: string, url: string) => ({
    subject: 'Verify your email',
    html: layout('en', `Welcome, ${name}`, `<p>Confirm your email to finish setting up your account.</p>${button(url, 'Verify email')}`),
    text: `Verify your email: ${url}`,
  }),
  resetPassword: (name: string, url: string) => ({
    subject: 'Reset your password',
    html: layout('en', `Hi ${name}`, `<p>Use the link below to choose a new password. It expires in 1 hour.</p>${button(url, 'Reset password')}`),
    text: `Reset your password: ${url}`,
  }),
};

const arAuth: typeof enAuth = {
  verifyEmail: (name, url) => ({
    subject: 'أكّد بريدك الإلكتروني',
    html: layout('ar', `أهلًا بك يا ${name}`, `<p>أكّد بريدك الإلكتروني لتُكمل إنشاء حسابك.</p>${button(url, 'تأكيد البريد')}`),
    text: `أكّد بريدك الإلكتروني: ${url}`,
  }),
  resetPassword: (name, url) => ({
    subject: 'إعادة تعيين كلمة المرور',
    html: layout('ar', `مرحبًا ${name}`, `<p>استخدم الرابط أدناه لاختيار كلمة مرور جديدة. ينتهي خلال ساعة.</p>${button(url, 'إعادة التعيين')}`),
    text: `أعد تعيين كلمة المرور: ${url}`,
  }),
};

const enApp = {
  subscriptionReceipt: (name: string, course: string, amount: string, until: string, url: string) => ({
    subject: `Receipt · ${course}`,
    html: layout('en', `Thanks, ${name}`, `<p>We received <b>${amount}</b> for <b>${course}</b>. You're covered until <b>${until}</b>.</p>${button(url, 'Keep learning')}`),
    text: `We received ${amount} for ${course}. Covered until ${until}. ${url}`,
  }),
  subscriptionPaymentFailed: (name: string, course: string, url: string) => ({
    subject: `Update your card · ${course}`,
    html: layout('en', `Hi ${name}`, `<p>Your last payment didn't go through. Update your card to keep learning.</p>${button(url, 'Update my card')}`),
    text: `Your last payment didn't go through. Update your card to keep learning. ${url}`,
  }),
  /** `body` is already localised; the same text goes on the notification. */
  subscriptionRenewsSoon: (name: string, subject: string, body: string, url: string, label: string) => ({
    subject,
    html: layout('en', `Hi ${name}`, `<p>${body}</p>${button(url, label)}`),
    text: `${body} ${url}`,
  }),
  enrolled: (name: string, course: string, batch: string, firstSession: string, url: string) => ({
    subject: `You’re enrolled · ${course} ${batch}`,
    html: layout('en', `You’re in, ${name}`, `<p>${course} · ${batch}. Your first session is <b>${firstSession}</b>.</p>${button(url, 'Open my schedule')}`),
    text: `Enrolled in ${course} ${batch}. First session: ${firstSession}. ${url}`,
  }),
  transferInstructions: (name: string, amount: string, reference: string, bank: string, iban: string, expires: string) => ({
    subject: `Complete your bank transfer · ${reference}`,
    html: layout(
      'en',
      `Your seat is held, ${name}`,
      `<p>Transfer exactly <b>${amount}</b> to <b>${bank}</b> (IBAN ${iban}) and put <b>${reference}</b> in the transfer notes.</p><p>Upload your receipt before ${expires} to keep the seat.</p>`,
    ),
    text: `Transfer ${amount} to ${bank} ${iban}, reference ${reference}, before ${expires}.`,
  }),
  transferRejected: (name: string, reference: string, reason: string) => ({
    subject: `We couldn’t verify your transfer · ${reference}`,
    html: layout('en', `Hi ${name}`, `<p>We couldn’t verify the receipt for ${reference}: ${reason}</p><p>Please upload a new receipt from the app.</p>`),
    text: `Transfer ${reference} not verified: ${reason}`,
  }),
  sessionRescheduled: (course: string, title: string, when: string, reason?: string) => ({
    subject: `Session moved · ${title}`,
    html: layout('en', 'A session has moved', `<p>${course} · <b>${title}</b> is now on <b>${when}</b>.${reason ? ` Reason: ${reason}` : ''}</p>`),
    text: `${course} · ${title} moved to ${when}.`,
  }),
  sessionTomorrow: (name: string, course: string, title: string, when: string, url: string) => ({
    subject: `Tomorrow: ${course}`,
    html: layout('en', `See you tomorrow, ${name}`, `<p>${course} · <b>${title}</b> starts <b>${when}</b>. Join on time: attendance counts toward your certificate.</p>${button(url, 'Open the class')}`),
    text: `${course} · ${title} starts ${when}. ${url}`,
  }),
  payoutPaid: (name: string, amount: string, reference: string) => ({
    subject: `Payout sent · ${amount}`,
    html: layout('en', `Payout sent, ${name}`, `<p>We sent <b>${amount}</b> to your bank. Transfer reference: ${reference}.</p>`),
    text: `Payout of ${amount} sent. Reference ${reference}.`,
  }),
  sessionCancelled: (course: string, title: string, when: string, reason?: string) => ({
    subject: `Session cancelled · ${title}`,
    html: layout('en', 'A session was cancelled', `<p>${course} · <b>${title}</b> on ${when} will not take place.${reason ? ` Reason: ${reason}` : ''}</p>`),
    text: `${course} · ${title} on ${when} was cancelled.`,
  }),
  newReceiptRequested: (name: string, reference: string, reason: string, expires: string) => ({
    subject: `Please upload a new receipt · ${reference}`,
    html: layout('en', `Hi ${name}`, `<p>We need a new receipt for ${reference}: ${reason}</p><p>Your seat is held until ${expires}.</p>`),
    text: `New receipt needed for ${reference}: ${reason}. Seat held until ${expires}.`,
  }),
  amountMismatch: (name: string, reference: string, expected: string, received: string) => ({
    subject: `Transfer amount differs · ${reference}`,
    html: layout('en', `Hi ${name}`, `<p>We received <b>${received}</b> for ${reference}, but the order total is <b>${expected}</b>. Our team will contact you.</p>`),
    text: `Received ${received} for ${reference}; expected ${expected}.`,
  }),
  refunded: (name: string, amount: string, reference: string) => ({
    subject: `Refund issued · ${reference}`,
    html: layout('en', `Refund on its way, ${name}`, `<p>We refunded <b>${amount}</b> for order ${reference}.</p>`),
    text: `Refund of ${amount} issued for ${reference}.`,
  }),
  seatAvailable: (name: string, course: string, batch: string, url: string) => ({
    subject: `A seat opened up · ${course} ${batch}`,
    html: layout('en', `Good news, ${name}`, `<p>A seat in ${course} · ${batch} is now yours to claim. Complete checkout within 24 hours.</p>${button(url, 'Complete checkout')}`),
    text: `A seat opened in ${course} ${batch}. Complete checkout within 24h: ${url}`,
  }),
  waitlisted: (name: string, course: string, batch: string) => ({
    subject: `You’re on the waitlist · ${course} ${batch}`,
    html: layout('en', `You’re on the list, ${name}`, `<p>${course} · ${batch} is full. We’ll email you the moment a seat opens.</p>`),
    text: `Waitlisted for ${course} ${batch}.`,
  }),
  transferReminder: (name: string, reference: string, amount: string, expires: string, url: string) => ({
    subject: `Your seat is held until ${expires} · ${reference}`,
    html: layout('en', `Still want your seat, ${name}?`, `<p>We're holding your seat until <b>${expires}</b>. Transfer <b>${amount}</b> with reference <b>${reference}</b> and upload the receipt to keep it.</p>${button(url, 'Upload my receipt')}`),
    text: `Seat held until ${expires}. Transfer ${amount}, reference ${reference}, and upload the receipt: ${url}`,
  }),
  checkoutLapsed: (name: string, course: string, batch: string, url: string) => ({
    subject: `Your checkout didn’t finish · ${course} ${batch}`,
    html: layout('en', `Still interested, ${name}?`, `<p>Your payment for ${course} · ${batch} didn't go through, so we released the seat. Seats are still open: you can finish in a minute.</p>${button(url, 'Finish checkout')}`),
    text: `Your checkout for ${course} ${batch} didn't finish. Seats are still open: ${url}`,
  }),
  welcome: (name: string, url: string) => ({
    subject: 'Welcome to Azza',
    html: layout('en', `Welcome, ${name}`, `<p>Start with a free preview lesson from any recorded course, or pick a live class with a teacher who knows you by name.</p>${button(url, 'Find a course')}`),
    text: `Welcome to Azza. Start with a free preview lesson or pick a live class: ${url}`,
  }),
  welcomeFollowUp: (name: string, url: string) => ({
    subject: 'Not sure where to start?',
    html: layout('en', `Hi ${name}`, `<p>Every recorded course has a free lesson you can watch now, and new live classes start every month. Small classes, real feedback.</p>${button(url, 'Browse courses')}`),
    text: `Every recorded course has a free lesson, and live classes start every month: ${url}`,
  }),
  learningNudge: (name: string, course: string, url: string) => ({
    subject: `Pick up ${course} where you left off`,
    html: layout('en', `Ready for the next lesson, ${name}?`, `<p>It's been a week since your last lesson in <b>${course}</b>. A short lesson today keeps it moving.</p>${button(url, 'Continue learning')}`),
    text: `Pick up ${course} where you left off: ${url}`,
  }),
  planWinback: (name: string, course: string, url: string) => ({
    subject: `Come back to ${course}`,
    html: layout('en', `We saved your place, ${name}`, `<p>Your plan for <b>${course}</b> ended, but your progress is saved. Renew any time and carry on from the same lesson.</p>${button(url, 'Renew my plan')}`),
    text: `Your progress in ${course} is saved. Renew any time: ${url}`,
  }),
  invite: (name: string, role: string, url: string) => ({
    subject: 'You’re invited to Azza',
    html: layout('en', `Welcome, ${name}`, `<p>An administrator created a <b>${role.toLowerCase()}</b> account for you. Choose a password to get started.</p>${button(url, 'Set my password')}`),
    text: `You're invited to Azza as ${role.toLowerCase()}. Set your password: ${url}`,
  }),
};

const arApp: typeof enApp = {
  subscriptionReceipt: (name, course, amount, until, url) => ({
    subject: `إيصال · ${course}`,
    html: layout('ar', `شكرًا لك يا ${name}`, `<p>استلمنا <b>${ltr(amount)}</b> مقابل <b>${course}</b>. اشتراكك ساري حتى <b>${until}</b>.</p>${button(url, 'تابع التعلّم')}`),
    text: `استلمنا ${amount} مقابل ${course}. اشتراكك ساري حتى ${until}. ${url}`,
  }),
  subscriptionPaymentFailed: (name, course, url) => ({
    subject: `حدّث بطاقتك · ${course}`,
    html: layout('ar', `مرحبًا ${name}`, `<p>لم تنجح آخر عملية دفع. حدّث بطاقتك لتواصل التعلّم.</p>${button(url, 'تحديث البطاقة')}`),
    text: `لم تنجح آخر عملية دفع. حدّث بطاقتك لتواصل التعلّم. ${url}`,
  }),
  subscriptionRenewsSoon: (name, subject, body, url, label) => ({
    subject,
    html: layout('ar', `مرحبًا ${name}`, `<p>${body}</p>${button(url, label)}`),
    text: `${body} ${url}`,
  }),
  enrolled: (name, course, batch, firstSession, url) => ({
    subject: `تم تسجيلك · ${course} ${batch}`,
    html: layout('ar', `أنت معنا يا ${name}`, `<p>${course} · ${ltr(batch)}. حصتك الأولى <b>${firstSession}</b>.</p>${button(url, 'افتح جدولي')}`),
    text: `تم تسجيلك في ${course} ${batch}. الحصة الأولى: ${firstSession}. ${url}`,
  }),
  transferInstructions: (name, amount, reference, bank, iban, expires) => ({
    subject: `أكمل التحويل البنكي · ${reference}`,
    html: layout(
      'ar',
      `مقعدك محجوز يا ${name}`,
      `<p>حوّل <b>${ltr(amount)}</b> بالضبط إلى <b>${bank}</b> (الآيبان ${ltr(iban)}) واكتب <b>${ltr(reference)}</b> في ملاحظات التحويل.</p><p>ارفع الإيصال قبل ${expires} ليبقى المقعد محجوزًا.</p>`,
    ),
    text: `حوّل ${amount} إلى ${bank} ${iban}، المرجع ${reference}، قبل ${expires}.`,
  }),
  transferRejected: (name, reference, reason) => ({
    subject: `تعذّر التحقق من تحويلك · ${reference}`,
    html: layout('ar', `مرحبًا ${name}`, `<p>تعذّر التحقق من إيصال ${ltr(reference)}: ${reason}</p><p>ارفع إيصالًا جديدًا من التطبيق.</p>`),
    text: `لم يُتحقق من التحويل ${reference}: ${reason}`,
  }),
  sessionRescheduled: (course, title, when, reason) => ({
    subject: `تغيّر موعد الحصة · ${title}`,
    html: layout('ar', 'تغيّر موعد حصة', `<p>${course} · <b>${title}</b> أصبحت <b>${when}</b>.${reason ? ` السبب: ${reason}` : ''}</p>`),
    text: `${course} · ${title} انتقلت إلى ${when}.`,
  }),
  sessionTomorrow: (name, course, title, when, url) => ({
    subject: `غدًا: ${course}`,
    html: layout('ar', `نراك غدًا يا ${name}`, `<p>${course} · تبدأ حصة <b>${title}</b> <b>${when}</b>. احضر في الموعد: الحضور يُحتسب في شهادتك.</p>${button(url, 'افتح الصف')}`),
    text: `${course} · تبدأ ${title} ${when}. ${url}`,
  }),
  payoutPaid: (name, amount, reference) => ({
    subject: `أُرسلت مستحقاتك · ${amount}`,
    html: layout('ar', `أُرسلت مستحقاتك يا ${name}`, `<p>أرسلنا <b>${ltr(amount)}</b> إلى حسابك البنكي. مرجع التحويل: ${ltr(reference)}.</p>`),
    text: `أُرسلت مستحقات بقيمة ${amount}. المرجع ${reference}.`,
  }),
  sessionCancelled: (course, title, when, reason) => ({
    subject: `أُلغيت الحصة · ${title}`,
    html: layout('ar', 'أُلغيت حصة', `<p>${course} · <b>${title}</b> المقررة ${when} لن تُعقد.${reason ? ` السبب: ${reason}` : ''}</p>`),
    text: `${course} · أُلغيت ${title} المقررة ${when}.`,
  }),
  newReceiptRequested: (name, reference, reason, expires) => ({
    subject: `ارفع إيصالًا جديدًا · ${reference}`,
    html: layout('ar', `مرحبًا ${name}`, `<p>نحتاج إيصالًا جديدًا للطلب ${ltr(reference)}: ${reason}</p><p>مقعدك محجوز حتى ${expires}.</p>`),
    text: `نحتاج إيصالًا جديدًا للطلب ${reference}: ${reason}. المقعد محجوز حتى ${expires}.`,
  }),
  amountMismatch: (name, reference, expected, received) => ({
    subject: `مبلغ التحويل مختلف · ${reference}`,
    html: layout('ar', `مرحبًا ${name}`, `<p>استلمنا <b>${ltr(received)}</b> للطلب ${ltr(reference)}، بينما إجمالي الطلب <b>${ltr(expected)}</b>. سيتواصل معك فريقنا.</p>`),
    text: `استلمنا ${received} للطلب ${reference}؛ المطلوب ${expected}.`,
  }),
  refunded: (name, amount, reference) => ({
    subject: `تم الاسترداد · ${reference}`,
    html: layout('ar', `المبلغ في طريقه إليك يا ${name}`, `<p>رددنا <b>${ltr(amount)}</b> عن الطلب ${ltr(reference)}.</p>`),
    text: `تم استرداد ${amount} عن الطلب ${reference}.`,
  }),
  seatAvailable: (name, course, batch, url) => ({
    subject: `توفّر مقعد · ${course} ${batch}`,
    html: layout('ar', `خبر سار يا ${name}`, `<p>توفّر مقعد في ${course} · ${ltr(batch)} وهو لك. أكمل الدفع خلال ٢٤ ساعة.</p>${button(url, 'أكمل الدفع')}`),
    text: `توفّر مقعد في ${course} ${batch}. أكمل الدفع خلال ٢٤ ساعة: ${url}`,
  }),
  waitlisted: (name, course, batch) => ({
    subject: `أنت في قائمة الانتظار · ${course} ${batch}`,
    html: layout('ar', `أنت في القائمة يا ${name}`, `<p>${course} · ${ltr(batch)} مكتمل. سنراسلك فور توفّر مقعد.</p>`),
    text: `أنت في قائمة انتظار ${course} ${batch}.`,
  }),
  transferReminder: (name, reference, amount, expires, url) => ({
    subject: `مقعدك محجوز حتى ${expires} · ${reference}`,
    html: layout('ar', `ما زلت تريد مقعدك يا ${name}؟`, `<p>نحجز مقعدك حتى <b>${expires}</b>. حوّل <b>${ltr(amount)}</b> بالمرجع <b>${ltr(reference)}</b> وارفع الإيصال ليبقى لك.</p>${button(url, 'ارفع الإيصال')}`),
    text: `مقعدك محجوز حتى ${expires}. حوّل ${amount} بالمرجع ${reference} وارفع الإيصال: ${url}`,
  }),
  checkoutLapsed: (name, course, batch, url) => ({
    subject: `لم يكتمل الدفع · ${course} ${batch}`,
    html: layout('ar', `ما زلت مهتمًا يا ${name}؟`, `<p>لم يكتمل الدفع في ${course} · ${ltr(batch)}، فحرّرنا المقعد. ما زالت المقاعد متاحة ويمكنك الإكمال في دقيقة.</p>${button(url, 'أكمل الدفع')}`),
    text: `لم يكتمل الدفع في ${course} ${batch}. ما زالت المقاعد متاحة: ${url}`,
  }),
  welcome: (name, url) => ({
    subject: 'أهلًا بك في عازة',
    html: layout('ar', `أهلًا بك يا ${name}`, `<p>ابدأ بدرس مجاني للمعاينة من أي دورة مسجّلة، أو اختر صفًا مباشرًا مع معلّم يعرفك باسمك.</p>${button(url, 'اعثر على دورة')}`),
    text: `أهلًا بك في عازة. ابدأ بدرس مجاني أو اختر صفًا مباشرًا: ${url}`,
  }),
  welcomeFollowUp: (name, url) => ({
    subject: 'لا تعرف من أين تبدأ؟',
    html: layout('ar', `مرحبًا ${name}`, `<p>لكل دورة مسجّلة درس مجاني تشاهده الآن، وتبدأ صفوف مباشرة جديدة كل شهر. صفوف صغيرة وملاحظات حقيقية.</p>${button(url, 'تصفّح الدورات')}`),
    text: `لكل دورة مسجّلة درس مجاني، والصفوف المباشرة تبدأ كل شهر: ${url}`,
  }),
  learningNudge: (name, course, url) => ({
    subject: `أكمل ${course} من حيث توقفت`,
    html: layout('ar', `جاهز للدرس التالي يا ${name}؟`, `<p>مرّ أسبوع على آخر درس لك في <b>${course}</b>. درس قصير اليوم يبقيك في الطريق.</p>${button(url, 'تابع التعلّم')}`),
    text: `أكمل ${course} من حيث توقفت: ${url}`,
  }),
  planWinback: (name, course, url) => ({
    subject: `عُد إلى ${course}`,
    html: layout('ar', `حفظنا مكانك يا ${name}`, `<p>انتهى اشتراكك في <b>${course}</b>، لكن تقدّمك محفوظ. جدّد في أي وقت وأكمل من الدرس نفسه.</p>${button(url, 'جدّد اشتراكي')}`),
    text: `تقدّمك في ${course} محفوظ. جدّد في أي وقت: ${url}`,
  }),
  invite: (name, role, url) => ({
    subject: 'دعوة للانضمام إلى عازة',
    html: layout('ar', `أهلًا بك يا ${name}`, `<p>أنشأ لك أحد المسؤولين حساب <b>${ROLE_AR[role] ?? role}</b>. اختر كلمة مرور لتبدأ.</p>${button(url, 'اختيار كلمة المرور')}`),
    text: `دُعيت إلى عازة بصفة ${ROLE_AR[role] ?? role}. اختر كلمة المرور: ${url}`,
  }),
};

/** Auth emails in the reader's language (English when unknown). */
export const authEmailsIn = (locale?: string | null) => (langOf(locale) === 'ar' ? arAuth : enAuth);
/** App emails in the reader's language (English when unknown). */
export const emailsIn = (locale?: string | null) => (langOf(locale) === 'ar' ? arApp : enApp);

/** English versions, for callers that have no reader. */
export const authEmails = enAuth;
export const appEmails = enApp;

/** Emails that take the locale first, for callers building one email per recipient. */
export const reminderEmails = {
  sessionTomorrow: (locale: string, ...args: Parameters<typeof enApp.sessionTomorrow>) => emailsIn(locale).sessionTomorrow(...args),
};

/** User-written text (announcements, support messages) goes into HTML escaped, line breaks kept. */
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const paragraphs = (s: string) => `<p>${escapeHtml(s).replace(/\n/g, '<br>')}</p>`;

const COMMS = {
  en: { openAnnouncements: 'Open announcements', newTicket: 'New support ticket', from: 'From', openTicket: 'Open the ticket', newReply: 'New reply', replied: 'replied', weReplied: 'We replied', teamReplied: 'The Azza team replied to', reply: 'Reply', hi: 'Hi' },
  ar: { openAnnouncements: 'افتح الإعلانات', newTicket: 'تذكرة دعم جديدة', from: 'من', openTicket: 'افتح التذكرة', newReply: 'رد جديد', replied: 'ردّ', weReplied: 'رددنا عليك', teamReplied: 'ردّ فريق عازة على', reply: 'الرد', hi: 'مرحبًا' },
} as const;

/** Announcements and support threads; pass the reader's locale (English when unknown). */
export const communicationEmails = {
  announcement: (title: string, body: string, url: string, locale?: string | null) => {
    const lang = langOf(locale);
    return {
      subject: title,
      html: layout(lang, escapeHtml(title), `${paragraphs(body)}${button(url, COMMS[lang].openAnnouncements)}`),
      text: `${title}\n\n${body}\n\n${url}`,
    };
  },
  supportTicket: (from: string, subject: string, body: string, url: string, locale?: string | null) => {
    const lang = langOf(locale);
    const c = COMMS[lang];
    return {
      subject: `${c.newTicket} · ${subject}`,
      html: layout(lang, escapeHtml(subject), `<p>${c.from} <b>${escapeHtml(from)}</b>:</p>${paragraphs(body)}${button(url, c.openTicket)}`),
      text: `${c.newTicket} ${c.from} ${from}: ${subject}\n\n${body}\n\n${url}`,
    };
  },
  supportUserReply: (from: string, subject: string, body: string, url: string, locale?: string | null) => {
    const lang = langOf(locale);
    const c = COMMS[lang];
    return {
      subject: `${c.newReply} · ${subject}`,
      html: layout(lang, escapeHtml(subject), `<p><b>${escapeHtml(from)}</b> ${c.replied}:</p>${paragraphs(body)}${button(url, c.openTicket)}`),
      text: `${from} ${c.replied} "${subject}":\n\n${body}\n\n${url}`,
    };
  },
  supportReply: (name: string, subject: string, body: string, url: string, locale?: string | null) => {
    const lang = langOf(locale);
    const c = COMMS[lang];
    return {
      subject: `${c.weReplied} · ${subject}`,
      html: layout(lang, `${c.hi} ${escapeHtml(name)}`, `<p>${c.teamReplied} “${escapeHtml(subject)}”:</p>${paragraphs(body)}${button(url, c.reply)}`),
      text: `${c.teamReplied} "${subject}":\n\n${body}\n\n${url}`,
    };
  },
};
