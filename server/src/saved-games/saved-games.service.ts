import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SaveGameDto } from './dto/save-game.dto';

export type SavedGame = SaveGameDto & {
  id: string;
  savedAt: string;
};

@Injectable()
export class SavedGamesService {
  private readonly logger = new Logger(SavedGamesService.name);

  // In-memory store — good enough for this thin slice. This will move to
  // DynamoDB once the backend is actually deployed behind the Lambda.
  private readonly games: SavedGame[] = [];

  save(dto: SaveGameDto): SavedGame {
    const savedGame: SavedGame = {
      ...dto,
      id: randomUUID(),
      savedAt: new Date().toISOString(),
    };

    this.games.push(savedGame);
    this.logger.log(`Saved game ${savedGame.id} for ${savedGame.email}`);

    return savedGame;
  }

  findAll(): SavedGame[] {
    return this.games;
  }
}
