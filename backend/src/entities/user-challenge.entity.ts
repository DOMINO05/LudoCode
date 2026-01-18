import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Profile } from './profile.entity';
import { ChallengeTemplate } from './challenge-template.entity';

@Entity('user_challenges')
export class UserChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Profile)
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string;

  @ManyToOne(() => ChallengeTemplate)
  @JoinColumn({ name: 'template_id' })
  template: ChallengeTemplate;

  @Column({ name: 'action_type', type: 'varchar' })
  actionType: string;

  @Column({ name: 'goal_value', type: 'int' })
  goalValue: number;

  @Column({ name: 'current_value', type: 'int', default: 0 })
  currentValue: number;

  @Column({ name: 'reward_xp', type: 'int' })
  rewardXp: number;

  @Column({ name: 'reward_gems', type: 'int' })
  rewardGems: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ name: 'is_claimed', type: 'boolean', default: false })
  isClaimed: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;
}
