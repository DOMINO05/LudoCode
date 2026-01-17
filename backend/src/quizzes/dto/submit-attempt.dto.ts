import { IsInt, Min, Max } from 'class-validator';

export class SubmitAttemptDto {
  @IsInt()
  @Min(0)
  score: number;

  @IsInt()
  @Min(1)
  maxScore: number;
}
