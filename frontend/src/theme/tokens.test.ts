import tokensCss from './tokens.css?raw';
import themeCss from './variables.css?raw';
import { contrastRatio, parseHex } from './contrast';

type TokenMap = Record<string, string>;

const DARK_QUERY = '@media (prefers-color-scheme: dark)';

/** Returns the body of the first `{ ... }` block found at or after `from`. */
function blockBody(css: string, from: number): string {
  const open = css.indexOf('{', from);
  if (open === -1) throw new Error('no block found');
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error('unbalanced braces');
}

function declarations(body: string): TokenMap {
  const map: TokenMap = {};
  const noComments = body.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of noComments.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map[m[1]] = m[2].trim();
  }
  return map;
}

function lightTokens(css: string): TokenMap {
  const start = css.search(/(^|\n)\s*:root\s*\{/);
  if (start === -1) throw new Error('no top-level :root block');
  return declarations(blockBody(css, start));
}

function darkTokens(css: string): TokenMap {
  const media = css.indexOf(DARK_QUERY);
  if (media === -1) throw new Error(`no ${DARK_QUERY} block`);
  const inner = blockBody(css, media);
  return declarations(blockBody(inner, inner.indexOf(':root')));
}

// Color tokens from "Guía de estilo MemoZi" v0, plus --mz-on-action
// (text/icon color on top of --mz-action, needed because white on the
// dark-mode action color only reaches ~2.6:1).
const GUIDE_COLORS: Record<string, { light: string; dark: string }> = {
  '--mz-bg': { light: '#f4f6fa', dark: '#121417' },
  '--mz-surface': { light: '#ffffff', dark: '#1b1e22' },
  '--mz-text': { light: '#343435', dark: '#e7e9ee' },
  '--mz-text-muted': { light: '#5f6368', dark: '#9aa0a6' },
  '--mz-ink': { light: '#000000', dark: '#ffffff' },
  '--mz-brand': { light: '#477fac', dark: '#7aa6cc' },
  '--mz-action': { light: '#3d6e96', dark: '#7aa6cc' },
  '--mz-success': { light: '#2f7d5b', dark: '#4fa37f' },
  '--mz-error': { light: '#b4483c', dark: '#e07a6e' },
  '--mz-line': { light: '#dde1e8', dark: '#2a2e34' },
};

const light = lightTokens(tokensCss);
const dark = darkTokens(tokensCss);

describe('design tokens: colors', () => {
  it.each(Object.entries(GUIDE_COLORS))('%s matches the style guide in light and dark', (name, expected) => {
    expect(light[name]?.toLowerCase()).toBe(expected.light);
    expect(dark[name]?.toLowerCase()).toBe(expected.dark);
  });

  it('defines --mz-on-action in both schemes', () => {
    expect(() => parseHex(light['--mz-on-action'])).not.toThrow();
    expect(() => parseHex(dark['--mz-on-action'])).not.toThrow();
  });

  it('every --mz color defined in light is overridden in dark', () => {
    const colorNames = Object.keys(light).filter(
      (k) => k.startsWith('--mz-') && /^#[0-9a-f]{3,6}$/i.test(light[k]),
    );
    expect(colorNames.length).toBeGreaterThanOrEqual(Object.keys(GUIDE_COLORS).length);
    for (const name of colorNames) expect(dark, name).toHaveProperty(name);
  });
});

describe('design tokens: WCAG contrast', () => {
  const AA = 4.5;
  const pairs: Array<[fg: string, bg: string]> = [
    ['--mz-text', '--mz-bg'],
    ['--mz-text', '--mz-surface'],
    ['--mz-text-muted', '--mz-bg'],
    ['--mz-text-muted', '--mz-surface'],
    ['--mz-on-action', '--mz-action'],
    ['--mz-action', '--mz-bg'],
    ['--mz-success', '--mz-surface'],
    ['--mz-error', '--mz-surface'],
  ];

  it.each(pairs)('light: %s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrastRatio(light[fg], light[bg])).toBeGreaterThanOrEqual(AA);
  });

  it.each(pairs)('dark: %s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrastRatio(dark[fg], dark[bg])).toBeGreaterThanOrEqual(AA);
  });

  it('light: white text on the primary button passes AA', () => {
    expect(contrastRatio('#ffffff', light['--mz-action'])).toBeGreaterThanOrEqual(AA);
  });
});

describe('design tokens: scales', () => {
  it('spacing is a 4px grid from --mz-space-1 to --mz-space-8', () => {
    for (let i = 1; i <= 8; i++) {
      expect(light[`--mz-space-${i}`]).toBe(`${i * 4}px`);
    }
  });

  it('type scale is 13/15/17/22/28', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'].map((s) => light[`--mz-font-size-${s}`]);
    expect(sizes).toEqual(['13px', '15px', '17px', '22px', '28px']);
  });

  it('radius is 8px', () => {
    expect(light['--mz-radius']).toBe('8px');
  });

  it('motion stays within 150-200ms and drops to 0 with reduced motion', () => {
    expect(light['--mz-duration-fast']).toBe('150ms');
    expect(light['--mz-duration-base']).toBe('200ms');
    expect(light['--mz-ease']).toBe('ease-out');
    const media = tokensCss.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(media).toBeGreaterThan(-1);
    const reduced = declarations(blockBody(tokensCss, tokensCss.indexOf(':root', media)));
    expect(reduced['--mz-duration-fast']).toBe('0ms');
    expect(reduced['--mz-duration-base']).toBe('0ms');
  });

  it('hanzi font stack uses Noto Serif SC first', () => {
    expect(light['--mz-font-hanzi']).toMatch(/^"Noto Serif SC",\s*"Noto Sans SC",\s*serif$/);
    expect(light['--mz-font-ui']).toMatch(/^system-ui/);
  });
});

describe('Ionic theme mapping', () => {
  const ionLight = lightTokens(themeCss);

  it('primary points at --mz-action', () => {
    expect(ionLight['--ion-color-primary']).toBe('var(--mz-action)');
  });

  it('primary-rgb literal stays in sync with --mz-action', () => {
    const rgb = parseHex(light['--mz-action']).join(',');
    expect(ionLight['--ion-color-primary-rgb'].replace(/\s/g, '')).toBe(rgb);
  });

  it('background and text come from the tokens', () => {
    expect(ionLight['--ion-background-color']).toBe('var(--mz-bg)');
    expect(ionLight['--ion-text-color']).toBe('var(--mz-text)');
  });
});
