import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type JwtPayload = {
  sub: string;
  username: string;
  role: 'ADMIN' | 'USER';
};

export const hashPassword = async (password: string): Promise<string> => bcrypt.hash(password, 12);

export const comparePassword = async (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);

export const signJwt = (payload: JwtPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1d' });

export const verifyJwt = (token: string): JwtPayload => jwt.verify(token, env.JWT_SECRET) as JwtPayload;
