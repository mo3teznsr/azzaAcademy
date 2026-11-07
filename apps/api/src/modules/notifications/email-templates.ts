// Plain, bilingual-ready email bodies. Kept separate from delivery (SRP).

const layout = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#F5EFE4;font-family:Arial,sans-serif;color:#121110">
<div style="max-width:560px;margin:0 auto;padding:32px">
<p style="font-weight:800;font-size:22px;margin:0 0 24px">azza<span style="color:#FF5A36">.</span></p>
<h1 style="font-size:26px;margin:0 0 16px">${title}</h1>${body}
<p style="color:#6B645B;font-size:12px;margin-top:32px">Azza · live cohorts</p></div></body></html>`;

const button = (url: string, label: string) =>
  `<p><a href="${url}" style="display:inline-block;background:#121110;color:#FBF8F2;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">${label}</a></p>`;

export const authEmails = {
  verifyEmail: (name: string, url: string) => ({
    subject: 'Verify your email',
    html: layout(`Welcome, ${name}`, `<p>Confirm your email to finish setting up your account.</p>${button(url, 'Verify email')}`),
    text: `Verify your email: ${url}`,
  }),
  resetPassword: (name: string, url: string) => ({
    subject: 'Reset your password',
    html: layout(`Hi ${name}`, `<p>Use the link below to choose a new password. It expires in 1 hour.</p>${button(url, 'Reset password')}`),
    text: `Reset your password: ${url}`,
  }),
};

export const appEmails = {
  enrolled: (name: string, course: string, batch: string, firstSession: string, url: string) => ({
    subject: `You’re enrolled · ${course} ${batch}`,
    html: layout(`You’re in, ${name}`, `<p>${course} · ${batch}. Your first session is <b>${firstSession}</b>.</p>${button(url, 'Open my schedule')}`),
    text: `Enrolled in ${course} ${batch}. First session: ${firstSession}. ${url}`,
  }),
  transferInstructions: (name: string, amount: string, reference: string, bank: string, iban: string, expires: string) => ({
    subject: `Complete your bank transfer · ${reference}`,
    html: layout(
      `Your seat is held, ${name}`,
      `<p>Transfer exactly <b>${amount}</b> to <b>${bank}</b> (IBAN ${iban}) and put <b>${reference}</b> in the transfer notes.</p><p>Upload your receipt before ${expires} to keep the seat.</p>`,
    ),
    text: `Transfer ${amount} to ${bank} ${iban}, reference ${reference}, before ${expires}.`,
  }),
  transferRejected: (name: string, reference: string, reason: string) => ({
    subject: `We couldn’t verify your transfer · ${reference}`,
    html: layout(`Hi ${name}`, `<p>We couldn’t verify the receipt for ${reference}: ${reason}</p><p>Please upload a new receipt from the app.</p>`),
    text: `Transfer ${reference} not verified: ${reason}`,
  }),
  sessionRescheduled: (course: string, title: string, when: string, reason?: string) => ({
    subject: `Session moved · ${title}`,
    html: layout('A session has moved', `<p>${course} · <b>${title}</b> is now on <b>${when}</b>.${reason ? ` Reason: ${reason}` : ''}</p>`),
    text: `${course} · ${title} moved to ${when}.`,
  }),
  payoutPaid: (name: string, amount: string, reference: string) => ({
    subject: `Payout sent · ${amount}`,
    html: layout(`Payout sent, ${name}`, `<p>We sent <b>${amount}</b> to your bank. Transfer reference: ${reference}.</p>`),
    text: `Payout of ${amount} sent. Reference ${reference}.`,
  }),
  sessionCancelled: (course: string, title: string, when: string, reason?: string) => ({
    subject: `Session cancelled · ${title}`,
    html: layout('A session was cancelled', `<p>${course} · <b>${title}</b> on ${when} will not take place.${reason ? ` Reason: ${reason}` : ''}</p>`),
    text: `${course} · ${title} on ${when} was cancelled.`,
  }),
  newReceiptRequested: (name: string, reference: string, reason: string, expires: string) => ({
    subject: `Please upload a new receipt · ${reference}`,
    html: layout(`Hi ${name}`, `<p>We need a new receipt for ${reference}: ${reason}</p><p>Your seat is held until ${expires}.</p>`),
    text: `New receipt needed for ${reference}: ${reason}. Seat held until ${expires}.`,
  }),
  amountMismatch: (name: string, reference: string, expected: string, received: string) => ({
    subject: `Transfer amount differs · ${reference}`,
    html: layout(`Hi ${name}`, `<p>We received <b>${received}</b> for ${reference}, but the order total is <b>${expected}</b>. Our team will contact you.</p>`),
    text: `Received ${received} for ${reference}; expected ${expected}.`,
  }),
  refunded: (name: string, amount: string, reference: string) => ({
    subject: `Refund issued · ${reference}`,
    html: layout(`Refund on its way, ${name}`, `<p>We refunded <b>${amount}</b> for order ${reference}.</p>`),
    text: `Refund of ${amount} issued for ${reference}.`,
  }),
  seatAvailable: (name: string, course: string, batch: string, url: string) => ({
    subject: `A seat opened up · ${course} ${batch}`,
    html: layout(`Good news, ${name}`, `<p>A seat in ${course} · ${batch} is now yours to claim. Complete checkout within 24 hours.</p>${button(url, 'Complete checkout')}`),
    text: `A seat opened in ${course} ${batch}. Complete checkout within 24h: ${url}`,
  }),
  waitlisted: (name: string, course: string, batch: string) => ({
    subject: `You’re on the waitlist · ${course} ${batch}`,
    html: layout(`You’re on the list, ${name}`, `<p>${course} · ${batch} is full. We’ll email you the moment a seat opens.</p>`),
    text: `Waitlisted for ${course} ${batch}.`,
  }),
  invite: (name: string, role: string, url: string) => ({
    subject: 'You’re invited to Azza',
    html: layout(`Welcome, ${name}`, `<p>An administrator created a <b>${role.toLowerCase()}</b> account for you. Choose a password to get started.</p>${button(url, 'Set my password')}`),
    text: `You're invited to Azza as ${role.toLowerCase()}. Set your password: ${url}`,
  }),
};

