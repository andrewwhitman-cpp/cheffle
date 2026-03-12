import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const collections = await db.all(
      `SELECT c.id, c.name, c.sort_order, c.created_at,
              COUNT(rc.recipe_id) as recipe_count
       FROM collections c
       LEFT JOIN recipe_collections rc ON rc.collection_id = c.id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.sort_order, c.name`,
      user.id
    );

    return NextResponse.json(collections);
  } catch (error: any) {
    console.error('Get collections error:', error);
    return NextResponse.json({ message: error.message || 'Failed to fetch collections' }, { status: 500 });
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

    const result = await db.run(
      'INSERT INTO collections (user_id, name) VALUES (?, ?)',
      user.id,
      name.trim()
    );

    const collection = await db.get('SELECT * FROM collections WHERE id = ?', result.lastInsertRowid);
    return NextResponse.json(collection);
  } catch (error: any) {
    console.error('Create collection error:', error);
    return NextResponse.json({ message: error.message || 'Failed to create collection' }, { status: 500 });
  }
}
