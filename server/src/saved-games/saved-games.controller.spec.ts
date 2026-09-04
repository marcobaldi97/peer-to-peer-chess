import { Test, TestingModule } from '@nestjs/testing';
import { SavedGamesController } from './saved-games.controller';
import { SavedGamesService } from './saved-games.service';

describe('SavedGamesController', () => {
  let controller: SavedGamesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavedGamesController],
      providers: [SavedGamesService],
    }).compile();

    controller = module.get<SavedGamesController>(SavedGamesController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('saves a game and returns a confirmation with an id', () => {
    const result = controller.save(
      {
        pgn: '1. e4 e5',
        status: 'checkmate',
        playedAt: '2026-01-01T00:00:00.000Z',
      },
      { id: 'cognito-sub-123', email: 'player@example.com' },
    );

    expect(result.id).toEqual(expect.any(String));
    expect(result.savedAt).toEqual(expect.any(String));
  });
});
