import { describe, it, expect } from 'vitest';
import { Rating } from 'ts-fsrs';
import { BinaryRating } from './BinaryRating.js';
import { FSRSRating } from '../types/enums.js';

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
    expect(BinaryRating.correct().toFSRSRating()).toBe(Rating.Good);
  });

  it('maps incorrect to FSRS Rating.Again (1)', () => {
    expect(BinaryRating.incorrect(2).toFSRSRating()).toBe(Rating.Again);
  });

  it('toSharedRating returns Good for correct', () => {
    expect(BinaryRating.correct().toSharedRating()).toBe(FSRSRating.Good);
  });

  it('toSharedRating returns Again for incorrect', () => {
    expect(BinaryRating.incorrect(1).toSharedRating()).toBe(FSRSRating.Again);
  });

  it('incorrect() defaults to one mistake', () => {
    expect(BinaryRating.incorrect().totalMistakes).toBe(1);
  });

  it('toString includes outcome and mistakes', () => {
    expect(BinaryRating.correct().toString()).toContain('correct');
    expect(BinaryRating.incorrect(3).toString()).toContain('incorrect');
    expect(BinaryRating.incorrect(3).toString()).toContain('3');
  });
});
