import { randomUUID } from 'crypto';

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function generateUniqueFilename(prefix: string, extension: string): string {
  const timestamp = Date.now();
  const uuid = randomUUID().slice(0, 8);
  return sanitizeFilename(`${prefix}_${timestamp}_${uuid}.${extension}`);
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${randomUUID().slice(0, 8)}`;
}