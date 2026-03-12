import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const collectionId = parseInt(params.id, 10);
    const existing = await db.get(
      'SELECT id FROM collections WHERE id = ? AND user_id = ?',
      collectionId, user.id
    );
    if (!existing) return NextResponse.json({ message: 'Collection not found' }, { status: 404 });

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    await db.run('UPDATE collections SET name = ? WHERE id = ?', name.trim(), collectionId);
    const collection = await db.get('SELECT * FROM collections WHERE id = ?', collectionId);
    return NextResponse.json(collection);
  } catch (error: any) {
    console.error('Update collection error:', error);
    return NextResponse.json({ message: error.message || 'Failed to update collection' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const collectionId = parseInt(params.id, 10);
    const existing = await db.get(
      'SELECT id FROM collections WHERE id = ? AND user_id = ?',
      collectionId, user.id
    );
    if (!existing) return NextResponse.json({ message: 'Collection not found' }, { status: 404 });

    await db.run('DELETE FROM recipe_collections WHERE collection_id = ?', collectionId);
    await db.run('DELETE FROM collections WHERE id = ?', collectionId);

    return NextResponse.json({ message: 'Collection deleted' });
  } catch (error: any) {
    console.error('Delete collection error:', error);
    return NextResponse.json({ message: error.message || 'Failed to delete collection' }, { status: 500 });
  }
}
