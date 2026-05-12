/**
 * Distributes items across N columns using index-modulo-N strategy.
 * FR-129, ADR-42
 *
 * Pure function — no 'server-only', no 'use client'.
 * Column assignment: item at index i goes to column (i % n).
 * Within each column, items preserve their original relative order.
 */

/**
 * Distributes an array of items into `n` columns using round-robin (index % n).
 *
 * @param items  Source array (readonly — not mutated).
 * @param n      Number of columns. Must be ≥ 1; throws otherwise.
 * @returns      Array of `n` arrays, each holding the items for that column.
 *               Columns may be unequal in length; the last column(s) receive fewer items.
 */
export function distributeToColumns<T>(items: readonly T[], n: number): T[][] {
  if (n < 1) {
    throw new RangeError(`distributeToColumns: n must be ≥ 1, received ${n}`);
  }

  // Initialize n empty columns
  const columns: T[][] = Array.from({ length: n }, () => []);

  for (let i = 0; i < items.length; i++) {
    columns[i % n].push(items[i]);
  }

  return columns;
}
