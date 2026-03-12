/**
 * Kitchen context for recipe tailoring. Predefined options and AI formatting.
 */

export const EQUIPMENT_OPTIONS = [
  { value: 'blender', label: 'Blender' },
  { value: 'food_processor', label: 'Food processor' },
  { value: 'stand_mixer', label: 'Stand mixer' },
  { value: 'hand_mixer', label: 'Hand mixer' },
  { value: 'instant_pot', label: 'Instant Pot' },
  { value: 'slow_cooker', label: 'Slow cooker' },
  { value: 'air_fryer', label: 'Air fryer' },
  { value: 'toaster_oven', label: 'Toaster oven' },
  { value: 'rice_cooker', label: 'Rice cooker' },
  { value: 'pressure_cooker', label: 'Pressure cooker' },
  { value: 'immersion_blender', label: 'Immersion blender' },
  { value: 'food_scale', label: 'Food scale' },
  { value: 'thermometer', label: 'Thermometer' },
  { value: 'mandoline', label: 'Mandoline' },
  { value: 'cast_iron_skillet', label: 'Cast iron skillet' },
  { value: 'dutch_oven', label: 'Dutch oven' },
  { value: 'sheet_pan', label: 'Sheet pan' },
  { value: 'muffin_tin', label: 'Muffin tin' },
  { value: 'loaf_pan', label: 'Loaf pan' },
  { value: 'pie_dish', label: 'Pie dish' },
  { value: 'mortar_pestle', label: 'Mortar and pestle' },
  { value: 'microplane', label: 'Microplane' },
  { value: 'box_grater', label: 'Box grater' },
  { value: 'rolling_pin', label: 'Rolling pin' },
] as const;

export const APPLIANCE_OPTIONS = [
  { value: 'oven', label: 'Oven' },
  { value: 'stovetop', label: 'Stovetop' },
  { value: 'microwave', label: 'Microwave' },
  { value: 'grill', label: 'Grill' },
  { value: 'toaster_oven', label: 'Toaster oven' },
  { value: 'slow_cooker', label: 'Slow cooker' },
  { value: 'instant_pot', label: 'Instant Pot' },
] as const;

export const CONSTRAINT_OPTIONS = [
  { value: 'small_kitchen', label: 'Small kitchen' },
  { value: 'no_dishwasher', label: 'No dishwasher' },
  { value: 'limited_counter_space', label: 'Limited counter space' },
  { value: 'no_ventilation', label: 'No ventilation' },
  { value: 'electric_stovetop_only', label: 'Electric stovetop only' },
] as const;

export type EquipmentValue = (typeof EQUIPMENT_OPTIONS)[number]['value'];
export type ApplianceValue = (typeof APPLIANCE_OPTIONS)[number]['value'];
export type ConstraintValue = (typeof CONSTRAINT_OPTIONS)[number]['value'];

export interface KitchenContext {
  equipment_have?: string[];
  appliances_have?: string[];
  appliances_prefer?: string[];
  appliances_avoid?: string[];
  constraints?: string[];
}

const EQUIPMENT_VALUES = new Set(EQUIPMENT_OPTIONS.map((o) => o.value));
const APPLIANCE_VALUES = new Set(APPLIANCE_OPTIONS.map((o) => o.value));
const CONSTRAINT_VALUES = new Set(CONSTRAINT_OPTIONS.map((o) => o.value));

function getLabel(value: string, options: readonly { value: string; label: string }[]): string {
  const found = options.find((o) => o.value === value);
  return found?.label ?? value;
}

export function validateKitchenContext(ctx: unknown): KitchenContext {
  if (!ctx || typeof ctx !== 'object') return {};

  const obj = ctx as Record<string, unknown>;
  const result: KitchenContext = {};

  const filterArray = (arr: unknown, validSet: Set<string>): string[] =>
    Array.isArray(arr)
      ? arr.filter((v): v is string => typeof v === 'string' && validSet.has(v))
      : [];

  result.equipment_have = filterArray(obj.equipment_have, EQUIPMENT_VALUES);
  result.appliances_have = filterArray(obj.appliances_have, APPLIANCE_VALUES);
  result.appliances_prefer = filterArray(obj.appliances_prefer, APPLIANCE_VALUES);
  result.appliances_avoid = filterArray(obj.appliances_avoid, APPLIANCE_VALUES);
  result.constraints = filterArray(obj.constraints, CONSTRAINT_VALUES);

  return result;
}

