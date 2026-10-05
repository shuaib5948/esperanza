import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserPayload } from '../types/auth.types.js';

export function signAccessToken(payload: UserPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
}

export function signRefreshToken(payload: { id: number; uuid: string }): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
  });
}

export function verifyAccessToken(token: string): UserPayload {
  return jwt.verify(token, config.jwt.secret) as UserPayload;
}

export function verifyRefreshToken(token: string): { id: number; uuid: string } {
  return jwt.verify(token, config.jwt.refreshSecret) as { id: number; uuid: string };
}
