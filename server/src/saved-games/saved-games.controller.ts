import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { SaveGameDto } from './dto/save-game.dto';
import { SavedGamesService } from './saved-games.service';

@Controller('games')
export class SavedGamesController {
  constructor(private readonly savedGamesService: SavedGamesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  save(@Body() dto: SaveGameDto, @CurrentUser() user: AuthenticatedUser) {
    const { id, savedAt } = this.savedGamesService.save(dto, user);

    return { id, savedAt };
  }
}
