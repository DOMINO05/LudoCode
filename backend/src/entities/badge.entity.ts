import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { UserBadge } from './user-badge.entity';

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'icon_path', type: 'text', nullable: true })
  iconPath: string;

  @Column({ name: 'criteria_type', type: 'varchar', length: 50 })
  criteriaType: 'XP' | 'PROFICIENCY' | 'STREAK' | 'GEMS';

  @Column({ name: 'criteria_value', type: 'float' })
  criteriaValue: number;

  @OneToMany(() => UserBadge, (ub) => ub.badge)
  userBadges: UserBadge[];
}
