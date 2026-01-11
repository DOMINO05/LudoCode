import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShopService } from './shop.service';
import { User, UserPayload } from '../common/decorators/user.decorator';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('items')
  async getShopItems() {
    return this.shopService.getShopItems();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('inventory')
  async getUserInventory(@User() user: UserPayload) {
    return this.shopService.getUserInventory(user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('buy/:itemId')
  async buyItem(@User() user: UserPayload, @Param('itemId') itemId: string) {
    return this.shopService.buyItem(user.userId, itemId);
  }
}
