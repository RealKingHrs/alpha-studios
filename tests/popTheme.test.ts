import { describe, expect, it } from 'vitest';
import { popTheme } from '../src/site/popTheme';

describe('pop themes', () => {
  it.each([
    ['Breaking Bad', 'lab'],
    ['money heist', 'heist'],
    ['Minecraft', 'blocks'],
    ['GTA VI', 'city'],
    ['Pulp Fiction', 'diner'],
    ['Interstellar', 'space'],
    ['The Legend of Zelda', 'fantasy'],
    ['Bluey', 'stars'],
    ['', 'stars'],
  ])('%s gives the %s scene', (pick, scene) => {
    expect(popTheme(pick).scene).toBe(scene);
  });

  it('copes with missing answers', () => {
    expect(popTheme(undefined).scene).toBe('stars');
    expect(popTheme(null).caption.length).toBeGreaterThan(0);
  });
});
