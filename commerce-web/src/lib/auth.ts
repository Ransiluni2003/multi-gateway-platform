import { SignJWT, jwtVerify } from 'jose';

export type UserRole = 'admin' | 'customer';
export type AuthUser = {
  email: string;
  role: UserRole;
  name?: string;
};

type CredentialUser = AuthUser & { password: string };

const AUTH_COOKIE = 'auth-token';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const encoder = new TextEncoder();
const secret = process.env.AUTH_SECRET || 'dev-secret-change-me';
const secretKey = encoder.encode(secret);

const users: CredentialUser[] = [
  {
    email: process.env.ADMIN_EMAIL || 'pransiluni@gmail.com',
    password: process.env.ADMIN_PASSWORD || 'pinithi123',
    role: 'admin',
    name: 'Admin User',
  },
  {
    email: process.env.CUSTOMER_EMAIL || 'customer@example.com',
    password: process.env.CUSTOMER_PASSWORD || 'customer123',
    role: 'customer',
    name: 'Customer User',
  },
];

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const match = users.find((user) => user.email === email && user.password === password);
  if (!match) return null;
  return { email: match.email, role: match.role, name: match.name };
}

export async function signAuthToken(user: AuthUser): Promise<string> {
  const jwt = await new SignJWT({ email: user.email, role: user.role, name: user.name })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secretKey);

  return jwt;
}

export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    const role = payload.role;

    if (typeof payload.email !== 'string') return null;
    if (role !== 'admin' && role !== 'customer') return null;

    return {
      email: payload.email,
      role,
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };
  } catch (error) {
    console.warn('Invalid auth token', error);
    return null;
  }
}

export function buildAuthCookie(token: string) {
  return {
    name: AUTH_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: TOKEN_TTL_SECONDS,
    },
  };
}

export function clearAuthCookie() {
  return {
    name: AUTH_COOKIE,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
    },
  };
}

export function getTokenFromCookies(cookies: { get: (name: string) => { value: string } | undefined }) {
  return cookies.get(AUTH_COOKIE)?.value;
}
