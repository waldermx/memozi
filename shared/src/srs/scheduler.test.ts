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
    const card = makeCard({ ...reviewCard, lapses: 0, lastReview: new Date('2025-12-20T10:00:00Z') });
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
