import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Profile } from '../entities/profile.entity';

@Entity('shared_snippets')
export class SharedSnippet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_id', nullable: true })
  creatorId: string;

  @ManyToOne(() => Profile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'creator_id' })
  creator: Profile;

  @Column('text')
  code: string;

  @Column()
  language: string;

  @Column({ nullable: true })
  title: string;

  @Column({ name: 'is_editable', default: false })
  isEditable: boolean;

  @Column({ name: 'share_code', unique: true, length: 6, nullable: true })
  shareCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
