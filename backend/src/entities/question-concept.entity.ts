import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Question } from './question.entity';
import { Concept } from './concept.entity';

@Entity('question_concepts')
export class QuestionConcept {
  @PrimaryColumn({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @PrimaryColumn({ name: 'concept_id', type: 'uuid' })
  conceptId: string;

  @Column({ type: 'float', default: 1.0 })
  weight: number;

  @ManyToOne(() => Question, (question) => question.questionConcepts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @ManyToOne(() => Concept, (concept) => concept.questionConcepts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'concept_id' })
  concept: Concept;
}
