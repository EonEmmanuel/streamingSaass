import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { comparePassword, signJwt } from '../utils/auth.js';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6)
});

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid request body' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });
    return;
  }

  const valid = await comparePassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });
    return;
  }

  const token = signJwt({ sub: user.id, username: user.username, role: user.role });
  res.status(StatusCodes.OK).json({ token, user: { id: user.id, username: user.username, role: user.role } });
};
