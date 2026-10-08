/**
 * Data-quality check: every HSK 1-3 entry in data/*.json must be practisable.
 * It reads ~600 entries from disk and runs in well under a second, so it stays
 * in the normal suite. The summary is printed to help track data issues.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toPracticeSteps } from './steps.js';

interface VocabularyEntry {
  simplified: string;
  forms: { transcriptions: { pinyin: string } }[];
}

const DATA_DIR = new URL('../../../data/', import.meta.url);
const LEVELS = [1, 2, 3] as const;

function loadLevel(level: number): VocabularyEntry[] {
  return JSON.parse(readFileSync(new URL(`${level}.json`, DATA_DIR), 'utf8')) as VocabularyEntry[];
}

describe.each(LEVELS)('data/%i.json', (level) => {
  const entries = loadLevel(level);

  it('has entries', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('builds practice steps for every entry', () => {
    const failures: string[] = [];
    const pinyinMismatch: string[] = [];
    const nonCjk: string[] = [];

    entries.forEach((entry, i) => {
      const pinyin = entry.forms[0]?.transcriptions.pinyin ?? '';
      try {
        const steps = toPracticeSteps({ id: `${level}-${i}`, simplified: entry.simplified, pinyin });
        if (steps.some((s) => s.pinyin === null)) pinyinMismatch.push(entry.simplified);
        if (steps.length !== Array.from(entry.simplified).length) nonCjk.push(entry.simplified);
      } catch (err) {
        failures.push(`${entry.simplified}: ${String(err)}`);
      }
    });

    console.info(
      `[data-quality] HSK${level}: ${entries.length} entries, ` +
        `${pinyinMismatch.length} pinyin/char mismatches [${pinyinMismatch.join(', ')}], ` +
        `${nonCjk.length} with non-CJK parts [${nonCjk.join(', ')}]`,
    );

    expect(failures).toEqual([]);
  });
});
