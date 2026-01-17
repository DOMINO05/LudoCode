import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CustomQuiz } from './custom-quiz.entity';
import { Question } from './question.entity';

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryColumn({ name: 'quiz_id', type: 'uuid' })
  quizId: string;

  @PrimaryColumn({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => CustomQuiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: CustomQuiz;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;
}
