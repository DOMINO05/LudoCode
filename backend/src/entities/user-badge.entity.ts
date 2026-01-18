import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Profile } from './profile.entity';
import { Badge } from './badge.entity';

@Entity('user_badges')
export class UserBadge {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'badge_id', type: 'uuid' })
  badgeId: string;

  @CreateDateColumn({ name: 'awarded_at', type: 'timestamptz' })
  awardedAt: Date;

  @ManyToOne(() => Profile, (profile) => profile.userBadges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @ManyToOne(() => Badge, (badge) => badge.userBadges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'badge_id' })
  badge: Badge;
}
