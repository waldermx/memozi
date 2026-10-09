import { contrastRatio, parseHex, relativeLuminance } from './contrast';

describe('parseHex', () => {
  it('parses 6-digit hex colors', () => {
    expect(parseHex('#3d6e96')).toEqual([61, 110, 150]);
  });

  it('parses 3-digit hex colors', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
  });

  it('is case-insensitive and tolerates whitespace', () => {
    expect(parseHex('  #F4F6FA ')).toEqual([244, 246, 250]);
  });

  it('throws on anything that is not a hex color', () => {
    expect(() => parseHex('rgb(0,0,0)')).toThrow();
    expect(() => parseHex('#12345')).toThrow();
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBe(1);
  });

  it('matches the WCAG value for mid gray', () => {
    expect(relativeLuminance('#808080')).toBeCloseTo(0.2159, 4);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
  });

  it('is 1 for identical colors', () => {
    expect(contrastRatio('#3d6e96', '#3d6e96')).toBe(1);
  });

  it('does not depend on argument order', () => {
    expect(contrastRatio('#ffffff', '#3d6e96')).toBe(contrastRatio('#3d6e96', '#ffffff'));
  });

  it('matches known reference pairs', () => {
    // #767676 on white is the classic "just passes AA" gray
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    // values measured in the style guide
    expect(contrastRatio('#343435', '#f4f6fa')).toBeCloseTo(11.5, 1);
    expect(contrastRatio('#ffffff', '#3d6e96')).toBeCloseTo(5.4, 1);
  });
});
