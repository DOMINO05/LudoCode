import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class ExecuteCodeDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['python', 'javascript', 'typescript', 'java', 'cpp', 'c', 'go', 'rust', 'php']) // Add supported languages
  language: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
