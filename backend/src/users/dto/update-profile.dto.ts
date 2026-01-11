import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsObject()
  @IsOptional()
  avatar_config?: any;
}

export class EasterEggDto {
  @IsString()
  code: string;
}
