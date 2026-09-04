import { Module } from '@nestjs/common';
import { SavedGamesController } from './saved-games.controller';
import { SavedGamesService } from './saved-games.service';

@Module({
  controllers: [SavedGamesController],
  providers: [SavedGamesService],
})
export class SavedGamesModule {}
