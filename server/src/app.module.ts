import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { SavedGamesModule } from './saved-games/saved-games.module';

@Module({
  imports: [AuthModule, SavedGamesModule],
})
export class AppModule {}
