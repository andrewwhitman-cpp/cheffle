import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { message: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      username,
      email
    );

    if (existingUser) {
      return NextResponse.json(
        { message: 'Username or email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Insert user
    const result = await db.run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      username,
      email,
      passwordHash
    );

    const userId = result.lastInsertRowid;

    // Generate token
    const token = generateToken({ userId, username });

    return NextResponse.json({
      message: 'User created successfully',
      token,
      user: {
        id: userId,
        username,
        email,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
