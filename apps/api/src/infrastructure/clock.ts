import type { Clock } from '../core/ports';

export const systemClock: Clock = { now: () => new Date() };

export class FixedClock implements Clock {
  constructor(private current: Date) {}
  now() {
    return new Date(this.current);
  }
  set(date: Date) {
    this.current = date;
  }
}
