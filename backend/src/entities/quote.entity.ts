import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'varchar', length: 100, default: 'Ismeretlen' })
  author: string;
}
