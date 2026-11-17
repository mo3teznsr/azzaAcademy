// Referral notices and emails in English and Arabic.
import { filsToAed, formatMoney } from '@azza/shared';
import { button, layout, ltr } from '../notifications/email-templates';
import type { Notice } from '../notifications/notification.types';
import type { CouponDraft } from './referral-policy';

type Lang = 'en' | 'ar';
const langOf = (locale: string | null | undefined): Lang => (locale?.startsWith('ar') ? 'ar' : 'en');
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** "10% off" / "AED 20.00 off" in the reader's language. */
export function discountLabel(c: Pick<CouponDraft, 'percentOff' | 'amountOffFils'>, lang: Lang): string {
  if (c.percentOff !== null) return lang === 'ar' ? `خصم ${c.percentOff}%` : `${c.percentOff}% off`;
  const amount = formatMoney(filsToAed(c.amountOffFils ?? 0), 'AED', lang);
  return lang === 'ar' ? `خصم ${amount}` : `${amount} off`;
}

const day = (d: Date, lang: Lang) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-AE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);

/** The invited friend's gift, after their first payment cleared. */
export function friendRewardNotice(coupon: CouponDraft, referrerName: string, webUrl: string): Notice {
  const who = firstName(referrerName);
  const url = `${webUrl}/`;
  return {
    type: 'REFERRAL_REWARD',
    title: `A gift from ${who}: ${discountLabel(coupon, 'en')}`,
    body: `Use code ${coupon.code} on your next live class, until ${day(coupon.expiresOn, 'en')}.`,
    ar: { title: `هدية من ${who}: ${discountLabel(coupon, 'ar')}`, body: `استخدم الرمز ${coupon.code} في صفّك المباشر القادم، حتى ${day(coupon.expiresOn, 'ar')}.` },
    data: { couponCode: coupon.code },
    email: (r) => {
      const lang = langOf(r.locale);
      const name = escapeHtml(r.name);
      const from = escapeHtml(who);
      return lang === 'ar'
        ? {
            subject: `هدية من ${who}: ${discountLabel(coupon, 'ar')}`,
            html: layout('ar', `شكرًا لانضمامك يا ${name}`, `<p>انضممت إلى عازة بدعوة من <b>${from}</b>، فهذه هديتك: <b>${discountLabel(coupon, 'ar')}</b> على صفّك المباشر القادم.</p><p>الرمز: <b>${ltr(coupon.code)}</b><br>صالح حتى ${day(coupon.expiresOn, 'ar')}، لمرة واحدة.</p>${button(url, 'تصفّح الصفوف')}`),
            text: `هديتك من ${who}: ${discountLabel(coupon, 'ar')}. الرمز ${coupon.code}، صالح حتى ${day(coupon.expiresOn, 'ar')}. ${url}`,
          }
        : {
            subject: `A gift from ${who}: ${discountLabel(coupon, 'en')}`,
            html: layout('en', `Thanks for joining, ${name}`, `<p>You joined Azza through <b>${from}</b>'s invite, so here is <b>${discountLabel(coupon, 'en')}</b> your next live class.</p><p>Code: <b>${coupon.code}</b><br>Valid until ${day(coupon.expiresOn, 'en')}, once.</p>${button(url, 'Browse classes')}`),
            text: `Your gift from ${who}: ${discountLabel(coupon, 'en')}. Code ${coupon.code}, valid until ${day(coupon.expiresOn, 'en')}. ${url}`,
          };
    },
  };
}

