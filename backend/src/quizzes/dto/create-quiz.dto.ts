import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
