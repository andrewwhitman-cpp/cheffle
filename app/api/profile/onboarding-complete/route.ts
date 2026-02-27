import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

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

    await db.run(
      'UPDATE users SET onboarding_complete = 1 WHERE id = ?',
      user.id
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update' },
      { status: 500 }
    );
  }
}
