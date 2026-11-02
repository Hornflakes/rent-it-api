import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../models/user';

export type AccessTokenPayload = { id: string; username: string; role: Role };

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export const getUser = (request: Request): AccessTokenPayload => {
  if (!request.user) throw new Error('getUser called on a route without verifyAccessToken');
  return request.user;
};

const BEARER = 'Bearer ';

const verifyAccessToken = (request: Request, response: Response, next: NextFunction) => {
  const header = request.headers.authorization;
  const token = header?.startsWith(BEARER) ? header.slice(BEARER.length) : undefined;
  if (!token) {
    return response.status(401).json({ message: 'Missing access token' });
  }

  try {
    request.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as AccessTokenPayload;
  } catch {
    return response.status(401).json({ message: 'Invalid token' });
  }

  return next();
};

export default verifyAccessToken;
