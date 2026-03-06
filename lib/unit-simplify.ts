/**
 * Simplify units for display (e.g., 16 oz → 1 lb, 1000 g → 1 kg).
 * Preserves exact amount; returns original if no simplification applies.
 */

function normalizeUnit(unit: string): string {
  return String(unit || '').trim().toLowerCase();
}

export function simplifyForDisplay(
  quantity: number,
  unit: string,
  unitPreference: string | null | undefined = 'metric'
): { quantity: number; unit: string } {
  const u = normalizeUnit(unit);
  const pref = String(unitPreference || 'metric').toLowerCase();

  if (pref === 'imperial') {
    // Weight: 16 oz = 1 lb (allow decimal for 27 oz → 1.7 lb)
    if ((u === 'oz' || u === 'ounce' || u === 'ounces') && quantity >= 16) {
      const lb = quantity / 16;
      const rounded = Math.round(lb * 10) / 10;
      return { quantity: rounded, unit: rounded === 1 ? 'lb' : 'lbs' };
    }
    // Volume: 32 fl oz = 1 qt (prefer over cups for larger amounts)
    if ((u === 'fl oz' || u === 'fluid ounce' || u === 'fluid ounces') && quantity >= 32 && quantity % 32 === 0) {
      return { quantity: quantity / 32, unit: quantity / 32 === 1 ? 'qt' : 'qts' };
    }
    // Volume: 8 fl oz = 1 cup
    if ((u === 'fl oz' || u === 'fluid ounce' || u === 'fluid ounces') && quantity >= 8 && quantity % 8 === 0) {
      return { quantity: quantity / 8, unit: quantity / 8 === 1 ? 'cup' : 'cups' };
    }
  }

  if (pref === 'metric') {
    // Weight: 1000 g = 1 kg (allow decimal for 2350 g → 2.4 kg)
    if ((u === 'g' || u === 'gram' || u === 'grams') && quantity >= 1000) {
      const kg = quantity / 1000;
      const rounded = Math.round(kg * 10) / 10;
      return { quantity: rounded, unit: 'kg' };
    }
    // Volume: 1000 ml = 1 L
    if (u === 'ml' && quantity >= 1000 && quantity % 1000 === 0) {
      return { quantity: quantity / 1000, unit: quantity / 1000 === 1 ? 'L' : 'L' };
    }
  }

  // Round to 2 decimal places for clean display (avoids 0.9999323718869936)
  const rounded =
    quantity >= 100
      ? Math.round(quantity)
      : quantity >= 1
        ? Math.round(quantity * 100) / 100
        : quantity >= 0.01
          ? Math.round(quantity * 100) / 100
          : quantity;
  return { quantity: rounded, unit };
}
