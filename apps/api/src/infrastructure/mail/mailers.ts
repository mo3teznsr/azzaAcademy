import nodemailer, { type Transporter } from 'nodemailer';
import type { MailMessage, Mailer } from '../../core/ports';

export class NodemailerMailer implements Mailer {
  private readonly transport: Transporter;

  constructor(
    opts: { host: string; port: number; user?: string; pass?: string },
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.port === 465,
      auth: opts.user ? { user: opts.user, pass: opts.pass } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...message });
  }
}

/** Development fallback: prints emails instead of sending them. */
export class ConsoleMailer implements Mailer {
  readonly sent: MailMessage[] = [];
  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
    console.info(`[mail] → ${message.to} · ${message.subject}\n${message.text ?? message.html}`);
  }
}
