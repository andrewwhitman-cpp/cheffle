import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { message: error.message || 'Authentication check failed' },
      { status: 500 }
    );
  }
}
