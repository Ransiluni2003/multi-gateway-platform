import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCookies, verifyAuthToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookies(request.cookies);
    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await verifyAuthToken(token);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ user: null, error: 'Unable to verify session' }, { status: 500 });
  }
}
