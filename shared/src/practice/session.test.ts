import { describe, expect, it } from 'vitest';
import { FSRSRating } from '../types/enums.js';
import { recordCharResult, startWordPractice, type WordPracticeState } from './session.js';

const AI = { id: 1, simplified: '爱', pinyin: 'ài' };
const BABA = { id: 3, simplified: '爸爸', pinyin: 'bà ba' };
const BUKEQI = { id: 'bkq', simplified: '不客气', pinyin: 'bù kè qi' };
const TXU = { id: 'tx', simplified: 'T恤', pinyin: 'T xù' };

function writeAll(state: WordPracticeState, mistakes: readonly number[]): WordPracticeState {
  return mistakes.reduce((s, m) => recordCharResult(s, { mistakes: m }), state);
}

/** Recursively freezes a value so any mutation in the reducer throws. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

describe('startWordPractice', () => {
  it('starts on the first character with nothing done and no rating', () => {
    const state = startWordPractice(BUKEQI);

    expect(state.wordId).toBe('bkq');
    expect(state.word).toBe('不客气');
    expect(state.steps).toHaveLength(3);
    expect(state.currentStep).toBe(0);
    expect(state.current?.char).toBe('不');
    expect(state.isComplete).toBe(false);
    expect(state.perCharMistakes).toEqual([]);
    expect(state.totalMistakes).toBe(0);
    expect(state.rating).toBeNull();
  });

  it('exposes the whole word as reference with the first character highlighted', () => {
    const { reference } = startWordPractice(BUKEQI);

    expect(reference.word).toBe('不客气');
    expect(reference.highlightedPosition).toBe(0);
    expect(reference.chars).toEqual([
      { char: '不', position: 0, isPracticeStep: true, isDone: false, isCurrent: true },
      { char: '客', position: 1, isPracticeStep: true, isDone: false, isCurrent: false },
      { char: '气', position: 2, isPracticeStep: true, isDone: false, isCurrent: false },
    ]);
  });

  it('keeps non-CJK characters in the reference but never highlights them', () => {
    const state = startWordPractice(TXU);

    expect(state.steps).toHaveLength(1);
    expect(state.reference.highlightedPosition).toBe(1);
    expect(state.reference.chars).toEqual([
      { char: 'T', position: 0, isPracticeStep: false, isDone: false, isCurrent: false },
      { char: '恤', position: 1, isPracticeStep: true, isDone: false, isCurrent: true },
    ]);
  });

  it('propagates the typed error for an empty word', () => {
    expect(() => startWordPractice({ id: 9, simplified: '', pinyin: '' })).toThrowError(
      expect.objectContaining({ code: 'EMPTY_WORD' }),
    );
  });
});

describe('recordCharResult', () => {
  it('rates a single character written cleanly as Good', () => {
    const state = recordCharResult(startWordPractice(AI), { mistakes: 0 });

    expect(state.isComplete).toBe(true);
    expect(state.current).toBeNull();
    expect(state.currentStep).toBe(1);
    expect(state.perCharMistakes).toEqual([0]);
    expect(state.rating).toBe(FSRSRating.Good);
  });

  it('rates a single character with mistakes as Again', () => {
    const state = recordCharResult(startWordPractice(AI), { mistakes: 2 });

    expect(state.totalMistakes).toBe(2);
    expect(state.rating).toBe(FSRSRating.Again);
  });

  it('treats repeated characters as independent steps (爸爸)', () => {
    const first = recordCharResult(startWordPractice(BABA), { mistakes: 0 });

    expect(first.isComplete).toBe(false);
    expect(first.currentStep).toBe(1);
    expect(first.current?.char).toBe('爸');
    expect(first.current?.pinyin).toBe('ba');
    expect(first.reference.chars.map((c) => [c.isDone, c.isCurrent])).toEqual([
      [true, false],
      [false, true],
    ]);

    const done = recordCharResult(first, { mistakes: 1 });
    expect(done.perCharMistakes).toEqual([0, 1]);
    expect(done.rating).toBe(FSRSRating.Again);
  });

  it('rates Good only when every character has zero mistakes', () => {
    const state = writeAll(startWordPractice(BUKEQI), [0, 0, 0]);

    expect(state.isComplete).toBe(true);
    expect(state.totalMistakes).toBe(0);
    expect(state.rating).toBe(FSRSRating.Good);
  });

  it('rates Again when only the 2nd of 3 characters had mistakes', () => {
    const state = writeAll(startWordPractice(BUKEQI), [0, 3, 0]);

    expect(state.perCharMistakes).toEqual([0, 3, 0]);
    expect(state.totalMistakes).toBe(3);
    expect(state.rating).toBe(FSRSRating.Again);
  });

  it('has no rating until the last character is recorded', () => {
    const state = writeAll(startWordPractice(BUKEQI), [0, 0]);

    expect(state.isComplete).toBe(false);
    expect(state.rating).toBeNull();
    expect(state.reference.highlightedPosition).toBe(2);
  });

  it('marks every character done and removes the highlight when complete', () => {
    const state = writeAll(startWordPractice(BUKEQI), [0, 0, 0]);

    expect(state.reference.highlightedPosition).toBeNull();
    expect(state.reference.chars.every((c) => c.isDone && !c.isCurrent)).toBe(true);
  });

  it('returns the same state when recording after completion', () => {
    const done = recordCharResult(startWordPractice(AI), { mistakes: 0 });

    expect(recordCharResult(done, { mistakes: 5 })).toBe(done);
  });

  it('does not mutate the input state', () => {
    const start = deepFreeze(startWordPractice(BUKEQI));
    const snapshot = structuredClone(start);

    const next = recordCharResult(start, { mistakes: 1 });

    expect(next).not.toBe(start);
    expect(start).toEqual(snapshot);
    expect(start.perCharMistakes).toEqual([]);
    expect(start.currentStep).toBe(0);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid mistake count (%s)',
    (mistakes) => {
      expect(() => recordCharResult(startWordPractice(AI), { mistakes })).toThrow(RangeError);
    },
  );
});
