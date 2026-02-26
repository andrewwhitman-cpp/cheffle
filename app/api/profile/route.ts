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

    const row = db
      .prepare(
        'SELECT id, username, email, display_name, dietary_preferences, created_at FROM users WHERE id = ?'
      )
      .get(user.id) as {
      id: number;
      username: string;
      email: string;
      display_name: string | null;
      dietary_preferences: string | null;
      created_at: string;
    };

    if (!row) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    let dietaryPrefs = null;
    if (row.dietary_preferences) {
      try {
        dietaryPrefs = JSON.parse(row.dietary_preferences);
      } catch {
        dietaryPrefs = null;
      }
    }

    return NextResponse.json({
      ...row,
      dietary_preferences: dietaryPrefs,
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { display_name, dietary_preferences } = body;

    const dietaryStr =
      dietary_preferences != null
        ? JSON.stringify(
            Array.isArray(dietary_preferences)
              ? dietary_preferences
              : typeof dietary_preferences === 'string'
              ? dietary_preferences.split(',').map((s: string) => s.trim()).filter(Boolean)
              : []
          )
        : null;

    db.prepare(
      'UPDATE users SET display_name = ?, dietary_preferences = ? WHERE id = ?'
    ).run(
      display_name != null ? String(display_name) : null,
      dietaryStr,
      user.id
    );

    const row = db
      .prepare(
        'SELECT id, username, email, display_name, dietary_preferences, created_at FROM users WHERE id = ?'
      )
      .get(user.id) as {
      id: number;
      username: string;
      email: string;
      display_name: string | null;
      dietary_preferences: string | null;
      created_at: string;
    };

    let dietaryPrefs = null;
    if (row.dietary_preferences) {
      try {
        dietaryPrefs = JSON.parse(row.dietary_preferences);
      } catch {
        dietaryPrefs = null;
      }
    }

    return NextResponse.json({
      ...row,
      dietary_preferences: dietaryPrefs,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
