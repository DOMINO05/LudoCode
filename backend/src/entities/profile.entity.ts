import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserSubmission } from './user-submission.entity';
import { UserConceptMastery } from './user-concept-mastery.entity';
import { UserInventory } from './user-inventory.entity';
import { CustomQuiz } from './custom-quiz.entity';
import { QuizAttempt } from './quiz-attempt.entity';
import { Quote } from './quote.entity';
import { UserBadge } from './user-badge.entity';

@Entity('profiles')
export class Profile {
  @PrimaryColumn('uuid')
  id: string; // References auth.users

  @Column({ type: 'text', unique: true, nullable: true })
  username: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  bio: string;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ name: 'sanity_points', type: 'int', default: 100 })
  sanityPoints: number;

  @Column({ name: 'current_streak', type: 'int', default: 0 })
  currentStreak: number;

  @Column({ name: 'max_combo', type: 'int', default: 0 })
  maxCombo: number;

  @Column({ type: 'int', default: 0 })
  gems: number;

  @Column({ name: 'global_proficiency', type: 'float', default: 0.0 })
  globalProficiency: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(
    () => UserSubmission,
    (submission: UserSubmission) => submission.user,
  )
  submissions: UserSubmission[];

  @Column({ name: 'last_daily_bonus', type: 'date', nullable: true })
  lastDailyBonus: string;

  @Column({ name: 'last_quote_id', type: 'uuid', nullable: true })
  lastQuoteId: string;

  @ManyToOne(() => Quote)
  @JoinColumn({ name: 'last_quote_id' })
  lastQuote: Quote;

  @Column({ name: 'avatar_config', type: 'jsonb', nullable: true })
  avatarConfig: any;

  @OneToMany(() => UserConceptMastery, (ucm) => ucm.user)
  conceptMastery: UserConceptMastery[];

  @OneToMany(() => UserInventory, (ui) => ui.user)
  inventory: UserInventory[];

  @OneToMany(() => CustomQuiz, (quiz) => quiz.creator)
  createdQuizzes: CustomQuiz[];

  @OneToMany(() => QuizAttempt, (attempt) => attempt.user)
  quizAttempts: QuizAttempt[];

  @OneToMany(() => UserBadge, (ub) => ub.user)
  userBadges: UserBadge[];
}
