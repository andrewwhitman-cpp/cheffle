/**
 * Map user unit preference to display units for inventory and shopping list.
 */

export type UnitPreference = 'imperial' | 'metric';

export function getPreferredWeightUnit(preference: UnitPreference | string | null | undefined): string {
  const p = String(preference || 'metric').toLowerCase();
  return p === 'imperial' ? 'oz' : 'g';
}

export function getPreferredVolumeUnit(preference: UnitPreference | string | null | undefined): string {
  const p = String(preference || 'metric').toLowerCase();
  return p === 'imperial' ? 'fl oz' : 'ml';
}
