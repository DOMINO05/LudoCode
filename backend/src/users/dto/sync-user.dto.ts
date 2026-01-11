import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SyncUserDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Beginner', 'Intermediate', 'Pro'])
  level: 'Beginner' | 'Intermediate' | 'Pro';
}
