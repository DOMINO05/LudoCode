import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class UpdateQuizDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
