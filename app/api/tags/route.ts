import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tags = db.prepare('SELECT * FROM tags ORDER BY name').all() as Array<{
      id: number;
      name: string;
      color?: string;
    }>;

    return NextResponse.json(tags);
  } catch (error: any) {
    console.error('Get tags error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { message: 'Tag name is required' },
        { status: 400 }
      );
    }

    // Check if tag already exists
    const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(name);
    if (existing) {
      return NextResponse.json(
        { message: 'Tag already exists' },
        { status: 400 }
      );
    }

    const result = db
      .prepare('INSERT INTO tags (name, color) VALUES (?, ?)')
      .run(name, color || null);

    const tag = db
      .prepare('SELECT * FROM tags WHERE id = ?')
      .get(result.lastInsertRowid) as { id: number; name: string; color?: string };

    return NextResponse.json(tag);
  } catch (error: any) {
    console.error('Create tag error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create tag' },
      { status: 500 }
    );
  }
}
