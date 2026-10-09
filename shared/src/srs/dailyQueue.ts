/**
 * @file shared/src/srs/dailyQueue.ts
 * @description Builds the list of cards to study today. Pure: no clock, no storage.
 *
 * Order: cards that are due, most overdue first, then new cards up to the daily
 * limit. The whole queue never has more than `maxReviews` cards.
 */

import { CardState } from '../types/enums.js';
import type { SrsCard } from './SrsCard.js';

export interface DailyQueueLimits {
  /** New cards that may be introduced per day. */
  readonly newPerDay: number;
  /** Maximum size of the queue (due and new cards together). */
  readonly maxReviews: number;
  /** New cards already introduced today; counts against `newPerDay`. Default 0. */
  readonly newIntroducedToday?: number;
}

/** Anything carrying the scheduling fields the queue needs (an `SrsCard` fits). */
export type QueueCard = Pick<SrsCard, 'state' | 'due'>;

/**
 * @param cards - Every card of the learner, in any order. New cards keep their given order.
 * @param now - Reference time; cards due at or before it are pending.
 * @returns A new array; the input is not touched.
 * @throws {RangeError} when a limit is not a non-negative integer.
 */
export function buildDailyQueue<T extends QueueCard>(
  cards: readonly T[],
  now: Date,
  limits: DailyQueueLimits,
): T[] {
  const { newPerDay, maxReviews, newIntroducedToday = 0 } = limits;
  assertCount('newPerDay', newPerDay);
  assertCount('maxReviews', maxReviews);
  assertCount('newIntroducedToday', newIntroducedToday);

  const pending = cards
    .filter((c) => c.state !== CardState.New && c.due.getTime() <= now.getTime())
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, maxReviews);

  const newAllowed = Math.min(
    Math.max(newPerDay - newIntroducedToday, 0),
    maxReviews - pending.length,
  );
  const fresh = cards.filter((c) => c.state === CardState.New).slice(0, newAllowed);

  return [...pending, ...fresh];
}

function assertCount(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer, got ${String(value)}`);
  }
}
