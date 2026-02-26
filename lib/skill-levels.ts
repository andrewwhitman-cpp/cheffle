/**
 * Skill levels for recipe adjustments. Labels describe cooking frequency/experience.
 */

export const SKILL_LEVELS = [
  { value: 'new_to_cooking', label: 'New Cook' },
  { value: 'comfortable_with_cooking', label: 'Comfortable Cook' },
  { value: 'experienced_cook', label: 'Experienced Cook' },
] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number]['value'];

const LEGACY_LABELS: Record<string, string> = {
  cook_occasionally: 'Comfortable Cook',
  cook_regularly: 'Comfortable Cook',
  very_experienced: 'Experienced Cook',
};

const LEGACY_TO_CURRENT: Record<string, SkillLevel> = {
  cook_occasionally: 'comfortable_with_cooking',
  cook_regularly: 'comfortable_with_cooking',
  very_experienced: 'experienced_cook',
};

export function getSkillLevelLabel(value: string | null | undefined): string {
  if (!value) return '';
  const found = SKILL_LEVELS.find((l) => l.value === value);
  if (found) return found.label;
  return LEGACY_LABELS[value] ?? value;
}

/** Map legacy or current skill level to current value for dropdown display. */
export function getSkillLevelValue(value: string | null | undefined): string {
  if (!value) return '';
  return LEGACY_TO_CURRENT[value] ?? (SKILL_LEVELS.some((l) => l.value === value) ? value : '');
}
