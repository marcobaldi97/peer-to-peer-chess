import { Module } from '@nestjs/common';
import { SavedGamesModule } from './saved-games/saved-games.module';

@Module({
  imports: [SavedGamesModule],
})
export class AppModule {}
