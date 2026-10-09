import { describe, expect, it } from 'vitest';
import { InvalidPracticeWordError, toPracticeSteps } from './steps.js';

describe('toPracticeSteps', () => {
  it('returns a single step for a one-character word', () => {
    expect(toPracticeSteps({ id: 1, simplified: '爱', pinyin: 'ài' })).toEqual([
      { index: 0, position: 0, char: '爱', pinyin: 'ài', word: '爱', total: 1 },
    ]);
  });

  it('keeps repeated characters as independent steps', () => {
    const steps = toPracticeSteps({ id: 3, simplified: '爸爸', pinyin: 'bà ba' });

    expect(steps).toEqual([
      { index: 0, position: 0, char: '爸', pinyin: 'bà', word: '爸爸', total: 2 },
      { index: 1, position: 1, char: '爸', pinyin: 'ba', word: '爸爸', total: 2 },
    ]);
    expect(steps[0]).not.toBe(steps[1]);
  });

  it('aligns every syllable of a three-character word', () => {
    const steps = toPracticeSteps({ id: 'bkq', simplified: '不客气', pinyin: 'bù kè qi' });

    expect(steps.map((s) => [s.char, s.pinyin])).toEqual([
      ['不', 'bù'],
      ['客', 'kè'],
      ['气', 'qi'],
    ]);
    expect(steps.every((s) => s.total === 3 && s.word === '不客气')).toBe(true);
  });

  it('handles the four-character entry from HSK 2 (公共汽车)', () => {
    const steps = toPracticeSteps({
      id: 'gggc',
      simplified: '公共汽车',
      pinyin: 'gōng gòng qì chē',
    });

    expect(steps.map((s) => s.char).join('')).toBe('公共汽车');
    expect(steps.map((s) => s.pinyin)).toEqual(['gōng', 'gòng', 'qì', 'chē']);
    expect(steps.map((s) => s.index)).toEqual([0, 1, 2, 3]);
  });

  it('aligns erhua when the data gives 儿 its own syllable (一会儿)', () => {
    const steps = toPracticeSteps({ id: 'yhr', simplified: '一会儿', pinyin: 'yī huì r' });

    expect(steps.map((s) => s.pinyin)).toEqual(['yī', 'huì', 'r']);
  });

  it('skips non-CJK characters but keeps them in the reference word (T恤)', () => {
    const steps = toPracticeSteps({ id: 'tx', simplified: 'T恤', pinyin: 'T xù' });

    expect(steps).toEqual([
      { index: 0, position: 1, char: '恤', pinyin: 'xù', word: 'T恤', total: 1 },
    ]);
  });

  it('skips latin letters in the middle of a word (卡拉OK)', () => {
    const steps = toPracticeSteps({ id: 'kl', simplified: '卡拉OK', pinyin: 'kǎ lā ō kēi' });

    expect(steps.map((s) => [s.char, s.position, s.pinyin])).toEqual([
      ['卡', 0, 'kǎ'],
      ['拉', 1, 'lā'],
    ]);
    expect(steps[0]?.word).toBe('卡拉OK');
  });

  it('skips the middle dot and aligns syllables to the Han characters only', () => {
    const steps = toPracticeSteps({ id: 'md', simplified: '马克·吐温', pinyin: 'mǎ kè tǔ wēn' });

    expect(steps.map((s) => [s.char, s.position, s.pinyin])).toEqual([
      ['马', 0, 'mǎ'],
      ['克', 1, 'kè'],
      ['吐', 3, 'tǔ'],
      ['温', 4, 'wēn'],
    ]);
  });

  it('sets pinyin to null on every step when syllables cannot be aligned', () => {
    const steps = toPracticeSteps({ id: 'yd', simplified: '一点儿', pinyin: 'yī diǎnr' });

    expect(steps.map((s) => s.char)).toEqual(['一', '点', '儿']);
    expect(steps.map((s) => s.pinyin)).toEqual([null, null, null]);
  });

  it('sets pinyin to null when the pinyin is empty', () => {
    const steps = toPracticeSteps({ id: 'np', simplified: '你好', pinyin: '   ' });

    expect(steps.map((s) => s.pinyin)).toEqual([null, null]);
  });

  it('treats astral-plane characters as a single step', () => {
    // U+20BB7 is outside the BMP; .split('') would break it into two surrogates.
    const steps = toPracticeSteps({ id: 'ext', simplified: '𠮷野', pinyin: 'jí yě' });

    expect(steps.map((s) => s.char)).toEqual(['𠮷', '野']);
    expect(steps.map((s) => s.position)).toEqual([0, 1]);
    expect(steps.map((s) => s.pinyin)).toEqual(['jí', 'yě']);
  });

  it('throws a typed error on an empty word', () => {
    expect(() => toPracticeSteps({ id: 1, simplified: '', pinyin: '' })).toThrow(
      InvalidPracticeWordError,
    );
    expect(() => toPracticeSteps({ id: 1, simplified: '  ', pinyin: '' })).toThrowError(
      expect.objectContaining({ code: 'EMPTY_WORD', wordId: 1 }),
    );
  });

  it('throws a typed error when the word has no CJK characters', () => {
    expect(() => toPracticeSteps({ id: 'ok', simplified: 'OK', pinyin: 'ō kēi' })).toThrowError(
      expect.objectContaining({ code: 'NO_CJK_CHARACTERS', wordId: 'ok' }),
    );
  });

  it('returns frozen steps', () => {
    const steps = toPracticeSteps({ id: 1, simplified: '爱', pinyin: 'ài' });

    expect(Object.isFrozen(steps)).toBe(true);
    expect(Object.isFrozen(steps[0])).toBe(true);
  });
});
