import { Entity, Column, PrimaryColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { UserSubmission } from './user-submission.entity';
import { UserConceptMastery } from './user-concept-mastery.entity';
import { UserInventory } from './user-inventory.entity';

@Entity('profiles')
export class Profile {
  @PrimaryColumn('uuid')
  id: string; // References auth.users

  @Column({ type: 'text', unique: true, nullable: true })
  username: string;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ name: 'sanity_points', type: 'int', default: 100 })
  sanityPoints: number;

  @Column({ name: 'current_streak', type: 'int', default: 0 })
  currentStreak: number;

  @Column({ type: 'int', default: 0 })
  gems: number;

  @Column({ name: 'global_proficiency', type: 'float', default: 0.0 })
  globalProficiency: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => UserSubmission, (submission: UserSubmission) => submission.user)
  submissions: UserSubmission[];

  @Column({ name: 'last_daily_bonus', type: 'date', nullable: true })
  lastDailyBonus: string;

  @Column({ name: 'avatar_config', type: 'jsonb', nullable: true })
  avatarConfig: any;

  @OneToMany(() => UserConceptMastery, (ucm) => ucm.user)
  conceptMastery: UserConceptMastery[];

  @OneToMany(() => UserInventory, (ui) => ui.user)
  inventory: UserInventory[];
}