/** User-written text (announcements, support messages) goes into HTML escaped, line breaks kept. */
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const paragraphs = (s: string) => `<p>${escapeHtml(s).replace(/\n/g, '<br>')}</p>`;

export const communicationEmails = {
  announcement: (title: string, body: string, url: string) => ({
    subject: title,
    html: layout(escapeHtml(title), `${paragraphs(body)}${button(url, 'Open announcements')}`),
    text: `${title}\n\n${body}\n\n${url}`,
  }),
  supportTicket: (from: string, subject: string, body: string, url: string) => ({
    subject: `New support ticket · ${subject}`,
    html: layout(escapeHtml(subject), `<p>From <b>${escapeHtml(from)}</b>:</p>${paragraphs(body)}${button(url, 'Open the ticket')}`),
    text: `New support ticket from ${from}: ${subject}\n\n${body}\n\n${url}`,
  }),
  supportUserReply: (from: string, subject: string, body: string, url: string) => ({
    subject: `New reply · ${subject}`,
    html: layout(escapeHtml(subject), `<p><b>${escapeHtml(from)}</b> replied:</p>${paragraphs(body)}${button(url, 'Open the ticket')}`),
    text: `${from} replied on "${subject}":\n\n${body}\n\n${url}`,
  }),
  supportReply: (name: string, subject: string, body: string, url: string) => ({
    subject: `We replied · ${subject}`,
    html: layout(`Hi ${escapeHtml(name)}`, `<p>The Azza team replied to “${escapeHtml(subject)}”:</p>${paragraphs(body)}${button(url, 'Reply')}`),
    text: `The Azza team replied to "${subject}":\n\n${body}\n\n${url}`,
  }),
};
