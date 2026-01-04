import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Profile } from './profile.entity';
import { Question } from './question.entity';

@Entity('user_submissions')
export class UserSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Profile, (profile) => profile.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @Column({ name: 'question_id', type: 'uuid', nullable: true })
  questionId: string;

  @ManyToOne(() => Question, (question) => question.submissions, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'is_correct', type: 'boolean' })
  isCorrect: boolean;

  @Column({ name: 'submitted_answer', type: 'text', nullable: true })
  submittedAnswer: string;

  @Column({ name: 'execution_time_ms', type: 'int', nullable: true })
  executionTimeMs: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
