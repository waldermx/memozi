import { describe, expect, it } from 'vitest';
import { CardState } from '../types/enums.js';
import { buildDailyQueue } from './dailyQueue.js';

const NOW = new Date('2026-10-13T12:00:00Z');
const daysFromNow = (days: number): Date => new Date(NOW.getTime() + days * 86_400_000);

interface Item {
  readonly id: string;
  readonly state: CardState;
  readonly due: Date;
}

const review = (id: string, due: Date, state = CardState.Review): Item => ({ id, state, due });
const fresh = (id: string): Item => ({ id, state: CardState.New, due: NOW });
const ids = (items: readonly Item[]): string[] => items.map((i) => i.id);

const LIMITS = { newPerDay: 5, maxReviews: 50 };

describe('buildDailyQueue', () => {
  it('returns an empty queue when there are no cards', () => {
    expect(buildDailyQueue([], NOW, LIMITS)).toEqual([]);
  });

  it('puts due cards first, the most overdue one at the front', () => {
    const cards = [
      review('b', daysFromNow(-1)),
      review('a', daysFromNow(-3)),
      review('c', daysFromNow(-2)),
    ];

    expect(ids(buildDailyQueue(cards, NOW, LIMITS))).toEqual(['a', 'c', 'b']);
  });

  it('leaves out cards that are not due yet', () => {
    const cards = [review('later', daysFromNow(1)), review('now', NOW), review('past', daysFromNow(-1))];

    expect(ids(buildDailyQueue(cards, NOW, LIMITS))).toEqual(['past', 'now']);
  });

  it('includes Learning and Relearning cards that are due', () => {
    const cards = [
      review('relearn', daysFromNow(-1), CardState.Relearning),
      review('learn', daysFromNow(-2), CardState.Learning),
    ];

    expect(ids(buildDailyQueue(cards, NOW, LIMITS))).toEqual(['learn', 'relearn']);
  });

  it('adds new cards after every due card, in their given order', () => {
    const cards = [fresh('n1'), review('r1', daysFromNow(-1)), fresh('n2')];

    expect(ids(buildDailyQueue(cards, NOW, LIMITS))).toEqual(['r1', 'n1', 'n2']);
  });

  it('stops at the daily limit of new cards', () => {
    const cards = [fresh('n1'), fresh('n2'), fresh('n3'), fresh('n4')];

    const queue = buildDailyQueue(cards, NOW, { newPerDay: 2, maxReviews: 50 });

    expect(ids(queue)).toEqual(['n1', 'n2']);
  });

  it('subtracts the new cards already introduced today from the daily limit', () => {
    const cards = [fresh('n1'), fresh('n2'), fresh('n3')];

    const queue = buildDailyQueue(cards, NOW, { newPerDay: 3, maxReviews: 50, newIntroducedToday: 2 });

    expect(ids(queue)).toEqual(['n1']);
  });

  it('adds no new cards once the daily limit is used up', () => {
    const cards = [fresh('n1'), review('r1', daysFromNow(-1))];

    const queue = buildDailyQueue(cards, NOW, { newPerDay: 2, maxReviews: 50, newIntroducedToday: 5 });

    expect(ids(queue)).toEqual(['r1']);
  });

  it('never exceeds the maximum number of reviews, keeping the most overdue', () => {
    const cards = [
      review('d3', daysFromNow(-1)),
      review('d1', daysFromNow(-3)),
      review('d2', daysFromNow(-2)),
    ];

    const queue = buildDailyQueue(cards, NOW, { newPerDay: 5, maxReviews: 2 });

    expect(ids(queue)).toEqual(['d1', 'd2']);
  });

  it('fills the remaining room under the maximum with new cards', () => {
    const cards = [review('r1', daysFromNow(-1)), fresh('n1'), fresh('n2'), fresh('n3')];

    const queue = buildDailyQueue(cards, NOW, { newPerDay: 5, maxReviews: 3 });

    expect(ids(queue)).toEqual(['r1', 'n1', 'n2']);
  });

  it('returns nothing when the maximum is zero', () => {
    const cards = [review('r1', daysFromNow(-1)), fresh('n1')];

    expect(buildDailyQueue(cards, NOW, { newPerDay: 5, maxReviews: 0 })).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const cards = Object.freeze([review('b', daysFromNow(-1)), review('a', daysFromNow(-2))]);

    expect(() => buildDailyQueue(cards, NOW, LIMITS)).not.toThrow();
    expect(ids(cards)).toEqual(['b', 'a']);
  });

  it.each([
    { newPerDay: -1, maxReviews: 5 },
    { newPerDay: 1.5, maxReviews: 5 },
    { newPerDay: 1, maxReviews: -1 },
    { newPerDay: 1, maxReviews: Number.NaN },
    { newPerDay: 1, maxReviews: 5, newIntroducedToday: -1 },
  ])('rejects invalid limits %o', (limits) => {
    expect(() => buildDailyQueue([], NOW, limits)).toThrow(RangeError);
  });
});
