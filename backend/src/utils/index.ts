import { v4 as uuidv4 } from 'uuid';

export { uuidv4 as generateId };

export function generateRoomCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function assertDefined<T>(value: T | undefined | null, label: string): T {
  if (value == null) throw new Error(`${label} is not defined`);
  return value;
}
