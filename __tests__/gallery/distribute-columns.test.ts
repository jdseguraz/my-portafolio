/**
 * Tests for src/lib/gallery/distribute-columns.ts
 * FR-129, ADR-42 — Pure column distribution utility
 * Strict TDD — RED phase: module does not exist yet.
 */
import { describe, it, expect } from 'vitest';
import { distributeToColumns } from '../../src/lib/gallery/distribute-columns';

describe('distributeToColumns', () => {
  it('empty array with n=3 returns three empty columns', () => {
    expect(distributeToColumns([], 3)).toEqual([[], [], []]);
  });

  it('single item with n=3 returns item in first column', () => {
    const item = { id: 'a' };
    expect(distributeToColumns([item], 3)).toEqual([[item], [], []]);
  });

  it('6 items with n=3 returns 3 arrays of 2 each (index modulo 3)', () => {
    const items = [0, 1, 2, 3, 4, 5];
    const result = distributeToColumns(items, 3);
    expect(result).toEqual([[0, 3], [1, 4], [2, 5]]);
  });

  it('5 items with n=3 returns [0,3],[1,4],[2]', () => {
    const items = [0, 1, 2, 3, 4];
    const result = distributeToColumns(items, 3);
    expect(result).toEqual([[0, 3], [1, 4], [2]]);
  });

  it('5 items with n=2 returns [0,2,4],[1,3]', () => {
    const items = [0, 1, 2, 3, 4];
    const result = distributeToColumns(items, 2);
    expect(result).toEqual([[0, 2, 4], [1, 3]]);
  });

  it('5 items with n=1 returns all items in a single column', () => {
    const items = [0, 1, 2, 3, 4];
    const result = distributeToColumns(items, 1);
    expect(result).toEqual([[0, 1, 2, 3, 4]]);
  });

  it('throws when n=0', () => {
    expect(() => distributeToColumns([1, 2, 3], 0)).toThrow();
  });

  it('throws when n=-1', () => {
    expect(() => distributeToColumns([1, 2, 3], -1)).toThrow();
  });

  it('order preservation: items appear in original index order within each column', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const result = distributeToColumns(items, 3);
    // col 0: indices 0, 3, 6 → 'a', 'd', 'g'
    expect(result[0]).toEqual(['a', 'd', 'g']);
    // col 1: indices 1, 4 → 'b', 'e'
    expect(result[1]).toEqual(['b', 'e']);
    // col 2: indices 2, 5 → 'c', 'f'
    expect(result[2]).toEqual(['c', 'f']);
  });
});
