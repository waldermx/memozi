/**
 * Unit tests for the pure binary FSRS scheduler. No I/O, no clock: every
 * timestamp is passed in explicitly.
 */

import { describe, it, expect } from 'vitest';
import { Rating } from 'ts-fsrs';
import { createNewSrsCard, scheduleBinary } from './scheduler.js';
import { BinaryRating } from './BinaryRating.js';
import { FSRSParameters } from './FSRSParameters.js';
import type { SrsCard } from './SrsCard.js';
import { CardState } from '../types/enums.js';

const REVIEW_AT = new Date('2026-01-01T10:00:00Z');
const params = FSRSParameters.default();

function makeCard(overrides: Partial<SrsCard> = {}): SrsCard {
  return {
    ...createNewSrsCard(new Date('2026-01-01T00:00:00Z')),
    ...overrides,
  };
}

describe('createNewSrsCard', () => {
  it('creates a card in New state', () => {
    expect(createNewSrsCard(REVIEW_AT).state).toBe(CardState.New);
  });

  it('starts with reps=0, lapses=0 and no lastReview', () => {
    const card = createNewSrsCard(REVIEW_AT);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.lastReview).toBeNull();
  });

  it('is due at the given creation time', () => {
    expect(createNewSrsCard(REVIEW_AT).due).toEqual(REVIEW_AT);
  });
});

describe('scheduleBinary — correct answer (0 mistakes)', () => {
  it('increments reps after correct answer on New card', () => {
    const card = makeCard();
    const result = scheduleBinary(card, BinaryRating.correct(), params, REVIEW_AT);
    expect(result.card.reps).toBeGreaterThan(card.reps);
  });

  it('moves card out of New state after first correct answer', () => {
    const result = scheduleBinary(makeCard(), BinaryRating.correct(), params, REVIEW_AT);
    expect(result.card.state).not.toBe(CardState.New);
  });

  it('schedules due date in the future', () => {
    const card = makeCard({ due: REVIEW_AT });
    const result = scheduleBinary(card, BinaryRating.correct(), params, REVIEW_AT);
    expect(result.card.due.getTime()).toBeGreaterThan(REVIEW_AT.getTime());
  });

  it('does NOT increment lapses on correct answer', () => {
    const card = makeCard({ lapses: 2 });
    const result = scheduleBinary(card, BinaryRating.correct(), params, REVIEW_AT);
    expect(result.card.lapses).toBe(2);
  });

  it('sets stability > 0 after first correct answer', () => {
    const result = scheduleBinary(makeCard(), BinaryRating.correct(), params, REVIEW_AT);
    expect(result.card.stability).toBeGreaterThan(0);
  });

  it('sets lastReview to the provided reviewedAt timestamp', () => {
    const result = scheduleBinary(makeCard(), BinaryRating.correct(), params, REVIEW_AT);
    expect(result.card.lastReview).toEqual(REVIEW_AT);
  });

  it('returns Rating.Good in the result', () => {
    const result = scheduleBinary(makeCard(), BinaryRating.correct(), params, REVIEW_AT);
    expect(result.rating).toBe(Rating.Good);
  });
});

describe('scheduleBinary — incorrect answer (>0 mistakes)', () => {
  const reviewCard = { state: CardState.Review, reps: 5, stability: 10, difficulty: 5 };

  it('increments lapses after incorrect answer on Review card', () => {
    const card = makeCard({
      ...reviewCard,
      lapses: 0,
      lastReview: new Date('2025-12-20T10:00:00Z'),
    });
    const result = scheduleBinary(card, BinaryRating.incorrect(2), params, REVIEW_AT);
    expect(result.card.lapses).toBe(1);
  });

  it('schedules card due within 24 hours after Again on New card', () => {
    const card = makeCard({ due: REVIEW_AT });
    const result = scheduleBinary(card, BinaryRating.incorrect(1), params, REVIEW_AT);
    const diffMinutes = (result.card.due.getTime() - REVIEW_AT.getTime()) / 60_000;
    expect(diffMinutes).toBeLessThan(24 * 60);
  });

  it('sets card to Relearning state after Again on Review card', () => {
    const card = makeCard({ ...reviewCard, lastReview: new Date('2025-12-20T10:00:00Z') });
    const result = scheduleBinary(card, BinaryRating.incorrect(1), params, REVIEW_AT);
    expect(result.card.state).toBe(CardState.Relearning);
  });

  it('returns Rating.Again in the result', () => {
    const result = scheduleBinary(makeCard(), BinaryRating.incorrect(1), params, REVIEW_AT);
    expect(result.rating).toBe(Rating.Again);
  });
});

