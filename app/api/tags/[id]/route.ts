import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tagId = parseInt(params.id);
    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { message: 'Tag name is required' },
        { status: 400 }
      );
    }

    // Check if tag exists
    const existing = db.prepare('SELECT id FROM tags WHERE id = ?').get(tagId);
    if (!existing) {
      return NextResponse.json(
        { message: 'Tag not found' },
        { status: 404 }
      );
    }

    // Check if another tag with the same name exists
    const duplicate = db.prepare('SELECT id FROM tags WHERE name = ? AND id != ?').get(name, tagId);
    if (duplicate) {
      return NextResponse.json(
        { message: 'Tag name already exists' },
        { status: 400 }
      );
    }

    db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color || null, tagId);

    const tag = db
      .prepare('SELECT * FROM tags WHERE id = ?')
      .get(tagId) as { id: number; name: string; color?: string };

    return NextResponse.json(tag);
  } catch (error: any) {
    console.error('Update tag error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update tag' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tagId = parseInt(params.id);

    // Check if tag exists
    const existing = db.prepare('SELECT id FROM tags WHERE id = ?').get(tagId);
    if (!existing) {
      return NextResponse.json(
        { message: 'Tag not found' },
        { status: 404 }
      );
    }

    // Delete tag (recipe_tags will be deleted automatically due to CASCADE)
    db.prepare('DELETE FROM tags WHERE id = ?').run(tagId);

    return NextResponse.json({ message: 'Tag deleted successfully' });
  } catch (error: any) {
    console.error('Delete tag error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
