export { generateRoomCode } from '@mafia/game-engine';

export function generateId(): string {
  return crypto.randomUUID();
}

export function assertDefined<T>(value: T | undefined | null, label: string): T {
  if (value == null) throw new Error(`${label} is not defined`);
  return value;
}
