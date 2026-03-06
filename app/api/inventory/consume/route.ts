import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { parseQuantityToNumber, isFuzzyIngredient, parsePerUnitWeightOzFromName } from '@/lib/ingredient-parser';
import { findBestInventoryMatch } from '@/lib/ingredient-matching';
import {
  convertToBaseUnit,
  convertFromBaseUnit,
  areUnitsCompatible,
  getUnitCategory,
  type UnitCategory,
} from '@/lib/unit-conversion';
import { getUnitMergeKey } from '@/lib/units';
import {
  convertVolumeToWeight,
  isVolumeOnlyIngredient,
} from '@/lib/ingredient-density';

interface ConsumeIngredient {
  name: string;
  quantity: string | number;
  unit: string;
  inventoryId?: number;
  action: 'use' | 'skip';
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { recipeId, servingsUsed, ingredients } = body as {
      recipeId: number;
      servingsUsed?: number;
      ingredients: ConsumeIngredient[];
    };

    if (!Array.isArray(ingredients)) {
      return NextResponse.json(
        { message: 'ingredients array is required' },
        { status: 400 }
      );
    }

    const toUse = ingredients.filter((i) => i.action === 'use');
    const inventoryRows = (await db.all(
      'SELECT id, user_id, name, quantity, unit FROM inventory WHERE user_id = ?',
      user.id
    )) as { id: number; user_id: number; name: string; quantity: number; unit: string }[];

