/**
 * @file src/domain/services/FSRSService.test.ts
 * @description Unit tests for the pure FSRS domain service.
 *
 * These tests have NO I/O — no database, no HTTP, no filesystem.
 * They verify that the FSRS scheduling logic correctly maps BinaryRating
 * to state transitions and that all card states are handled properly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Rating } from 'ts-fsrs';
import { FSRSService } from './FSRSService.js';
import { BinaryRating } from '../value-objects/BinaryRating.js';
import { FSRSParameters } from '../value-objects/FSRSParameters.js';
import { Card } from '../entities/Card.js';
import { CardState } from '@memozi/shared';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<ConstructorParameters<typeof Card>[0]> = {}): Card {
  return new Card({
    id: 'card-1',
    userId: 'user-1',
    characterId: 'char-1',
    state: CardState.New,
    stability: 0,
    difficulty: 0,
    due: new Date('2026-01-01T00:00:00Z'),
    reps: 0,
    lapses: 0,
    lastReview: null,
    elapsedDays: 0,
    scheduledDays: 0,
    ...overrides,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FSRSService', () => {
  let service: FSRSService;
  let defaultParams: FSRSParameters;

  beforeEach(() => {
    service = new FSRSService();
    defaultParams = FSRSParameters.default();
  });

  // ── BinaryRating value object ─────────────────────────────────────────────

  describe('BinaryRating', () => {
    it('creates correct rating from 0 mistakes', () => {
      const rating = BinaryRating.fromHanziWriter(0);
      expect(rating.outcome).toBe('correct');
      expect(rating.isCorrect).toBe(true);
      expect(rating.totalMistakes).toBe(0);
    });

    it('creates incorrect rating from 1+ mistakes', () => {
      const rating = BinaryRating.fromHanziWriter(3);
      expect(rating.outcome).toBe('incorrect');
      expect(rating.isCorrect).toBe(false);
      expect(rating.totalMistakes).toBe(3);
    });

    it('throws RangeError for negative mistakes', () => {
      expect(() => BinaryRating.fromHanziWriter(-1)).toThrow(RangeError);
    });

    it('throws RangeError for float mistakes', () => {
      expect(() => BinaryRating.fromHanziWriter(1.5)).toThrow(RangeError);
    });

    it('maps correct to FSRS Rating.Good (3)', () => {
      const rating = BinaryRating.correct();
      expect(rating.toFSRSRating()).toBe(Rating.Good); // 3
    });

    it('maps incorrect to FSRS Rating.Again (1)', () => {
      const rating = BinaryRating.incorrect(2);
      expect(rating.toFSRSRating()).toBe(Rating.Again); // 1
    });

    it('toSharedRating returns Good for correct', () => {
      const rating = BinaryRating.correct();
      // FSRSRating.Good is 3 matching Rating.Good
      expect(rating.toSharedRating()).toBe(3);
    });

    it('toSharedRating returns Again for incorrect', () => {
      const rating = BinaryRating.incorrect(1);
      expect(rating.toSharedRating()).toBe(1);
    });

    it('toString includes outcome and mistakes', () => {
      expect(BinaryRating.correct().toString()).toContain('correct');
      expect(BinaryRating.incorrect(3).toString()).toContain('incorrect');
      expect(BinaryRating.incorrect(3).toString()).toContain('3');
    });
  });

  // ── FSRSParameters ────────────────────────────────────────────────────────

  describe('FSRSParameters', () => {
    it('creates default params with 17 weights', () => {
      const p = FSRSParameters.default();
      expect(p.weights).toHaveLength(17);
    });

    it('rejects array with wrong length', () => {
      expect(() => FSRSParameters.fromArray([1, 2, 3])).toThrow();
    });

    it('rejects array with NaN values', () => {
      const bad = Array(17).fill(1) as number[];
      bad[5] = NaN;
      expect(() => FSRSParameters.fromArray(bad)).toThrow();
    });

    it('fromJsonOrDefault returns defaults for invalid input', () => {
      const p = FSRSParameters.fromJsonOrDefault('not-an-array');
      expect(p.weights).toHaveLength(17);
    });

    it('fromJsonOrDefault returns defaults for null', () => {
      const p = FSRSParameters.fromJsonOrDefault(null);
      expect(p.weights).toEqual(FSRSParameters.default().weights);
    });

    it('fromJsonOrDefault catches array with wrong length', () => {
      const p = FSRSParameters.fromJsonOrDefault([1, 2, 3]);
      expect(p.weights).toEqual(FSRSParameters.default().weights);
    });

    it('serializes and deserializes roundtrip', () => {
      const original = FSRSParameters.default();
      const serialized = original.toArray();
      const restored = FSRSParameters.fromArray(serialized);
      expect(restored.weights).toEqual(original.weights);
    });

    it('withWeights returns a new instance with updated weights', () => {
      const original = FSRSParameters.default();
      const newWeights = Array(17).fill(0.5) as number[];
      const updated = original.withWeights(newWeights);
      expect(updated.weights).toEqual(newWeights);
      expect(original.weights).not.toEqual(newWeights); // original unchanged
    });
  });

  // ── FSRSService.createNewCard ─────────────────────────────────────────────

  describe('createNewCard', () => {
    it('creates a card with New state', () => {
      const card = service.createNewCard('user-1', 'char-1');
      expect(card.state).toBe(CardState.New);
    });

    it('populates userId and characterId', () => {
      const card = service.createNewCard('user-abc', 'char-xyz');
      expect(card.userId).toBe('user-abc');
      expect(card.characterId).toBe('char-xyz');
    });

    it('creates a card with reps=0 and lapses=0', () => {
      const card = service.createNewCard('user-1', 'char-1');
      expect(card.reps).toBe(0);
      expect(card.lapses).toBe(0);
    });

    it('creates a card with no lastReview', () => {
      const card = service.createNewCard('user-1', 'char-1');
      expect(card.lastReview).toBeNull();
    });

    it('generates a non-empty string id', () => {
      const card = service.createNewCard('user-1', 'char-1');
      expect(typeof card.id).toBe('string');
      expect(card.id.length).toBeGreaterThan(0);
    });

    it('generates distinct ids on each call', () => {
      const a = service.createNewCard('user-1', 'char-1');
      const b = service.createNewCard('user-1', 'char-1');
      expect(a.id).not.toBe(b.id);
    });
  });

  // ── FSRSService.scheduleBinary — correct path ─────────────────────────────

  describe('scheduleBinary — correct answer (0 mistakes)', () => {
    const REVIEW_AT = new Date('2026-01-01T10:00:00Z');

    it('increments reps after correct answer on New card', () => {
      const card = makeCard();
      const result = service.scheduleBinary(card, BinaryRating.correct(), defaultParams, REVIEW_AT);
      expect(result.updatedCard.reps).toBeGreaterThan(card.reps);
    });

    it('moves card out of New state after first correct answer', () => {
      const card = makeCard();
      const result = service.scheduleBinary(card, BinaryRating.correct(), defaultParams, REVIEW_AT);
      expect(result.updatedCard.state).not.toBe(CardState.New);
    });

    it('schedules due date in the future', () => {
      const card = makeCard({ due: REVIEW_AT });
      const result = service.scheduleBinary(card, BinaryRating.correct(), defaultParams, REVIEW_AT);
      expect(result.updatedCard.due.getTime()).toBeGreaterThan(REVIEW_AT.getTime());
    });

    it('does NOT increment lapses on correct answer', () => {
      const card = makeCard({ lapses: 2 });
      const result = service.scheduleBinary(card, BinaryRating.correct(), defaultParams, REVIEW_AT);
      expect(result.updatedCard.lapses).toBe(2);
    });

    it('sets stability > 0 after first correct answer', () => {
      const card = makeCard();
      const result = service.scheduleBinary(card, BinaryRating.correct(), defaultParams, REVIEW_AT);
      expect(result.updatedCard.stability).toBeGreaterThan(0);
    });

    it('sets lastReview to the provided reviewedAt timestamp', () => {
      const card = makeCard();
      const result = service.scheduleBinary(card, BinaryRating.correct(), defaultParams, REVIEW_AT);
      expect(result.updatedCard.lastReview).toEqual(REVIEW_AT);
    });

    it('returns Rating.Good in the result', () => {
      const card = makeCard();
      const result = service.scheduleBinary(card, BinaryRating.correct(), defaultParams, REVIEW_AT);
      expect(result.rating).toBe(Rating.Good);
    });
  });

  // ── FSRSService.scheduleBinary — incorrect path ───────────────────────────

  describe('scheduleBinary — incorrect answer (>0 mistakes)', () => {
    const REVIEW_AT = new Date('2026-01-01T10:00:00Z');

    it('increments lapses after incorrect answer on Review card', () => {
      const card = makeCard({
        state: CardState.Review,
        lapses: 0,
        reps: 3,
        stability: 5,
        difficulty: 5,
      });
      const result = service.scheduleBinary(card, BinaryRating.incorrect(2), defaultParams, REVIEW_AT);
      expect(result.updatedCard.lapses).toBe(1);
    });

    it('schedules card due within 24 hours after Again on New card', () => {
      const card = makeCard({ due: REVIEW_AT });
      const result = service.scheduleBinary(card, BinaryRating.incorrect(1), defaultParams, REVIEW_AT);
      const diffMinutes = (result.updatedCard.due.getTime() - REVIEW_AT.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeLessThan(24 * 60);
    });

    it('sets card to Relearning state after Again on Review card', () => {
      const card = makeCard({
        state: CardState.Review,
        reps: 5,
        stability: 10,
        difficulty: 5,
      });
      const result = service.scheduleBinary(card, BinaryRating.incorrect(1), defaultParams, REVIEW_AT);
      expect(result.updatedCard.state).toBe(CardState.Relearning);
    });

    it('returns Rating.Again in the result', () => {
      const card = makeCard();
      const result = service.scheduleBinary(card, BinaryRating.incorrect(1), defaultParams, REVIEW_AT);
      expect(result.rating).toBe(Rating.Again);
    });
  });

  // ── Determinism ─────────────────────────────────────────────────────────────

  describe('determinism', () => {
    it('produces the same result for the same inputs', () => {
      const card = makeCard();
      const reviewedAt = new Date('2026-01-01T10:00:00Z');
      const result1 = service.scheduleBinary(card, BinaryRating.correct(), defaultParams, reviewedAt);
      const result2 = service.scheduleBinary(card, BinaryRating.correct(), defaultParams, reviewedAt);
      expect(result1.updatedCard.due).toEqual(result2.updatedCard.due);
      expect(result1.updatedCard.stability).toBe(result2.updatedCard.stability);
    });

    it('does not mutate the original card', () => {
      const card = makeCard({ stability: 0, reps: 0 });
      service.scheduleBinary(card, BinaryRating.correct(), defaultParams, new Date('2026-01-01T10:00:00Z'));
      expect(card.stability).toBe(0);
      expect(card.reps).toBe(0);
      expect(card.state).toBe(CardState.New);
    });

    it('schedules a previously-reviewed card (lastReview is set)', () => {
      const firstReview = new Date('2026-01-01T10:00:00Z');
      const secondReview = new Date('2026-01-08T10:00:00Z');
      const card = makeCard({
        state: CardState.Review,
        stability: 5,
        reps: 1,
        lastReview: firstReview,
        due: secondReview,
        elapsedDays: 7,
        scheduledDays: 7,
      });
      const result = service.scheduleBinary(card, BinaryRating.correct(), defaultParams, secondReview);
      expect(result.updatedCard.reps).toBeGreaterThan(card.reps);
      expect(result.updatedCard.lastReview).toEqual(secondReview);
    });
  });
});