export function isEmptyKitchenContext(ctx: KitchenContext): boolean {
  return (
    !ctx ||
    ((!ctx.equipment_have || ctx.equipment_have.length === 0) &&
      (!ctx.appliances_have || ctx.appliances_have.length === 0) &&
      (!ctx.appliances_prefer || ctx.appliances_prefer.length === 0) &&
      (!ctx.appliances_avoid || ctx.appliances_avoid.length === 0) &&
      (!ctx.constraints || ctx.constraints.length === 0))
  );
}

export function formatKitchenContextForAI(context: KitchenContext | null | undefined): string {
  if (!context) return '';

  const lines: string[] = [];

  if (context.equipment_have?.length) {
    const labels = context.equipment_have.map((v) => getLabel(v, EQUIPMENT_OPTIONS));
    lines.push(`- Available equipment: ${labels.join(', ')}. Use ONLY these when possible. If the recipe requires something the user doesn't have, suggest a specific alternative (e.g. "No blender? Mash with a fork or use a potato masher").`);
  }

  const applianceParts: string[] = [];
  if (context.appliances_have?.length) {
    const labels = context.appliances_have.map((v) => getLabel(v, APPLIANCE_OPTIONS));
    applianceParts.push(labels.join(', '));
  }
  const preferPart = context.appliances_prefer?.length
    ? `Prefer: ${context.appliances_prefer.map((v) => getLabel(v, APPLIANCE_OPTIONS)).join(', ')}.`
    : '';
  const avoidPart = context.appliances_avoid?.length
    ? `Avoid: ${context.appliances_avoid.map((v) => getLabel(v, APPLIANCE_OPTIONS)).join(', ')}.`
    : '';
  if (applianceParts.length || preferPart || avoidPart) {
    const base = applianceParts.length ? applianceParts.join(', ') : '';
    const extras = [preferPart, avoidPart].filter(Boolean).join(' ');
    lines.push(`- Appliances: ${[base, extras].filter(Boolean).join('. ')}`);
  }

  if (context.constraints?.length) {
    const labels = context.constraints.map((v) => getLabel(v, CONSTRAINT_OPTIONS));
    lines.push(`- Constraints: ${labels.join(', ')}. Adapt instructions accordingly (e.g. small kitchen = fewer pans, no ventilation = avoid high-heat searing).`);
  }

  if (lines.length === 0) return '';

  return `KITCHEN CONTEXT (must follow):\n${lines.join('\n')}\n\nWhen adjusting instructions: (1) Replace equipment the user lacks with alternatives from their list. (2) Add a brief note if a substitution is used. (3) Respect avoid/prefer and constraints.`;
}

export function formatDietaryForAI(prefs: string[] | null | undefined): string {
  if (!prefs?.length) return '';
  return `DIETARY REQUIREMENTS (must follow):\n- User follows: ${prefs.join(', ')}.\n- Do NOT include ingredients that violate these. Replace them with suitable alternatives.\n- If a core ingredient cannot be substituted (e.g. the entire dish is based on it), note this clearly.`;
}

export function formatUnitPreferenceForAI(pref: string | null | undefined): string {
  if (!pref) return '';
  if (pref === 'imperial') {
    return 'UNIT PREFERENCE: Use imperial units (cups, tablespoons, teaspoons, ounces, pounds, Fahrenheit). Prefer natural measures (e.g. "1 stick butter", "1 cup flour") over precise gram weights.';
  }
  if (pref === 'metric') {
    return 'UNIT PREFERENCE: Use metric units (grams, milliliters, liters, kilograms, Celsius).';
  }
  return '';
}