    const inventoryItems = inventoryRows.map((r) => ({
      id: r.id,
      name: r.name,
      quantity: r.quantity,
      unit: r.unit,
    }));

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const ing of toUse) {
      if (isFuzzyIngredient({ name: ing.name, quantity: String(ing.quantity ?? ''), unit: ing.unit })) {
        continue;
      }

      const qty =
        typeof ing.quantity === 'number'
          ? ing.quantity
          : parseQuantityToNumber(String(ing.quantity ?? ''));
      if (qty == null || qty <= 0) continue;

      let invId = ing.inventoryId;
      let invRow = invId
        ? inventoryRows.find((r) => r.id === invId)
        : null;

      if (!invRow) {
        const match = findBestInventoryMatch(
          { name: ing.name, quantity: String(ing.quantity), unit: ing.unit },
          inventoryItems
        );
        if (match) {
          invId = match.inventoryItem.id;
          invRow = inventoryRows.find((r) => r.id === invId) ?? null;
        }
      }

      if (!invRow) {
        errors.push(`No inventory match for "${ing.name}"`);
        continue;
      }

      const invQty = invRow.quantity;
      const invUnit = invRow.unit;
      const usedUnit = String(ing.unit || '').trim();
      const invCategory = getUnitCategory(invUnit);
      const usedCategory = getUnitCategory(usedUnit);

      let newValueInInvUnit: number;

      if (areUnitsCompatible(invUnit, usedUnit)) {
        const invConverted = convertToBaseUnit(invQty, invUnit);
        const usedConverted = convertToBaseUnit(qty, usedUnit);

        if (invConverted && usedConverted) {
          const remainingBase = invConverted.value - usedConverted.value;
          const overspent = remainingBase < 0;
          const newQty = Math.max(0, remainingBase);
          if (overspent) {
            warnings.push(`Used more ${invRow.name} than in inventory; set to 0`);
          }
          const category: UnitCategory = invConverted.category;
          const converted = convertFromBaseUnit(newQty, invUnit, category);
          if (converted == null) {
            errors.push(`Could not convert remaining for "${ing.name}"`);
            continue;
          }
          newValueInInvUnit = converted;
        } else if (invCategory === 'count' && usedCategory === 'count' && getUnitMergeKey(invUnit) === getUnitMergeKey(usedUnit)) {
          const remaining = invQty - qty;
          const overspent = remaining < 0;
          newValueInInvUnit = Math.max(0, remaining);
          if (overspent) {
            warnings.push(`Used more ${invRow.name} than in inventory; set to 0`);
          }
        } else {
          errors.push(`Could not convert units for "${ing.name}"`);
          continue;
        }
      } else if (
        (invCategory === 'unknown' && usedCategory === 'unknown') ||
        (invCategory === 'count' && usedCategory === 'unknown') ||
        (invCategory === 'unknown' && usedCategory === 'count')
      ) {
        // Treat as count: both empty/unknown units (e.g. "4 salmon filets" vs "4 salmon filets")
        const remaining = invQty - qty;
        const overspent = remaining < 0;
        newValueInInvUnit = Math.max(0, remaining);
        if (overspent) {
          warnings.push(`Used more ${invRow.name} than in inventory; set to 0`);
        }
      } else if (
        usedCategory === 'unknown' &&
        invCategory === 'weight' &&
        parsePerUnitWeightOzFromName(ing.name) != null
      ) {
        // Recipe has count + per-unit weight in name, e.g. "4 (4-6 ounce) salmon filets"
        const perUnitOz = parsePerUnitWeightOzFromName(ing.name)!;
        const usedOz = qty * perUnitOz;
        const usedConverted = convertToBaseUnit(usedOz, 'oz');
        if (!usedConverted || usedConverted.category !== 'weight') {
          errors.push(`Could not convert recipe weight for "${ing.name}"`);
          continue;
        }
        const usedG = usedConverted.value;
        const invConverted = convertToBaseUnit(invQty, invUnit);
        if (!invConverted || invConverted.category !== 'weight') {
          errors.push(`Could not convert inventory weight for "${ing.name}"`);
          continue;
        }
        const remainingG = invConverted.value - usedG;
        const overspent = remainingG < 0;
        const newQty = Math.max(0, remainingG);
        if (overspent) {
          warnings.push(`Used more ${invRow.name} than in inventory; set to 0`);
        }
        const converted = convertFromBaseUnit(newQty, invUnit, 'weight');
        if (converted == null) {
          errors.push(`Could not convert remaining for "${ing.name}"`);
          continue;
        }
        newValueInInvUnit = converted;
      } else if (
        usedCategory === 'volume' &&
        invCategory === 'weight' &&
        !isVolumeOnlyIngredient(ing.name)
      ) {
        const usedVol = convertToBaseUnit(qty, usedUnit);
        if (!usedVol || usedVol.category !== 'volume') {
          errors.push(`Could not convert recipe volume for "${ing.name}"`);
          continue;
        }
        const usedG = convertVolumeToWeight(usedVol.value, ing.name);
        const invConverted = convertToBaseUnit(invQty, invUnit);
        if (!invConverted || invConverted.category !== 'weight') {
          errors.push(`Could not convert inventory weight for "${ing.name}"`);
          continue;
        }
        const remainingG = invConverted.value - usedG;
        const overspent = remainingG < 0;
        const newQty = Math.max(0, remainingG);
        if (overspent) {
          warnings.push(`Used more ${invRow.name} than in inventory; set to 0`);
        }
        const converted = convertFromBaseUnit(newQty, invUnit, 'weight');
        if (converted == null) {
          errors.push(`Could not convert remaining for "${ing.name}"`);
          continue;
        }
        newValueInInvUnit = converted;
      } else {
        errors.push(`Units not compatible for "${ing.name}" (${invUnit} vs ${usedUnit})`);
        continue;
      }

      const isDepleted = newValueInInvUnit <= 0 || newValueInInvUnit < 0.02;
      if (isDepleted) {
        await db.run('DELETE FROM inventory WHERE id = ? AND user_id = ?', invRow.id, user.id);
        inventoryRows.splice(inventoryRows.findIndex((r) => r.id === invRow!.id), 1);
        inventoryItems.splice(inventoryItems.findIndex((i) => i.id === invRow!.id), 1);
      } else {
        await db.run(
          'UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
          newValueInInvUnit,
          invRow.id,
          user.id
        );
        const idx = inventoryRows.findIndex((r) => r.id === invRow!.id);
        if (idx >= 0) {
          inventoryRows[idx] = {
            ...inventoryRows[idx],
            quantity: newValueInInvUnit,
          };
        }
        const invItemIdx = inventoryItems.findIndex((i) => i.id === invRow!.id);
        if (invItemIdx >= 0) {
          inventoryItems[invItemIdx].quantity = newValueInInvUnit;
        }
      }
    }

    const updated = (await db.all(
      'SELECT id, user_id, name, quantity, unit, created_at, updated_at FROM inventory WHERE user_id = ? ORDER BY name ASC',
      user.id
    )) as { id: number; user_id: number; name: string; quantity: number; unit: string; created_at: string; updated_at: string }[];

    return NextResponse.json({
      inventory: updated,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error: unknown) {
    console.error('Consume inventory error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update inventory' },
      { status: 500 }
    );
  }
}
