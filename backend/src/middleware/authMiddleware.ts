import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { verifyJwt } from '../utils/auth.js';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Missing token' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = verifyJwt(token);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid token' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(StatusCodes.FORBIDDEN).json({ message: 'Admin access required' });
    return;
  }
  next();
};
