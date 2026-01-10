import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { UserSubmission } from './user-submission.entity';
import { QuestionConcept } from './question-concept.entity';
import { Language } from './language.entity';

export enum QuestionType {
  THEORY = 'theory',
  PREDICT_OUTPUT = 'predict_output',
  FILL_IN_BLANK = 'fill_in_blank',
  PARSONS = 'parsons',
  DEBUG = 'debug',
  CODING = 'coding',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  hint: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    name: 'q_type',
    enumName: 'question_type',
  })
  qType: QuestionType;

  // New columns
  @Column({ name: 'difficulty_display', type: 'int', default: 1000 })
  difficultyDisplay: number;

  @Column({ name: 'difficulty_beta', type: 'float', default: 0.0 })
  difficultyBeta: number;

  @Column({ name: 'discrimination_alpha', type: 'float', default: 1.0 })
  discriminationAlpha: number;

  @Column({ name: 'language_id', type: 'uuid' })
  languageId: string;

  @ManyToOne(() => Language, (lang) => lang.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'language_id' })
  language: Language;

  @Column({ type: 'jsonb' })
  content: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Replaces the old @ManyToMany relation with Concept
  @OneToMany(() => QuestionConcept, (qc) => qc.question)
  questionConcepts: QuestionConcept[];

  @OneToMany(() => UserSubmission, (submission: UserSubmission) => submission.question)
  submissions: UserSubmission[];
}
