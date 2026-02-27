import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken, hashPassword, comparePassword } from '@/lib/auth';

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
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json(
        { message: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { message: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const row = (await db.get(
      'SELECT password_hash FROM users WHERE id = ?',
      user.id
    )) as { password_hash: string } | undefined;

    if (!row || !comparePassword(current_password, row.password_hash)) {
      return NextResponse.json(
        { message: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    const passwordHash = hashPassword(new_password);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', passwordHash, user.id);

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to change password' },
      { status: 500 }
    );
  }
}
