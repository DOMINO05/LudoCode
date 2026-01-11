import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Profile } from './profile.entity';
import { Concept } from './concept.entity';
import { Language } from './language.entity';

@Entity('user_concept_mastery')
export class UserConceptMastery {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'concept_id', type: 'uuid' })
  conceptId: string;

  @PrimaryColumn({ name: 'language_id', type: 'uuid' })
  languageId: string;

  @Column({ name: 'mastery_probability', type: 'float', default: 0.1 })
  masteryProbability: number;

  @Column({ name: 'total_attempts', type: 'int', default: 0 })
  totalAttempts: number;

  @UpdateDateColumn({ name: 'last_practiced_at', type: 'timestamptz' })
  lastPracticedAt: Date;

  @ManyToOne(() => Profile, (profile) => profile.conceptMastery, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @ManyToOne(() => Concept, (concept) => concept.userMastery, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'concept_id' })
  concept: Concept;

  @ManyToOne(() => Language, (language) => language.conceptMasteries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'language_id' })
  language: Language;
}
