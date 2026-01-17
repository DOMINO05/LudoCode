import { IsUUID, IsInt, Min } from 'class-validator';

export class AddQuestionDto {
  @IsUUID()
  questionId: string;

  @IsInt()
  @Min(0)
  orderIndex: number;
}
