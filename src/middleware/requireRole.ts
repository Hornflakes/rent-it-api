import { NextFunction, Request, Response } from 'express';
import { Role } from '../models/user';

const requireRole =
  (...allowed: Role[]) =>
  (request: Request, response: Response, next: NextFunction) => {
    if (!request.user) {
      return response.status(401).json({ message: 'Missing access token' });
    }
    if (!allowed.includes(request.user.role)) {
      return response.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };

export default requireRole;
