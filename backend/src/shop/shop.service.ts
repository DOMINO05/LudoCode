import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopItem } from '../entities/shop-item.entity';
import { UserInventory } from '../entities/user-inventory.entity';
import { Profile } from '../entities/profile.entity';

// 20 Pre-defined Colors
const COLORS = [
  'f44336',
  'e91e63',
  '9c27b0',
  '673ab7',
  '3f51b5',
  '2196f3',
  '03a9f4',
  '00bcd4',
  '009688',
  '4caf50',
  '8bc34a',
  'cddc39',
  'ffeb3b',
  'ffc107',
  'ff9800',
  'ff5722',
  '795548',
  '9e9e9e',
  '607d8b',
  '000000',
];

interface DicebearConfig {
  hat?: string;
  hatColor?: string;
  glasses?: string;
  glassesColor?: string;
  accessories?: string;
  accessoriesColor?: string;
  clothing?: string;
  clothingColor?: string;
  [key: string]: any;
}

interface ItemMetadata {
  dicebear?: DicebearConfig;
  originalCost?: number;
  discountPercent?: number;
  [key: string]: any;
}

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(ShopItem)
    private shopItemsRepository: Repository<ShopItem>,
    @InjectRepository(UserInventory)
    private inventoryRepository: Repository<UserInventory>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async getShopItems(): Promise<ShopItem[]> {
    return this.getDailySelection();
  }

  // Generate the 5 items for today with random colors
  private async getDailySelection(): Promise<ShopItem[]> {
    const allItems = await this.shopItemsRepository.find();

    // Filter out non-rotating items
    const cosmeticItems = allItems.filter(
      (i) => i.category !== 'streak_freeze' && i.category !== 'xp_boost',
    );
    const standardItems = allItems.filter(
      (i) => i.category === 'streak_freeze' || i.category === 'xp_boost',
    );

    if (cosmeticItems.length === 0) return standardItems;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const rng = new DailyRandom(today);

    // Shuffle cosmetics
    const shuffled = [...cosmeticItems];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Pick top 5
    const dailyCosmetics = shuffled.slice(0, 5);

    // Assign Random Colors from 20 colors
    const enrichedDailyItems = dailyCosmetics.map((item) => {
      // Clone item to not affect cache/DB entities if persistent
      const enriched = {
        ...item,
        metadata: { ...(item.metadata as ItemMetadata) },
      };

      // Pick a color
      const colorIndex = Math.floor(rng.next() * COLORS.length);
      const color = COLORS[colorIndex];

      // Inject color into dicebear metadata based on category/keys
      if (!enriched.metadata.dicebear) enriched.metadata.dicebear = {};
      const db = enriched.metadata.dicebear as DicebearConfig;

      if (db.hat) db.hatColor = color;
      if (db.glasses) db.glassesColor = color;
      if (db.accessories) db.accessoriesColor = color;
      if (db.clothing) db.clothingColor = color;

      // Apply discount logic
      const isDiscounted = rng.next() < 0.3;
      if (isDiscounted) {
        const discountPercent = 0.1 + rng.next() * 0.4;
        enriched.costGems = Math.floor(item.costGems * (1 - discountPercent));
        enriched.metadata.originalCost = item.costGems;
        enriched.metadata.discountPercent = Math.round(discountPercent * 100);
      }

      return enriched;
    });

    return [...standardItems, ...enrichedDailyItems];
  }

  async getUserInventory(userId: string): Promise<UserInventory[]> {
    return this.inventoryRepository.find({
      where: { userId },
      relations: ['item'],
    });
  }

  async buyItem(userId: string, itemId: string): Promise<UserInventory> {
    // Verify item is available in today's shop
    const dailyItems = await this.getDailySelection();
    const item = dailyItems.find((i) => i.id === itemId);

    if (!item) {
      throw new BadRequestException(
        'Item is not currently available in the shop',
      );
    }

    const profile = await this.profileRepository.findOne({
      where: { id: userId },
    });
    if (!profile) throw new NotFoundException('User not found');

    if (profile.gems < item.costGems) {
      throw new BadRequestException('Not enough gems');
    }

    // Deduct gems
    profile.gems -= item.costGems;
    await this.profileRepository.save(profile);

    // Always create new entry to store specific color metadata
    const newItem = this.inventoryRepository.create({
      userId,
      itemId,
      quantity: 1,
      metadata: item.metadata, // Store the specific color generated for today
    });
    return this.inventoryRepository.save(newItem);
  }
}

// Simple Seeded RNG (Linear Congruential Generator)
class DailyRandom {
  private seed: number;

  constructor(seedStr: string) {
    // Create a numeric seed from the string
    let h = 0x811c9dc5;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    this.seed = h >>> 0;
  }

  // Returns a float between 0 and 1
  next(): number {
    this.seed = (1664525 * this.seed + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}
