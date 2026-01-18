import { IsIn, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SyncUserDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Beginner', 'Intermediate', 'Pro'])
  level: 'Beginner' | 'Intermediate' | 'Pro';

  @IsString()
  @IsOptional()
  username?: string;
}
