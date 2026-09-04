import { IsEmail, IsISO8601, IsString } from 'class-validator';

// `email` is a plain, unauthenticated stand-in identity for now.
// Swap this for an authenticated user (e.g. via AWS Cognito) later.
export class SaveGameDto {
  @IsEmail()
  email!: string;

  @IsString()
  pgn!: string;

  @IsString()
  status!: string;

  @IsISO8601()
  playedAt!: string;
}
