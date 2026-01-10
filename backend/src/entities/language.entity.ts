import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Question } from './question.entity';
import { UserLanguageProgress } from './user-language-progress.entity';
import { UserConceptMastery } from './user-concept-mastery.entity';

@Entity('languages')
export class Language {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  name: string; // e.g., 'python', 'java'

  @Column({ name: 'display_name', type: 'text', nullable: true })
  displayName: string; // e.g., 'Python', 'Java'

  @Column({ type: 'text', nullable: true })
  icon: string; // URL or emoji

  @OneToMany(() => Question, (question) => question.language)
  questions: Question[];

  @OneToMany(() => UserLanguageProgress, (progress) => progress.language)
  userProgress: UserLanguageProgress[];

  @OneToMany(() => UserConceptMastery, (mastery) => mastery.language)
  conceptMasteries: UserConceptMastery[];
}
