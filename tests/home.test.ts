import { describe, expect, it } from 'vitest';
import { greeting } from '../src/portal/screens/Home';

describe('the Home greeting', () => {
  it('follows the hour', () => {
    expect(greeting(2)).toBe('Hello');
    expect(greeting(9)).toBe('Good morning');
    expect(greeting(14)).toBe('Good afternoon');
    expect(greeting(21)).toBe('Good evening');
  });
});
