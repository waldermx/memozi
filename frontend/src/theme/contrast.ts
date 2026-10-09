/**
 * WCAG 2.x contrast helpers (https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio).
 * Pure functions, only hex colors (#rgb / #rrggbb) are supported.
 */

export type Rgb = [r: number, g: number, b: number];

export function parseHex(color: string): Rgb {
  const hex = color.trim().replace(/^#/, '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
    throw new Error(`Not a hex color: "${color}"`);
  }
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: string): number {
  const [r, g, b] = parseHex(color).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
