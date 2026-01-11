import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Profile } from './profile.entity';
import { Language } from './language.entity';

@Entity('user_language_progress')
export class UserLanguageProgress {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'language_id', type: 'uuid' })
  languageId: string;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ name: 'proficiency', type: 'float', default: 0.0 })
  proficiency: number;

  @ManyToOne(() => Profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @ManyToOne(() => Language, (language) => language.userProgress, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'language_id' })
  language: Language;
}
