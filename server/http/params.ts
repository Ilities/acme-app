import { HttpError } from './errors.js';

export function parseId(value: unknown): number {
  const id = typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'Invalid id');
  }
  return id;
}

export function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
