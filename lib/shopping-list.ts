/**
 * Compute shopping list from meal plan entries.
 * Aggregates recipe ingredients, subtracts inventory, returns items to buy.
 */

import { parseQuantityToNumber, isFuzzyIngredient, toShoppingListName } from './ingredient-parser';
import { findBestInventoryMatch } from './ingredient-matching';
import {
  convertToBaseUnit,
  convertFromBaseUnit,
  areUnitsCompatible,
  type UnitCategory,
} from './unit-conversion';
import { getUnitMergeKey } from './units';

export interface MealPlanEntry {
  id: number;
  plan_date: string;
  meal_type: string;
  recipe_id: number | null;
}

export interface Recipe {
  id: number;
  name: string;
  ingredients?: Array<{ name: string; quantity: string; unit: string }>;
  servings?: number | null;
}

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
}

export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  from_recipe_id?: number;
}

function normalizeIngredientKey(name: string, unit: string): string {
  const n = String(name || '').toLowerCase().trim();
  const u = getUnitMergeKey(String(unit || '').trim());
  return `${n}::${u}`;
}

function parseQty(q: string): number {
  const n = parseQuantityToNumber(String(q || ''));
  return n ?? 0;
}

/**
 * Compute shopping list: aggregate recipe ingredients, subtract inventory.
 * @param scale - Multiplier for all quantities (e.g. 2 for double). Default 1.
 */
export function computeShoppingList(
  mealPlanEntries: MealPlanEntry[],
  inventory: InventoryItem[],
  recipes: Recipe[],
  scale = 1
): ShoppingListItem[] {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  // Aggregate ingredients from all recipes in the meal plan
  const aggregated = new Map<
    string,
    { name: string; quantityBase: number; unit: string; category: UnitCategory; from_recipe_id?: number }
  >();

  for (const entry of mealPlanEntries) {
    if (entry.recipe_id == null) continue;
    const recipe = recipeMap.get(entry.recipe_id);
    const ingredients = recipe?.ingredients;
    if (!recipe || !Array.isArray(ingredients)) continue;

    for (const ing of ingredients) {
      if (isFuzzyIngredient(ing)) continue;

      const qty = parseQty(ing.quantity);
      if (qty <= 0) continue;

      const scaledQty = qty * scale;
      const unit = String(ing.unit || '').trim();
      const rawName = String(ing.name || '').trim();
      if (!rawName) continue;

      const displayName = toShoppingListName(rawName);
      if (!displayName) continue;

      const converted = convertToBaseUnit(scaledQty, unit);
      const key = normalizeIngredientKey(displayName, unit);

      if (converted) {
        const existing = aggregated.get(key);
        if (existing) {
          existing.quantityBase += converted.value;
        } else {
          aggregated.set(key, {
            name: displayName,
            quantityBase: converted.value,
            unit,
            category: converted.category,
            from_recipe_id: recipe.id,
          });
        }
      } else {
        // Non-convertible unit (count, unknown): keep as-is, sum numerically
        const existing = aggregated.get(key);
        if (existing) {
          existing.quantityBase += scaledQty;
        } else {
          aggregated.set(key, {
            name: displayName,
            quantityBase: scaledQty,
            unit,
            category: 'unknown',
            from_recipe_id: recipe.id,
          });
        }
      }
    }
  }

  // Subtract inventory for each aggregated item
  const toBuy: ShoppingListItem[] = [];

  for (const [, agg] of aggregated) {
    const match = findBestInventoryMatch(
      { name: agg.name, quantity: String(agg.quantityBase), unit: agg.unit },
      inventory
    );

    if (!match) {
      const displayQty = agg.category !== 'unknown'
        ? (convertFromBaseUnit(agg.quantityBase, agg.unit, agg.category) ?? agg.quantityBase)
        : agg.quantityBase;
      toBuy.push({
        name: agg.name,
        quantity: displayQty,
        unit: agg.unit,
        from_recipe_id: agg.from_recipe_id,
      });
      continue;
    }

    const inv = match.inventoryItem;
    if (!areUnitsCompatible(inv.unit, agg.unit)) {
      const displayQty = agg.category !== 'unknown'
        ? (convertFromBaseUnit(agg.quantityBase, agg.unit, agg.category) ?? agg.quantityBase)
        : agg.quantityBase;
      toBuy.push({
        name: agg.name,
        quantity: displayQty,
        unit: agg.unit,
        from_recipe_id: agg.from_recipe_id,
      });
      continue;
    }

    const invConverted = convertToBaseUnit(inv.quantity, inv.unit);
    let remainingBase: number;

    if (invConverted) {
      remainingBase = agg.quantityBase - invConverted.value;
    } else {
      // Same unit but not convertible (e.g. count) - subtract numerically
      if (getUnitMergeKey(inv.unit) === getUnitMergeKey(agg.unit)) {
        remainingBase = agg.quantityBase - inv.quantity;
      } else {
        remainingBase = agg.quantityBase;
      }
    }
    if (remainingBase <= 0) continue;

    const displayQty =
      agg.category !== 'unknown'
        ? (convertFromBaseUnit(remainingBase, agg.unit, agg.category) ?? remainingBase)
        : remainingBase;
    toBuy.push({
      name: agg.name,
      quantity: displayQty,
      unit: agg.unit,
      from_recipe_id: agg.from_recipe_id,
    });
  }

  return toBuy.sort((a, b) => a.name.localeCompare(b.name));
}
