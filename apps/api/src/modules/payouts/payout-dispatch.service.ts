import { formatMoney } from '@azza/shared';
import { BusinessRuleError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import { noAuditLog, type AuditLog } from '../audit/audit-log';
import { emailsIn } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';
import type { PayoutProvider, ProviderTransfer } from './payout-provider';
import type { PayoutRepository } from './payout.repository';

export type PayoutDispatchRepository = Pick<
  PayoutRepository,
  'findRun' | 'claimForProvider' | 'updateProviderState' | 'payoutByProviderTransferId' | 'processingPayouts' | 'settleProviderPayout' | 'finalizeRunIfDone' | 'bankDetails' | 'setStripeAccount'
>;

const STRIPE_ACCOUNT = /^acct_[A-Za-z0-9]{6,}$/;

/**
 * Sends an APPROVED payout run through the payout provider: one transfer per READY payout, idempotent per attempt.
 * A payout is PROCESSING until the provider confirms it (verified webhook, or the polling job): then PAID, or back to
 * READY with the failure reason so it can be sent again or paid by the CSV fallback. Every step is in the audit log.
 */
export class PayoutDispatchService {
  constructor(
    private readonly repo: PayoutDispatchRepository,
    /** null when no provider is configured (env): the CSV export stays the only way. */
    private readonly provider: PayoutProvider | null,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    private readonly audit: AuditLog = noAuditLog,
    private readonly log: (message: string, error: unknown) => void = (m, e) => console.error(m, e),
  ) {}

  info() {
    return { enabled: !!this.provider, name: this.provider?.name ?? null, label: this.provider?.label ?? null };
  }

  private get P() {
    if (!this.provider) throw new BusinessRuleError('No payout provider is configured', 'PAYOUT_PROVIDER_DISABLED');
    return this.provider;
  }

  async sendRun(runId: string, actorId: string | null) {
    const provider = this.P;
    const run = await this.repo.findRun(runId);
    if (!run) throw new NotFoundError('Payout run', runId);
    if (run.status !== 'APPROVED') throw new BusinessRuleError('Approve the run before sending it', 'RUN_NOT_APPROVED');
    const results: Array<{ payoutId: string; outcome: 'SENT' | 'SKIPPED' | 'FAILED'; reason?: string }> = [];

    for (const p of run.payouts.filter((x) => x.status === 'READY')) {
      const amountFils = p.amountFils + p.adjustmentsFils;
      const bank = p.teacher.bankDetails;
      const recipient = { teacherId: p.teacherId, name: bank?.accountHolder ?? p.teacher.name, iban: bank?.iban ?? null, stripeAccountId: bank?.stripeAccountId ?? null };
      const problem = amountFils <= 0 ? 'Nothing to pay' : provider.recipientProblem(recipient);
      if (problem) {
        await this.repo.updateProviderState(p.id, { providerFailureReason: problem });
        results.push({ payoutId: p.id, outcome: 'SKIPPED', reason: problem });
        continue;
      }
      const attempt = p.providerAttempts + 1;
      if (!(await this.repo.claimForProvider(p.id, { provider: provider.name, attempt, at: this.clock.now() }))) continue;
      const idempotencyKey = `azza-payout-${p.id}-${attempt}`;
      try {
        const t = await provider.send({ idempotencyKey, payoutId: p.id, amountFils, recipient, description: `Azza payout ${run.id.slice(-8)}` });
        await this.repo.updateProviderState(p.id, { providerTransferId: t.id, providerStatus: t.status });
        await this.audit.record({ actorId, action: 'PAYOUT_PROVIDER_SENT', entityType: 'PayoutRun', entityId: run.id, data: { payoutId: p.id, teacherId: p.teacherId, amountFils, provider: provider.name, attempt, transferId: t.id } });
        results.push({ payoutId: p.id, outcome: 'SENT' });
        if (t.status !== 'PENDING' && t.status !== 'IN_TRANSIT') await this.apply(t);
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        this.log(`payout provider send(${p.id}) failed`, e);
        await this.repo.updateProviderState(p.id, { status: 'READY', providerStatus: 'FAILED', providerFailureReason: reason });
        await this.audit.record({ actorId, action: 'PAYOUT_PROVIDER_SEND_FAILED', entityType: 'PayoutRun', entityId: run.id, data: { payoutId: p.id, provider: provider.name, attempt, reason } });
        results.push({ payoutId: p.id, outcome: 'FAILED', reason });
      }
    }
    return { results, sent: results.filter((r) => r.outcome === 'SENT').length };
  }

  /** Applies what the provider says about an attempt. Unknown or stale ids are ignored; repeats change nothing. */
  async apply(t: ProviderTransfer) {
    const payout = await this.repo.payoutByProviderTransferId(t.id);
    if (!payout || payout.status !== 'PROCESSING') return { handled: false };
    const now = this.clock.now();
    if (t.status === 'PAID') {
      if (!(await this.repo.settleProviderPayout(payout.id, now, t.id))) return { handled: false };
      await this.audit.record({ actorId: null, action: 'PAYOUT_PROVIDER_PAID', entityType: 'PayoutRun', entityId: payout.runId, data: { payoutId: payout.id, transferId: t.id } });
      const amount = formatMoney((payout.amountFils + payout.adjustmentsFils) / 100, 'AED');
      await this.notifier.notify([payout.teacherId], {
        type: 'PAYOUT_PAID',
        title: `Payout sent · ${amount}`,
        body: `Transfer reference ${t.id}`,
        ar: { title: `أُرسلت مستحقاتك · ${amount}`, body: `مرجع التحويل ${t.id}` },
        data: { payoutId: payout.id },
        email: (r) => emailsIn(r.locale).payoutPaid(r.name, amount, t.id),
      });
      await this.repo.finalizeRunIfDone(payout.runId, now);
      return { handled: true, status: 'PAID' as const };
    }
    if (t.status === 'FAILED') {
      const reason = t.failureReason ?? 'Payout failed';
      await this.repo.updateProviderState(payout.id, { status: 'READY', providerStatus: 'FAILED', providerFailureReason: reason });
      await this.audit.record({ actorId: null, action: 'PAYOUT_PROVIDER_FAILED', entityType: 'PayoutRun', entityId: payout.runId, data: { payoutId: payout.id, transferId: t.id, reason } });
      await this.notifier.notifyRole(
        'ADMIN',
        {
          type: 'PAYOUT_FAILED',
          title: 'A teacher payout failed',
          body: reason,
          ar: { title: 'تعذّر إرسال مستحقات مدرّس', body: reason },
          data: { payoutId: payout.id, runId: payout.runId },
        },
        { channels: ['in-app', 'realtime'] },
      );
      return { handled: true, status: 'FAILED' as const };
    }
    if (payout.providerStatus !== t.status) await this.repo.updateProviderState(payout.id, { providerStatus: t.status });
    return { handled: true, status: t.status };
  }

  /** Webhook: verified by the provider adapter, then re-read from the provider's API before anything changes. */
  async handleWebhook(rawBody: string, header: (name: string) => string | undefined) {
    if (!this.provider) return { handled: false };
    const event = await this.provider.parseWebhook(rawBody, header);
    if (!event) return { handled: false };
    return this.apply(await this.provider.fetch(event.id));
  }

  /** Job: re-reads every PROCESSING payout (webhooks can be lost). */
  async poll() {
    if (!this.provider) return { checked: 0, settled: 0 };
    let settled = 0;
    const open = await this.repo.processingPayouts(this.provider.name);
    for (const p of open) {
      try {
        const r = await this.apply(await this.provider.fetch(p.providerTransferId!));
        if (r.handled && (r.status === 'PAID' || r.status === 'FAILED')) settled++;
      } catch (e) {
        this.log(`payout provider fetch(${p.id}) failed`, e);
      }
    }
    return { checked: open.length, settled };
  }

  /** Admin: the teacher's Stripe connected account (after Connect onboarding); null clears it. */
  async setStripeAccount(teacherId: string, stripeAccountId: string | null, actorId: string | null) {
    if (stripeAccountId !== null && !STRIPE_ACCOUNT.test(stripeAccountId)) throw new BusinessRuleError('Not a Stripe account id (acct_…)', 'INVALID_STRIPE_ACCOUNT');
    if (!(await this.repo.bankDetails(teacherId))) throw new NotFoundError('Bank details for teacher', teacherId);
    const details = await this.repo.setStripeAccount(teacherId, stripeAccountId);
    await this.audit.record({ actorId, action: 'PAYOUT_ACCOUNT_SET', entityType: 'TeacherBankDetails', entityId: teacherId, data: { stripeAccountId } });
    return details;
  }
}
