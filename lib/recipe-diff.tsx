'use client';

import * as Diff from 'diff';

export function formatIngredientForCompare(ing: { name: string; quantity: string; unit: string }): string {
  return [ing.quantity, ing.unit, ing.name].filter(Boolean).join(' ').trim() || ing.name;
}

export function getIngredientDiff(
  current: Array<{ name: string; quantity: string; unit: string }>,
  pending: Array<{ name: string; quantity: string; unit: string }>
): { type: 'removed' | 'added' | 'unchanged'; text: string }[] {
  const currentStrs = current.map(formatIngredientForCompare);
  const pendingStrs = pending.map(formatIngredientForCompare);
  const currentSet = new Set(currentStrs);
  const pendingSet = new Set(pendingStrs);

  const result: { type: 'removed' | 'added' | 'unchanged'; text: string }[] = [];

  // Removed: in current, not in pending
  for (const s of currentStrs) {
    if (!pendingSet.has(s)) {
      result.push({ type: 'removed', text: s });
    }
  }
  // Unchanged + Added: walk through pending to preserve order
  for (const s of pendingStrs) {
    result.push({
      type: currentSet.has(s) ? 'unchanged' : 'added',
      text: s,
    });
  }

  return result;
}

export function getTextDiff(current: string, pending: string): { added?: boolean; removed?: boolean; value: string }[] {
  return Diff.diffWords(current || '', pending || '');
}
