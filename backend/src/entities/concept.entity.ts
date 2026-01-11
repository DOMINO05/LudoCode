import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { QuestionConcept } from './question-concept.entity';
import { UserConceptMastery } from './user-concept-mastery.entity';

@Entity('concepts')
export class Concept {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // BKT Parameters
  @Column({ name: 'p_init', type: 'float', default: 0.1 })
  pInit: number;

  @Column({ name: 'p_transit', type: 'float', default: 0.15 })
  pTransit: number;

  @Column({ name: 'p_guess', type: 'float', default: 0.2 })
  pGuess: number;

  @Column({ name: 'p_slip', type: 'float', default: 0.1 })
  pSlip: number;

  // Prerequisites
  @ManyToMany(() => Concept)
  @JoinTable({
    name: 'concept_prerequisites',
    joinColumn: { name: 'concept_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'prerequisite_id', referencedColumnName: 'id' },
  })
  prerequisites: Concept[];

  @OneToMany(() => QuestionConcept, (qc) => qc.concept)
  questionConcepts: QuestionConcept[];

  @OneToMany(() => UserConceptMastery, (ucm) => ucm.concept)
  userMastery: UserConceptMastery[];
}
