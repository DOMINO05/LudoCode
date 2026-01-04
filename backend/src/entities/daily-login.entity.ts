import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Profile } from './profile.entity';

@Entity('daily_logins')
@Index('idx_daily_logins_user_date', ['userId', 'loginDate'], { unique: true })
export class DailyLogin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Profile, (profile) => profile.dailyLogins, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @Column({ name: 'login_date', type: 'date', default: () => 'CURRENT_DATE' })
  loginDate: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
