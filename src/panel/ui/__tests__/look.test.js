import fs from 'fs';
import path from 'path';
import { DENSITY, NUM_FONT, TEXT_SCALE } from '../look';

describe('the looks this device keeps', () => {
  test('anything unknown reads as the drawing\'s default', () => {
    expect(DENSITY.normalize('tight')).toBe('comfortable');
    expect(DENSITY.normalize(null)).toBe('comfortable');
    expect(NUM_FONT.normalize('comic')).toBe('azeret');
    expect(NUM_FONT.normalize('segment')).toBe('segment');
  });

  test('with no browser to remember it, the default, and no throw', () => {
    // The Jest tier has no `window`, as iOS private browsing has no storage.
    expect(DENSITY.read()).toBe('comfortable');
    expect(NUM_FONT.read()).toBe('azeret');
  });

  test('a change reaches the screen showing it, normalised', () => {
    const seen = [];
    const unhook = NUM_FONT.watch((value) => seen.push(value));
    NUM_FONT.set('plex');
    NUM_FONT.set('comic');
    unhook();
    NUM_FONT.set('jetbrains');
    expect(seen).toEqual(['plex', 'azeret']);
  });

  test('each value has a block in the token sheet, or is its root', () => {
    // A value the sheet does not switch on would be a chip that changes nothing.
    const css = fs.readFileSync(path.join(__dirname, '../../styles/tokens.css'), 'utf8');
    DENSITY.values.slice(1).forEach((value) => expect(css).toContain(`[data-density='${value}']`));
    NUM_FONT.values.slice(1).forEach((value) => expect(css).toContain(`[data-num='${value}']`));
  });

  test('the text scale is a per cent, in tens, within its range', () => {
    expect(TEXT_SCALE.normalize('130')).toBe(130);
    expect(TEXT_SCALE.normalize(134)).toBe(130);
    expect(TEXT_SCALE.normalize(500)).toBe(140);
    expect(TEXT_SCALE.normalize(10)).toBe(80);
    // Nothing stored, or nonsense: the drawing's own sizes.
    expect(TEXT_SCALE.normalize(null)).toBe(100);
    expect(TEXT_SCALE.normalize('big')).toBe(100);
  });
});
