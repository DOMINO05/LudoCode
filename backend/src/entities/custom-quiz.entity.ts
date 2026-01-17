import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Profile } from './profile.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizAttempt } from './quiz-attempt.entity';

@Entity('custom_quizzes')
export class CustomQuiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_id', type: 'uuid' })
  creatorId: string;

  @ManyToOne(() => Profile, (profile) => profile.createdQuizzes)
  @JoinColumn({ name: 'creator_id' })
  creator: Profile;

  @Column({ type: 'text' })
  title: string;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ name: 'share_code', type: 'varchar', length: 6, unique: true, nullable: true })
  shareCode: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => QuizQuestion, (qq) => qq.quiz)
  questions: QuizQuestion[];

  @OneToMany(() => QuizAttempt, (qa) => qa.quiz)
  attempts: QuizAttempt[];
}
