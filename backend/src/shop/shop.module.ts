import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { ShopItem } from '../entities/shop-item.entity';
import { UserInventory } from '../entities/user-inventory.entity';
import { Profile } from '../entities/profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShopItem, UserInventory, Profile])],
  controllers: [ShopController],
  providers: [ShopService],
})
export class ShopModule {}
