import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('items')
  async getShopItems() {
    return this.shopService.getShopItems();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('inventory')
  async getUserInventory(@Request() req) {
    return this.shopService.getUserInventory(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('buy/:itemId')
  async buyItem(@Request() req, @Param('itemId') itemId: string) {
    return this.shopService.buyItem(req.user.userId, itemId);
  }
}