/** The referrer's coupon, once the friend's first payment cleared. */
export function referrerCouponNotice(coupon: CouponDraft, friendName: string, webUrl: string): Notice {
  const who = firstName(friendName);
  const url = `${webUrl}/`;
  return {
    type: 'REFERRAL_REWARD',
    title: `${who} joined. Here is ${discountLabel(coupon, 'en')}`,
    body: `Thanks for inviting them. Use code ${coupon.code} on your next live class, until ${day(coupon.expiresOn, 'en')}.`,
    ar: { title: `انضمّ ${who}. إليك ${discountLabel(coupon, 'ar')}`, body: `شكرًا لدعوتك. استخدم الرمز ${coupon.code} في صفّك المباشر القادم، حتى ${day(coupon.expiresOn, 'ar')}.` },
    data: { couponCode: coupon.code },
    email: (r) => {
      const lang = langOf(r.locale);
      const name = escapeHtml(r.name);
      const friend = escapeHtml(who);
      return lang === 'ar'
        ? {
            subject: `انضمّ ${who}. إليك ${discountLabel(coupon, 'ar')}`,
            html: layout('ar', `شكرًا يا ${name}`, `<p>انضمّ <b>${friend}</b> إلى عازة بدعوتك وحجز أول صف. هذه مكافأتك: <b>${discountLabel(coupon, 'ar')}</b> على صفّك المباشر القادم.</p><p>الرمز: <b>${ltr(coupon.code)}</b><br>صالح حتى ${day(coupon.expiresOn, 'ar')}، لمرة واحدة.</p>${button(`${webUrl}/invite`, 'ادعُ صديقًا آخر')}`),
            text: `انضمّ ${who} بدعوتك. مكافأتك: ${discountLabel(coupon, 'ar')}. الرمز ${coupon.code}، صالح حتى ${day(coupon.expiresOn, 'ar')}. ${url}`,
          }
        : {
            subject: `${who} joined. Here is ${discountLabel(coupon, 'en')}`,
            html: layout('en', `Thank you, ${name}`, `<p><b>${friend}</b> joined Azza through your invite and booked their first class. Your reward: <b>${discountLabel(coupon, 'en')}</b> your next live class.</p><p>Code: <b>${coupon.code}</b><br>Valid until ${day(coupon.expiresOn, 'en')}, once.</p>${button(`${webUrl}/invite`, 'Invite another friend')}`),
            text: `${who} joined through your invite. Your reward: ${discountLabel(coupon, 'en')}. Code ${coupon.code}, valid until ${day(coupon.expiresOn, 'en')}. ${url}`,
          };
    },
  };
}

/** A teacher's referral bonus, added to their earnings. */
export function teacherBonusNotice(amountFils: number, friendName: string, webUrl: string): Notice {
  const who = firstName(friendName);
  const en = formatMoney(filsToAed(amountFils), 'AED', 'en');
  const ar = formatMoney(filsToAed(amountFils), 'AED', 'ar');
  const url = `${webUrl}/studio/earnings`;
  return {
    type: 'REFERRAL_BONUS',
    title: `Referral bonus: ${en}`,
    body: `${who} joined through your link and paid for their first class. The bonus is in your earnings.`,
    ar: { title: `مكافأة دعوة: ${ar}`, body: `انضمّ ${who} عبر رابطك ودفع أول صف. أضفنا المكافأة إلى أرباحك.` },
    data: { amountFils: String(amountFils) },
    email: (r) => {
      const lang = langOf(r.locale);
      const name = escapeHtml(r.name);
      const friend = escapeHtml(who);
      return lang === 'ar'
        ? {
            subject: `مكافأة دعوة: ${ar}`,
            html: layout('ar', `شكرًا يا ${name}`, `<p>انضمّ <b>${friend}</b> إلى عازة عبر رابطك ودفع أول صف. أضفنا <b>${ltr(ar)}</b> إلى أرباحك، وتُدفع مع دفعتك القادمة.</p>${button(url, 'عرض أرباحي')}`),
            text: `أضفنا ${ar} إلى أرباحك لأن ${who} انضمّ عبر رابطك. ${url}`,
          }
        : {
            subject: `Referral bonus: ${en}`,
            html: layout('en', `Thank you, ${name}`, `<p><b>${friend}</b> joined Azza through your link and paid for their first class. We added <b>${en}</b> to your earnings; it is paid with your next payout.</p>${button(url, 'See my earnings')}`),
            text: `We added ${en} to your earnings because ${who} joined through your link. ${url}`,
          };
    },
  };
}