describe('scheduleBinary — determinism and purity', () => {
  it('produces the same result for the same inputs', () => {
    const card = makeCard();
    const a = scheduleBinary(card, BinaryRating.correct(), params, REVIEW_AT);
    const b = scheduleBinary(card, BinaryRating.correct(), params, REVIEW_AT);
    expect(a.card).toEqual(b.card);
  });

  it('does not mutate the original card', () => {
    const card = makeCard();
    const snapshot = structuredClone(card);
    scheduleBinary(card, BinaryRating.correct(), params, REVIEW_AT);
    expect(card).toEqual(snapshot);
  });

  it('schedules a previously-reviewed card and records elapsed days', () => {
    const firstReview = new Date('2026-01-01T10:00:00Z');
    const secondReview = new Date('2026-01-08T10:00:00Z');
    const card = makeCard({
      state: CardState.Review,
      stability: 5,
      difficulty: 5,
      reps: 1,
      lastReview: firstReview,
      due: secondReview,
      scheduledDays: 7,
    });
    const result = scheduleBinary(card, BinaryRating.correct(), params, secondReview);
    expect(result.card.reps).toBeGreaterThan(card.reps);
    expect(result.card.lastReview).toEqual(secondReview);
    expect(result.card.elapsedDays).toBe(7);
  });
});

describe('scheduleBinary — learning steps (ts-fsrs 5)', () => {
  const MINUTE = 60_000;

  it('new cards start at learning step 0', () => {
    expect(createNewSrsCard(REVIEW_AT).learningSteps).toBe(0);
  });

  it('a correct first review moves to the next learning step (10 minutes by default)', () => {
    const result = scheduleBinary(makeCard(), BinaryRating.correct(), params, REVIEW_AT);
    expect(result.card.state).toBe(CardState.Learning);
    expect(result.card.learningSteps).toBe(1);
    expect(result.card.due.getTime() - REVIEW_AT.getTime()).toBe(10 * MINUTE);
  });

  it('an incorrect first review stays on step 0 and comes back in 1 minute', () => {
    const result = scheduleBinary(makeCard(), BinaryRating.incorrect(), params, REVIEW_AT);
    expect(result.card.state).toBe(CardState.Learning);
    expect(result.card.learningSteps).toBe(0);
    expect(result.card.due.getTime() - REVIEW_AT.getTime()).toBe(1 * MINUTE);
  });

  it('graduates to Review after passing the last learning step', () => {
    const first = scheduleBinary(makeCard(), BinaryRating.correct(), params, REVIEW_AT).card;
    const second = scheduleBinary(first, BinaryRating.correct(), params, first.due).card;
    expect(second.state).toBe(CardState.Review);
    expect(second.scheduledDays).toBeGreaterThanOrEqual(1);
  });

  it('with no learning steps, a correct first review goes straight to Review', () => {
    const result = scheduleBinary(makeCard(), BinaryRating.correct(), params, REVIEW_AT, {
      learningSteps: [],
      relearningSteps: [],
    });
    expect(result.card.state).toBe(CardState.Review);
  });

  it('computes elapsedDays from lastReview, ignoring the stored value', () => {
    const card = makeCard({
      state: CardState.Review,
      stability: 5,
      difficulty: 5,
      reps: 2,
      lastReview: new Date('2026-01-01T10:00:00Z'),
      elapsedDays: 999,
      scheduledDays: 3,
    });
    const reviewedAt = new Date('2026-01-04T10:00:00Z');
    const result = scheduleBinary(card, BinaryRating.correct(), params, reviewedAt);
    expect(result.card.elapsedDays).toBe(3);
  });

  it('accepts migrated legacy 17-weight parameters', () => {
    const legacy = FSRSParameters.fromArray([
      0.40255, 1.18385, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.06046, 1.616, 0.1544, 1.0071,
      1.9395, 0.11, 0.29605, 2.2698, 0.2994, 2.9898,
    ]);
    const result = scheduleBinary(makeCard(), BinaryRating.correct(), legacy, REVIEW_AT);
    expect(result.card.stability).toBeGreaterThan(0);
  });
});
