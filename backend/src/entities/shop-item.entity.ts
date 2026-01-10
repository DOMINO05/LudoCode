import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum ItemCategory {
  STREAK_FREEZE = 'streak_freeze',
  THEME = 'theme',
  AVATAR_FRAME = 'avatar_frame',
  XP_BOOST = 'xp_boost',
  HAT = 'hat',
  ACCESSORY = 'accessory',
  PET = 'pet',
}

export enum ItemRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

@Entity('shop_items')
export class ShopItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({
    type: 'enum',
    enum: ItemCategory,
    name: 'category',
    enumName: 'item_category',
  })
  category: ItemCategory;

  @Column({
    type: 'enum',
    enum: ItemRarity,
    name: 'rarity',
    enumName: 'item_rarity',
    default: ItemRarity.COMMON
  })
  rarity: ItemRarity;

  @Column({ name: 'cost_gems', type: 'int' })
  costGems: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}
