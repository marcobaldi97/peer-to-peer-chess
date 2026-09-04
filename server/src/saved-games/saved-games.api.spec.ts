import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { COGNITO_JWT_VERIFIER } from '../auth/cognito-verifier.provider';
import { SavedGamesService } from './saved-games.service';

// Integration-style spec. It lives under src/ rather than the conventional
// test/ directory because Jest is configured inline in package.json with
// `rootDir: "src"` — anything outside src/ is simply not collected.
//
// Overriding COGNITO_JWT_VERIFIER replaces the provider before its useFactory
// runs, so this needs no Cognito env vars and makes no network calls.
describe('POST /games', () => {
  let app: INestApplication;
  let service: SavedGamesService;
  const verify = jest.fn();

  const validBody = {
    pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#',
    status: 'checkmate',
    playedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    verify.mockReset();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(COGNITO_JWT_VERIFIER)
      .useValue({ verify })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    service = app.get(SavedGamesService);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a request with no Authorization header', async () => {
    await request(app.getHttpServer()).post('/games').send(validBody).expect(401);

    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects a token the verifier will not accept', async () => {
    verify.mockRejectedValue(new Error('Invalid signature'));

    await request(app.getHttpServer())
      .post('/games')
      .set('Authorization', 'Bearer bad-token')
      .send(validBody)
      .expect(401);
  });

  it('accepts a valid token and returns the saved game id', async () => {
    verify.mockResolvedValue({ sub: 'cognito-sub-123', email: 'a@b.c' });

    const response = await request(app.getHttpServer())
      .post('/games')
      .set('Authorization', 'Bearer good-token')
      .send(validBody)
      .expect(201);

    expect(verify).toHaveBeenCalledWith('good-token');
    expect(response.body).toEqual({
      id: expect.any(String),
      savedAt: expect.any(String),
    });
  });

  it('still validates the body behind the guard', async () => {
    verify.mockResolvedValue({ sub: 'cognito-sub-123', email: 'a@b.c' });

    await request(app.getHttpServer())
      .post('/games')
      .set('Authorization', 'Bearer good-token')
      .send({ status: 'checkmate', playedAt: '2026-01-01T00:00:00.000Z' })
      .expect(400);
  });

  it('takes the identity from the token and ignores any email in the body', async () => {
    verify.mockResolvedValue({ sub: 'cognito-sub-123', email: 'real@user.com' });

    await request(app.getHttpServer())
      .post('/games')
      .set('Authorization', 'Bearer good-token')
      .send({ ...validBody, email: 'attacker@example.com' })
      .expect(201);

    expect(service.findAll()).toEqual([
      expect.objectContaining({
        userId: 'cognito-sub-123',
        email: 'real@user.com',
      }),
    ]);
  });
});
