import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { getUnitMergeKey } from '@/lib/units';
import { parseQuantityToNumberOrZero } from '@/lib/ingredient-parser';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await db.run(
      'DELETE FROM inventory WHERE user_id = ? AND quantity < 0.02',
      user.id
    );
    const items = (await db.all(
      'SELECT id, user_id, name, quantity, unit, created_at, updated_at FROM inventory WHERE user_id = ? ORDER BY name ASC',
      user.id
    )) as { id: number; user_id: number; name: string; quantity: number; unit: string; created_at: string; updated_at: string }[];

    return NextResponse.json(items);
  } catch (error: unknown) {
    console.error('Get inventory error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
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
    const items = Array.isArray(body.items) ? body.items : [body];
    const created: { id: number; user_id: number; name: string; quantity: number; unit: string; created_at: string; updated_at: string }[] = [];

    const existingItems = (await db.all(
      'SELECT id, name, quantity, unit FROM inventory WHERE user_id = ?',
      user.id
    )) as { id: number; name: string; quantity: number; unit: string }[];

    for (const item of items) {
      const name = String(item.name || '').trim();
      if (!name) continue;

      const quantity = parseQuantityToNumberOrZero(item.quantity ?? 0);
      const unit = String(item.unit ?? '').trim();
      const incomingMergeKey = getUnitMergeKey(unit);

      const existing = existingItems.find(
        (e) =>
          e.name.toLowerCase() === name.toLowerCase() &&
          getUnitMergeKey(e.unit) === incomingMergeKey
      );

      if (existing) {
        const newQuantity = existing.quantity + quantity;
        const isDepleted = newQuantity <= 0 || newQuantity < 0.02;
        if (isDepleted) {
          await db.run('DELETE FROM inventory WHERE id = ? AND user_id = ?', existing.id, user.id);
          const idx = existingItems.findIndex((e) => e.id === existing.id);
          if (idx >= 0) existingItems.splice(idx, 1);
        } else {
          await db.run(
            'UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            newQuantity,
            existing.id,
            user.id
          );
          const idx = existingItems.findIndex((e) => e.id === existing.id);
          if (idx >= 0) existingItems[idx].quantity = newQuantity;
        }
        if (!isDepleted) {
          const row = (await db.get('SELECT id, user_id, name, quantity, unit, created_at, updated_at FROM inventory WHERE id = ?', existing.id)) as {
            id: number;
            user_id: number;
            name: string;
            quantity: number;
            unit: string;
            created_at: string;
            updated_at: string;
          };
          created.push(row);
        }
      } else {
        const result = await db.run(
          `INSERT INTO inventory (user_id, name, quantity, unit) VALUES (?, ?, ?, ?)`,
          user.id,
          name,
          quantity,
          unit
        );

        const row = (await db.get('SELECT id, user_id, name, quantity, unit, created_at, updated_at FROM inventory WHERE id = ?', result.lastInsertRowid)) as {
          id: number;
          user_id: number;
          name: string;
          quantity: number;
          unit: string;
          created_at: string;
          updated_at: string;
        };
        created.push(row);
        existingItems.push({ id: row.id, name: row.name, quantity: row.quantity, unit: row.unit });
      }
    }

    return NextResponse.json(Array.isArray(body.items) ? created : created[0]);
  } catch (error: unknown) {
    console.error('Create inventory error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to add ingredient' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, name, quantity, unit } = body;

    if (id == null) {
      return NextResponse.json(
        { message: 'id is required' },
        { status: 400 }
      );
    }

    const existing = (await db.get('SELECT id FROM inventory WHERE id = ? AND user_id = ?', id, user.id)) as { id: number } | undefined;
    if (!existing) {
      return NextResponse.json(
        { message: 'Inventory item not found' },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(String(name).trim());
    }
    let newQuantity: number | undefined;
    if (quantity !== undefined) {
      newQuantity = parseQuantityToNumberOrZero(quantity);
      updates.push('quantity = ?');
      params.push(newQuantity);
    }
    if (unit !== undefined) {
      updates.push('unit = ?');
      params.push(String(unit).trim());
    }

    if (updates.length === 0) {
      const row = (await db.get('SELECT id, user_id, name, quantity, unit, created_at, updated_at FROM inventory WHERE id = ?', id)) as {
        id: number;
        user_id: number;
        name: string;
        quantity: number;
        unit: string;
        created_at: string;
        updated_at: string;
      };
      return NextResponse.json(row);
    }

    const isDepleted = newQuantity !== undefined && (newQuantity <= 0 || newQuantity < 0.02);
    if (isDepleted) {
      await db.run('DELETE FROM inventory WHERE id = ? AND user_id = ?', id, user.id);
      return NextResponse.json({ deleted: true });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await db.run(
      `UPDATE inventory SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      ...params,
      user.id
    );

    const row = (await db.get('SELECT id, user_id, name, quantity, unit, created_at, updated_at FROM inventory WHERE id = ?', id)) as {
      id: number;
      user_id: number;
      name: string;
      quantity: number;
      unit: string;
      created_at: string;
      updated_at: string;
    };
    return NextResponse.json(row);
  } catch (error: unknown) {
    console.error('Update inventory error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update ingredient' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { message: 'id is required' },
        { status: 400 }
      );
    }

    const result = await db.run('DELETE FROM inventory WHERE id = ? AND user_id = ?', parseInt(id, 10), user.id);
    if (result.changes === 0) {
      return NextResponse.json(
        { message: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete inventory error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to delete ingredient' },
      { status: 500 }
    );
  }
}
