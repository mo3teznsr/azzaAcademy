/**
 * In-memory, per-process classroom state: the raised-hand queue and who the host gave the floor.
 * Lost on restart by design (a class is short-lived); swap for Redis when running several API nodes.
 */
export interface QueuedHand {
  userId: string;
  name: string;
  raisedAt: Date;
}

export class ClassroomState {
  private readonly hands = new Map<string, QueuedHand[]>();
  private readonly speakers = new Map<string, Set<string>>();

  raise(sessionId: string, user: { id: string; name: string }, at: Date): QueuedHand[] {
    const queue = this.hands.get(sessionId) ?? [];
    if (!queue.some((h) => h.userId === user.id)) queue.push({ userId: user.id, name: user.name, raisedAt: at });
    this.hands.set(sessionId, queue);
    return this.queue(sessionId);
  }

  lower(sessionId: string, userId: string): QueuedHand[] {
    const queue = (this.hands.get(sessionId) ?? []).filter((h) => h.userId !== userId);
    this.hands.set(sessionId, queue);
    return this.queue(sessionId);
  }

  queue(sessionId: string): QueuedHand[] {
    return [...(this.hands.get(sessionId) ?? [])].sort((a, b) => a.raisedAt.getTime() - b.raisedAt.getTime());
  }

  allowSpeak(sessionId: string, userId: string) {
    const set = this.speakers.get(sessionId) ?? new Set<string>();
    set.add(userId);
    this.speakers.set(sessionId, set);
  }

  revokeSpeak(sessionId: string, userId: string) {
    this.speakers.get(sessionId)?.delete(userId);
  }

  canSpeak(sessionId: string, userId: string) {
    return this.speakers.get(sessionId)?.has(userId) ?? false;
  }

  clear(sessionId: string) {
    this.hands.delete(sessionId);
    this.speakers.delete(sessionId);
  }
}
