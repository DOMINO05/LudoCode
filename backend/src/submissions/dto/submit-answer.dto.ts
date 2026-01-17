import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @IsOptional()
  executionTimeMs?: number;

  @IsNumber()
  @IsOptional()
  streak?: number;
}
