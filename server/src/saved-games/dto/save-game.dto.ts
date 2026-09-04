import { IsISO8601, IsString } from 'class-validator';

// The player's identity is taken from the verified Cognito ID token, never from
// the request body. An `email` sent by an older client is silently stripped by
// the global ValidationPipe's `whitelist` option.
export class SaveGameDto {
  @IsString()
  pgn!: string;

  @IsString()
  status!: string;

  @IsISO8601()
  playedAt!: string;
}
