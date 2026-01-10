import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Profile } from './profile.entity';
import { ShopItem } from './shop-item.entity';

@Entity('user_inventory')
export class UserInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @ManyToOne(() => Profile, (profile) => profile.inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @ManyToOne(() => ShopItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: ShopItem;
}
