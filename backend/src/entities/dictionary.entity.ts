import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('dictionary')
export class DictionaryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  word: string;

  @Column()
  definition: string;

  @Column({ nullable: true })
  category: string;

  @CreateDateColumn()
  created_at: Date;
}
