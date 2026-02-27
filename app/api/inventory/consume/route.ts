import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { parseQuantityToNumber } from '@/lib/ingredient-parser';
import { findBestInventoryMatch } from '@/lib/ingredient-matching';
import {
  convertToBaseUnit,
  convertFromBaseUnit,
  areUnitsCompatible,
  type UnitCategory,
} from '@/lib/unit-conversion';

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

      if (!areUnitsCompatible(invUnit, usedUnit)) {
        errors.push(`Units not compatible for "${ing.name}" (${invUnit} vs ${usedUnit})`);
        continue;
      }

      const invConverted = convertToBaseUnit(invQty, invUnit);
      const usedConverted = convertToBaseUnit(qty, usedUnit);
      if (!invConverted || !usedConverted) {
        errors.push(`Could not convert units for "${ing.name}"`);
        continue;
      }

      const remainingBase = invConverted.value - usedConverted.value;
      const overspent = remainingBase < 0;
      const newQty = Math.max(0, remainingBase);
      if (overspent) {
        warnings.push(`Used more ${invRow.name} than in inventory; set to 0`);
      }
      const category: UnitCategory = invConverted.category;
      const newValueInInvUnit = convertFromBaseUnit(newQty, invUnit, category);

      if (newValueInInvUnit == null) {
        errors.push(`Could not convert remaining for "${ing.name}"`);
        continue;
      }

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
