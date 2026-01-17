import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuestionOrder {
  questionId: string;
  orderIndex: number;
}

export class UpdateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOrder)
  questions: QuestionOrder[];
}
