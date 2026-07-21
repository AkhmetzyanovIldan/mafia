import type { IPlayer } from '@mafia/shared';

/** In-memory player store. Replace with DB adapter for production. */
export class PlayerRepository {
  private players = new Map<string, IPlayer>();

  findById(id: string): IPlayer | undefined {
    return this.players.get(id);
  }

  findAll(): IPlayer[] {
    return [...this.players.values()];
  }

  save(player: IPlayer): void {
    this.players.set(player.id, player);
  }

  delete(id: string): void {
    this.players.delete(id);
  }
}
