import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const tags = await db.all(
      `SELECT t.id, t.name, COUNT(rt.recipe_id) as recipe_count
       FROM tags t
       LEFT JOIN recipe_tags rt ON rt.tag_id = t.id
       WHERE t.user_id = ?
       GROUP BY t.id
       ORDER BY t.name`,
      user.id
    );

    return NextResponse.json(tags);
  } catch (error: any) {
    console.error('Get tags error:', error);
    return NextResponse.json({ message: error.message || 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    const trimmed = name.trim().toLowerCase();

    const existing = await db.get(
      'SELECT * FROM tags WHERE user_id = ? AND name = ?',
      user.id, trimmed
    );
    if (existing) return NextResponse.json(existing);

    const result = await db.run(
      'INSERT INTO tags (user_id, name) VALUES (?, ?)',
      user.id, trimmed
    );

    const tag = await db.get('SELECT * FROM tags WHERE id = ?', result.lastInsertRowid);
    return NextResponse.json(tag);
  } catch (error: any) {
    console.error('Create tag error:', error);
    return NextResponse.json({ message: error.message || 'Failed to create tag' }, { status: 500 });
  }
}
