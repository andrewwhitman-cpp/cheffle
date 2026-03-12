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
    const tags = await db.all(
      `SELECT t.id, t.name FROM tags t
       INNER JOIN recipe_tags rt ON rt.tag_id = t.id
       WHERE rt.recipe_id = ? AND t.user_id = ?`,
      recipeId, user.id
    );
    return NextResponse.json(tags);
  } catch (error: any) {
    console.error('Get recipe tags error:', error);
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
    const { names } = body as { names: string[] };

    if (!Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ message: 'names array required' }, { status: 400 });
    }

    for (const rawName of names) {
      const name = rawName.trim().toLowerCase();
      if (!name) continue;

      let tag = await db.get('SELECT id FROM tags WHERE user_id = ? AND name = ?', user.id, name) as { id: number } | undefined;
      if (!tag) {
        const result = await db.run('INSERT INTO tags (user_id, name) VALUES (?, ?)', user.id, name);
        tag = { id: result.lastInsertRowid };
      }

      try {
        await db.run('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', recipeId, tag.id);
      } catch {
        // Already exists
      }
    }

    const tags = await db.all(
      `SELECT t.id, t.name FROM tags t
       INNER JOIN recipe_tags rt ON rt.tag_id = t.id
       WHERE rt.recipe_id = ? AND t.user_id = ?`,
      recipeId, user.id
    );
    return NextResponse.json(tags);
  } catch (error: any) {
    console.error('Add recipe tags error:', error);
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
    const tagId = searchParams.get('tag_id');
    if (!tagId) {
      return NextResponse.json({ message: 'tag_id query param required' }, { status: 400 });
    }

    const tag = await db.get('SELECT id FROM tags WHERE id = ? AND user_id = ?', parseInt(tagId, 10), user.id);
    if (!tag) return NextResponse.json({ message: 'Tag not found' }, { status: 404 });

    await db.run('DELETE FROM recipe_tags WHERE recipe_id = ? AND tag_id = ?', recipeId, parseInt(tagId, 10));
    return NextResponse.json({ message: 'Tag removed' });
  } catch (error: any) {
    console.error('Remove recipe tag error:', error);
    return NextResponse.json({ message: error.message || 'Failed' }, { status: 500 });
  }
}
