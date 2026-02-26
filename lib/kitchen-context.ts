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

  const parts: string[] = [];

  if (context.equipment_have?.length) {
    const labels = context.equipment_have.map((v) => getLabel(v, EQUIPMENT_OPTIONS));
    parts.push(`Has: ${labels.join(', ')}`);
  }
  if (context.appliances_have?.length) {
    const labels = context.appliances_have.map((v) => getLabel(v, APPLIANCE_OPTIONS));
    parts.push(`Appliances: ${labels.join(', ')}`);
  }
  if (context.appliances_prefer?.length) {
    const labels = context.appliances_prefer.map((v) => getLabel(v, APPLIANCE_OPTIONS));
    parts.push(`Prefers using: ${labels.join(', ')}`);
  }
  if (context.appliances_avoid?.length) {
    const labels = context.appliances_avoid.map((v) => getLabel(v, APPLIANCE_OPTIONS));
    parts.push(`Avoid using: ${labels.join(', ')}`);
  }
  if (context.constraints?.length) {
    const labels = context.constraints.map((v) => getLabel(v, CONSTRAINT_OPTIONS));
    parts.push(`Constraints: ${labels.join(', ')}`);
  }

  if (parts.length === 0) return '';

  return `User's kitchen: ${parts.join('; ')}. Adjust instructions to use only available equipment, suggest alternatives for missing items, and respect preferences and constraints.`;
}
