import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { SaveGameDto } from './dto/save-game.dto';

export type SavedGame = SaveGameDto & {
  id: string;
  userId: string;
  email: string | null;
  savedAt: string;
};

@Injectable()
export class SavedGamesService {
  private readonly logger = new Logger(SavedGamesService.name);

  // In-memory store — good enough for this thin slice. This will move to
  // DynamoDB once the backend is actually deployed behind the Lambda.
  private readonly games: SavedGame[] = [];

  save(dto: SaveGameDto, user: AuthenticatedUser): SavedGame {
    const savedGame: SavedGame = {
      ...dto,
      id: randomUUID(),
      userId: user.id,
      email: user.email,
      savedAt: new Date().toISOString(),
    };

    this.games.push(savedGame);
    // Log the Cognito sub rather than the email — it keeps PII out of
    // CloudWatch and is present even when the token carries no email claim.
    this.logger.log(`Saved game ${savedGame.id} for ${savedGame.userId}`);

    return savedGame;
  }

  findAll(): SavedGame[] {
    return this.games;
  }
}
