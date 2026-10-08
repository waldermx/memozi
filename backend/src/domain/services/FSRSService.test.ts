/**
 * @file src/domain/services/FSRSService.test.ts
 * @description Tests for the backend adapter around the shared SRS scheduler.
 *
 * The scheduling behaviour itself is tested in shared/src/srs. Here we only
 * check that the entity is mapped correctly in both directions.
 */

import { describe, it, expect } from 'vitest';
import { BinaryRating, CardState, FSRSParameters, Rating } from '@memozi/shared';
import { FSRSService } from './FSRSService.js';
import { Card } from '../entities/Card.js';

const REVIEW_AT = new Date('2026-01-01T10:00:00Z');

function makeCard(overrides: Partial<ConstructorParameters<typeof Card>[0]> = {}): Card {
  return new Card({
    id: 'card-1',
    userId: 'user-1',
    characterId: 'char-1',
    state: CardState.New,
    due: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });
}

describe('FSRSService', () => {
  const service = new FSRSService();
  const params = FSRSParameters.default();

  describe('createNewCard', () => {
    it('creates a New card for the given user and character', () => {
      const card = service.createNewCard('user-abc', 'char-xyz', REVIEW_AT);
      expect(card.userId).toBe('user-abc');
      expect(card.characterId).toBe('char-xyz');
      expect(card.state).toBe(CardState.New);
      expect(card.reps).toBe(0);
      expect(card.lapses).toBe(0);
      expect(card.lastReview).toBeNull();
      expect(card.due).toEqual(REVIEW_AT);
    });

    it('generates distinct non-empty ids', () => {
      const a = service.createNewCard('user-1', 'char-1');
      const b = service.createNewCard('user-1', 'char-1');
      expect(a.id.length).toBeGreaterThan(0);
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('scheduleBinary', () => {
    it('keeps identity fields and updates FSRS state', () => {
      const card = makeCard();
      const { updatedCard, rating } = service.scheduleBinary(
        card,
        BinaryRating.correct(),
        params,
        REVIEW_AT,
      );
      expect(updatedCard).toBeInstanceOf(Card);
      expect(updatedCard.id).toBe('card-1');
      expect(updatedCard.userId).toBe('user-1');
      expect(updatedCard.characterId).toBe('char-1');
      expect(updatedCard.state).not.toBe(CardState.New);
      expect(updatedCard.lastReview).toEqual(REVIEW_AT);
      expect(rating).toBe(Rating.Good);
    });

    it('does not mutate the original card', () => {
      const card = makeCard();
      service.scheduleBinary(card, BinaryRating.incorrect(2), params, REVIEW_AT);
      expect(card.state).toBe(CardState.New);
      expect(card.reps).toBe(0);
    });

    it('maps a reviewed card with lastReview to the scheduler', () => {
      const card = makeCard({
        state: CardState.Review,
        stability: 10,
        difficulty: 5,
        reps: 5,
        lastReview: new Date('2025-12-20T10:00:00Z'),
        due: REVIEW_AT,
      });
      const { updatedCard } = service.scheduleBinary(
        card,
        BinaryRating.incorrect(1),
        params,
        REVIEW_AT,
      );
      expect(updatedCard.lapses).toBe(1);
    });
  });
});
