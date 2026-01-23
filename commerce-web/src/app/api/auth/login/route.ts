import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, buildAuthCookie, signAuthToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signAuthToken(user);
    const cookie = buildAuthCookie(token);

    const response = NextResponse.json({ user });
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Unable to log in' }, { status: 500 });
  }
}
