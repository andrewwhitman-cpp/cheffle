/**
 * Skill levels for recipe adjustments. Labels describe cooking frequency/experience.
 */

export const SKILL_LEVELS = [
  { value: 'new_to_cooking', label: 'New to Cooking' },
  { value: 'cook_occasionally', label: 'Cook Occasionally' },
  { value: 'cook_regularly', label: 'Cook Regularly' },
  { value: 'very_experienced', label: 'Very Experienced' },
] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number]['value'];

export function getSkillLevelLabel(value: string | null | undefined): string {
  if (!value) return '';
  const found = SKILL_LEVELS.find((l) => l.value === value);
  return found?.label ?? value;
}
