import type { Category } from "../theme";
import type { Transaction } from "../types";

/**
 * Per-supplier learned defaults, derived from past *verified* transactions.
 * We deliberately ignore pending (auto-posted) rows so the model's guesses
 * don't reinforce themselves before a human has approved them.
 */
export interface SupplierMemory {
  category: Category;
  /** How many prior transactions support this default. */
  count: number;
}

export type SupplierMemoryMap = Record<string, SupplierMemory>;

export const normalizeSupplier = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

export function buildSupplierMemory(
  txs: Transaction[],
): SupplierMemoryMap {
  // For each supplier, count occurrences of each category.
  const counts: Record<string, Partial<Record<string, number>>> = {};
  for (const t of txs) {
    if (t.status !== "verified") continue;
    const key = normalizeSupplier(t.company);
    if (!key) continue;
    const bucket = counts[key] ?? (counts[key] = {});
    bucket[t.category] = (bucket[t.category] ?? 0) + 1;
  }
  // Pick the most-frequent category per supplier (ties → most recent wins
  // implicitly because we iterate in order).
  const result: SupplierMemoryMap = {};
  for (const [supplier, byCategory] of Object.entries(counts)) {
    let bestCat: string | null = null;
    let bestCount = 0;
    for (const [cat, n] of Object.entries(byCategory)) {
      if ((n ?? 0) > bestCount) {
        bestCat = cat;
        bestCount = n ?? 0;
      }
    }
    if (bestCat) {
      result[supplier] = {
        category: bestCat as Category,
        count: bestCount,
      };
    }
  }
  return result;
}

export function lookupSupplier(
  memory: SupplierMemoryMap,
  name: string,
): SupplierMemory | null {
  return memory[normalizeSupplier(name)] ?? null;
}
