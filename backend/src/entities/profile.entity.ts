import { Entity, Column, PrimaryColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { UserSubmission } from './user-submission.entity';
import { DailyLogin } from './daily-login.entity';

@Entity('profiles')
export class Profile {
  @PrimaryColumn('uuid')
  id: string; // References auth.users, manually set

  @Column({ type: 'text', nullable: true })
  username: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ type: 'int', default: 5 })
  hp: number;

  @Column({ type: 'int', default: 0 })
  streak: number;

  @Column({ name: 'global_elo_rating', type: 'float', default: 1000.0 })
  globalEloRating: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => UserSubmission, (submission) => submission.user)
  submissions: UserSubmission[];

  @OneToMany(() => DailyLogin, (login) => login.user)
  dailyLogins: DailyLogin[];
}
