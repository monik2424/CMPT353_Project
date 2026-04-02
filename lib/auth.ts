import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not set!');

export interface TokenPayload {
  id: number;
  display_name: string;
  role: 'user' | 'admin';
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '8h' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
}

// Helper used by every protected route handler
export function getCurrentUser(req: Request): TokenPayload | null {
  try {
    const cookie = req.headers.get('cookie') ?? '';
    const match  = cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (!match) return null;
    return verifyToken(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}
