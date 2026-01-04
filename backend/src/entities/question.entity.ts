import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Concept } from './concept.entity';
import { UserSubmission } from './user-submission.entity';

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
  })
  qType: QuestionType;

  @Column({ name: 'difficulty_rating', type: 'float', default: 1000.0 })
  difficultyRating: number;

  @Column({ type: 'text' })
  language: string;

  @Column({ type: 'jsonb' })
  content: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToMany(() => Concept, (concept) => concept.questions)
  @JoinTable({
    name: 'question_concepts',
    joinColumn: { name: 'question_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'concept_id', referencedColumnName: 'id' },
  })
  concepts: Concept[];

  @OneToMany(() => UserSubmission, (submission) => submission.question)
  submissions: UserSubmission[];
}
