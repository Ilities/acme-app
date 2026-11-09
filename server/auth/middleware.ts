import type { Request, RequestHandler } from 'express';
import { HttpError } from '../http/errors.js';
import { findUserById, toCurrentUser, type CurrentUser } from './users.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: CurrentUser;
  }
}

export const loadUser: RequestHandler = (req, _res, next) => {
  const userId = req.session?.userId;
  if (userId) {
    const user = findUserById(userId);
    if (user) {
      req.user = toCurrentUser(user);
    }
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    throw new HttpError(401, 'Please sign in to continue');
  }
  next();
};

export const requireClinicUser: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    throw new HttpError(401, 'Please sign in to continue');
  }
  if (req.user.clinicId === null) {
    throw new HttpError(403, 'This area is only available to clinic accounts');
  }
  next();
};

export const requireOwner: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== 'owner') {
    throw new HttpError(403, 'Only the clinic owner can do that');
  }
  next();
};

export const requireAcmeAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    throw new HttpError(401, 'Please sign in to continue');
  }
  if (req.user.role !== 'acme_admin') {
    throw new HttpError(403, 'You do not have access to the admin area');
  }
  next();
};

export function clinicIdOf(req: Request): number {
  const clinicId = req.user?.clinicId;
  if (!clinicId) {
    throw new HttpError(403, 'This area is only available to clinic accounts');
  }
  return clinicId;
}
