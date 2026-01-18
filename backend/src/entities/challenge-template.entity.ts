import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('challenge_templates')
export class ChallengeTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['DAILY', 'WEEKLY'] })
  period: 'DAILY' | 'WEEKLY';

  @Column({ type: 'enum', enum: ['SOLVE_QUESTION', 'PLAY_QUIZ', 'CUSTOMIZE_AVATAR', 'RESOLVE_MISTAKE', 'STREAK', 'EARN_GEMS'] })
  actionType: 'SOLVE_QUESTION' | 'PLAY_QUIZ' | 'CUSTOMIZE_AVATAR' | 'RESOLVE_MISTAKE' | 'STREAK' | 'EARN_GEMS';

  @Column({ name: 'goal_value', type: 'int' })
  goalValue: number;

  @Column({ name: 'reward_xp', type: 'int' })
  rewardXp: number;

  @Column({ name: 'reward_gems', type: 'int' })
  rewardGems: number;

  @Column({ name: 'description_template', type: 'text' })
  descriptionTemplate: string;
}
