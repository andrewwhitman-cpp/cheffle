import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const recipeId = parseInt(params.id, 10);
    const collections = await db.all(
      `SELECT c.id, c.name FROM collections c
       INNER JOIN recipe_collections rc ON rc.collection_id = c.id
       WHERE rc.recipe_id = ? AND c.user_id = ?`,
      recipeId, user.id
    );
    return NextResponse.json(collections);
  } catch (error: any) {
    console.error('Get recipe collections error:', error);
    return NextResponse.json({ message: error.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const recipeId = parseInt(params.id, 10);
    const recipe = await db.get('SELECT id FROM recipes WHERE id = ? AND user_id = ?', recipeId, user.id);
    if (!recipe) return NextResponse.json({ message: 'Recipe not found' }, { status: 404 });

    const body = await request.json();
    const { collection_ids } = body as { collection_ids: number[] };

    if (!Array.isArray(collection_ids)) {
      return NextResponse.json({ message: 'collection_ids array required' }, { status: 400 });
    }

    for (const colId of collection_ids) {
      const col = await db.get('SELECT id FROM collections WHERE id = ? AND user_id = ?', colId, user.id);
      if (col) {
        try {
          await db.run(
            'INSERT INTO recipe_collections (recipe_id, collection_id) VALUES (?, ?)',
            recipeId, colId
          );
        } catch {
          // Already exists — ignore
        }
      }
    }

    const collections = await db.all(
      `SELECT c.id, c.name FROM collections c
       INNER JOIN recipe_collections rc ON rc.collection_id = c.id
       WHERE rc.recipe_id = ? AND c.user_id = ?`,
      recipeId, user.id
    );
    return NextResponse.json(collections);
  } catch (error: any) {
    console.error('Add recipe to collections error:', error);
    return NextResponse.json({ message: error.message || 'Failed' }, { status: 500 });
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

    const recipeId = parseInt(params.id, 10);
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get('collection_id');
    if (!collectionId) {
      return NextResponse.json({ message: 'collection_id query param required' }, { status: 400 });
    }

    const col = await db.get('SELECT id FROM collections WHERE id = ? AND user_id = ?', parseInt(collectionId, 10), user.id);
    if (!col) return NextResponse.json({ message: 'Collection not found' }, { status: 404 });

    await db.run(
      'DELETE FROM recipe_collections WHERE recipe_id = ? AND collection_id = ?',
      recipeId, parseInt(collectionId, 10)
    );

    return NextResponse.json({ message: 'Removed from collection' });
  } catch (error: any) {
    console.error('Remove recipe from collection error:', error);
    return NextResponse.json({ message: error.message || 'Failed' }, { status: 500 });
  }
}
