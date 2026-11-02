/** Human-friendly order references like `AZ-B07-48213` (bank transfer notes, receipts). */
export class ReferenceGenerator {
  constructor(private readonly random: () => number = Math.random) {}

  next(batchCode: string): string {
    const digits = String(Math.floor(this.random() * 90_000) + 10_000);
    return `AZ-${batchCode}-${digits}`;
  }
}
