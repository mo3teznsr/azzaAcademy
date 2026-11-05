/**
 * App Store reviewer demo accounts (env `DEMO_REVIEWER_EMAILS`, comma-separated).
 *
 * Apple reviews the app at arbitrary times, but a real session only opens its lobby 15 minutes before start and
 * students then wait for the teacher to go live. For the listed accounts — and only them — the classroom behaves
 * as if their session were already live, without touching the real session (see `JoinPolicy.plan` and
 * `SessionService.join`). Everybody else goes through the unchanged rules.
 */
export class DemoReviewers {
  private readonly emails: ReadonlySet<string>;

  constructor(emails: Iterable<string> = []) {
    this.emails = new Set([...emails].map(normalize).filter(Boolean));
  }

  /** `"a@x.com, B@x.com"` → reviewers a@x.com and b@x.com. Empty / unset → nobody. */
  static fromCsv(csv: string | undefined | null) {
    return new DemoReviewers((csv ?? '').split(','));
  }

  static none() {
    return new DemoReviewers();
  }

  isDemo(email: string | null | undefined): boolean {
    return !!email && this.emails.has(normalize(email));
  }
}

const normalize = (email: string) => email.trim().toLowerCase();

/** LiveKit room a reviewer gets when the real session is not live: private to them, unknown to the webhook. */
export const demoRoomName = (sessionRoomName: string, userId: string) => `${sessionRoomName}--demo--${userId}`;
