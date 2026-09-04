import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SaveGameDto } from './dto/save-game.dto';
import { SavedGamesService } from './saved-games.service';

@Controller('games')
export class SavedGamesController {
  constructor(private readonly savedGamesService: SavedGamesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  save(@Body() dto: SaveGameDto) {
    const { id, email, savedAt } = this.savedGamesService.save(dto);

    return { id, email, savedAt };
  }
}
