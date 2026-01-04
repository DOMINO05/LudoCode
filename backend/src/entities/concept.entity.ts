import { Entity, Column, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { Question } from './question.entity';

@Entity('concepts')
export class Concept {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToMany(() => Question, (question: Question) => question.concepts)
  questions: Question[];
}
