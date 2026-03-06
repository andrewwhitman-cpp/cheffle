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
  getUnitCategory,
  type UnitCategory,
} from './unit-conversion';
import { getUnitMergeKey } from './units';
import { toShoppingUnit } from './shopping-units';
import {
  convertVolumeToWeight,
  isVolumeOnlyIngredient,
} from './ingredient-density';
import { toUncookedForShopping, getCanonicalGroceryName } from './cooked-uncooked';
import { simplifyForDisplay } from './unit-simplify';

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

export interface ExistingShoppingItem {
  name: string;
  quantity: number;
  unit: string;
}

/**
 * Compute shopping list: aggregate recipe ingredients, subtract inventory and existing unpurchased items.
 * @param scale - Multiplier for all quantities (e.g. 2 for double). Default 1.
 * @param existingShoppingList - Optional unpurchased items from current list to subtract from computed needs.
 */
export interface ComputeShoppingListOptions {
  scale?: number;
  existingShoppingList?: ExistingShoppingItem[];
  unitPreference?: 'imperial' | 'metric' | string | null;
}

export function computeShoppingList(
  mealPlanEntries: MealPlanEntry[],
  inventory: InventoryItem[],
  recipes: Recipe[],
  scaleOrOptions: number | ComputeShoppingListOptions = 1,
  existingShoppingList?: ExistingShoppingItem[]
): ShoppingListItem[] {
  const opts = typeof scaleOrOptions === 'object'
    ? scaleOrOptions
    : { scale: scaleOrOptions, existingShoppingList };
  const scale = opts.scale ?? 1;
  const unitPreference = opts.unitPreference ?? 'metric';
  const existingList = opts.existingShoppingList ?? existingShoppingList ?? [];
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
      const useGroceryKey = converted && (converted.category === 'volume' || converted.category === 'weight');
      const canonicalName = useGroceryKey ? getCanonicalGroceryName(displayName) : displayName;
      const key = useGroceryKey ? `${canonicalName.toLowerCase().trim()}::grocery` : normalizeIngredientKey(displayName, unit);

      if (converted) {
        let qtyToAdd = converted.value;
        if (converted.category === 'volume') {
          const uncooked = toUncookedForShopping(converted.value, 'volume', displayName);
          if (uncooked) qtyToAdd = uncooked.quantityBase;
        }
        const existing = aggregated.get(key);
        if (existing) {
          existing.quantityBase += qtyToAdd;
        } else {
          aggregated.set(key, {
            name: canonicalName,
            quantityBase: qtyToAdd,
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
    const invMatch = findBestInventoryMatch(
      { name: agg.name, quantity: String(agg.quantityBase), unit: agg.unit },
      inventory
    );

    let remainingBase: number;

    let displayCategory = agg.category;

    if (!invMatch) {
      remainingBase = agg.quantityBase;
    } else {
      const inv = invMatch.inventoryItem;
      const invCat = getUnitCategory(inv.unit);
      const aggCat = agg.category;

      if (areUnitsCompatible(inv.unit, agg.unit)) {
        const invConverted = convertToBaseUnit(inv.quantity, inv.unit);
        if (invConverted) {
          remainingBase = agg.quantityBase - invConverted.value;
        } else if (getUnitMergeKey(inv.unit) === getUnitMergeKey(agg.unit)) {
          remainingBase = agg.quantityBase - inv.quantity;
        } else {
          remainingBase = agg.quantityBase;
        }
      } else if (
        aggCat === 'volume' &&
        invCat === 'weight' &&
        !isVolumeOnlyIngredient(agg.name)
      ) {
        const needG = convertVolumeToWeight(agg.quantityBase, agg.name);
        const invConverted = convertToBaseUnit(inv.quantity, inv.unit);
        if (invConverted && invConverted.category === 'weight') {
          remainingBase = Math.max(0, needG - invConverted.value);
          displayCategory = 'weight';
        } else {
          remainingBase = agg.quantityBase;
        }
      } else {
        remainingBase = agg.quantityBase;
      }
    }

    // Subtract existing unpurchased shopping list items
    for (const existingItem of existingList) {
      const existingMatch = findBestInventoryMatch(
        { name: agg.name, quantity: String(remainingBase), unit: agg.unit },
        [{ id: 0, name: existingItem.name, quantity: existingItem.quantity, unit: existingItem.unit }]
      );
      if (!existingMatch) continue;
      const existing = existingMatch.inventoryItem;
      const existingCat = getUnitCategory(existing.unit);

      if (areUnitsCompatible(existing.unit, agg.unit) || (displayCategory === 'weight' && existingCat === 'weight')) {
        const existingConverted = convertToBaseUnit(existing.quantity, existing.unit);
        if (existingConverted) {
          remainingBase -= existingConverted.value;
        } else if (getUnitMergeKey(existing.unit) === getUnitMergeKey(agg.unit)) {
          remainingBase -= existing.quantity;
        }
      }
    }

    if (remainingBase <= 0) continue;

    let shopName = agg.name;
    let shopBase = remainingBase;
    const uncooked = toUncookedForShopping(remainingBase, displayCategory, agg.name);
    if (uncooked) {
      shopName = uncooked.name;
      shopBase = uncooked.quantityBase;
    }

    const shopping = toShoppingUnit(shopName, shopBase, displayCategory, agg.unit, unitPreference);
    let displayQty = shopping
      ? shopping.quantity
      : displayCategory !== 'unknown'
        ? (convertFromBaseUnit(shopBase, agg.unit, displayCategory) ?? shopBase)
        : shopBase;
    let displayUnit = shopping ? shopping.unit : agg.unit;
    const simplified = simplifyForDisplay(displayQty, displayUnit, unitPreference);
    toBuy.push({
      name: shopName,
      quantity: simplified.quantity,
      unit: simplified.unit,
      from_recipe_id: agg.from_recipe_id,
    });
  }

  return toBuy.sort((a, b) => a.name.localeCompare(b.name));
}
