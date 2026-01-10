import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopItem } from '../entities/shop-item.entity';
import { UserInventory } from '../entities/user-inventory.entity';
import { Profile } from '../entities/profile.entity';

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

  // Generate the 6 items for today with dynamic pricing
  private async getDailySelection(): Promise<ShopItem[]> {
    const allItems = await this.shopItemsRepository.find();
    if (allItems.length === 0) return [];

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const rng = new DailyRandom(today);

    // Shuffle array using Fisher-Yates with seeded RNG
    const shuffled = [...allItems];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Pick top 6
    const dailyItems = shuffled.slice(0, 6);

    // Apply dynamic pricing (Discounts)
    // We modify the returned instances, not the DB
    return dailyItems.map(item => {
        // Chance for discount: 30% chance
        const isDiscounted = rng.next() < 0.3;
        if (isDiscounted) {
            // Discount between 10% and 50%
            const discountPercent = 0.1 + (rng.next() * 0.4); 
            const newPrice = Math.floor(item.costGems * (1 - discountPercent));
            
            // We'll attach the discount info to metadata or just modify costGems
            // Modifying costGems is easiest for the frontend
            const originalCost = item.costGems;
            item.costGems = newPrice;
            item.metadata = { 
                ...item.metadata, 
                originalCost, 
                discountPercent: Math.round(discountPercent * 100) 
            };
        }
        return item;
    });
  }

  async getUserInventory(userId: string): Promise<UserInventory[]> {
    return this.inventoryRepository.find({ 
        where: { userId },
        relations: ['item']
    });
  }

  async buyItem(userId: string, itemId: string): Promise<UserInventory> {
    // Verify item is available in today's shop
    const dailyItems = await this.getDailySelection();
    const item = dailyItems.find(i => i.id === itemId);

    if (!item) {
        throw new BadRequestException('Item is not currently available in the shop');
    }

    const profile = await this.profileRepository.findOne({ where: { id: userId } });
    if (!profile) throw new NotFoundException('User not found');

    if (profile.gems < item.costGems) {
        throw new BadRequestException('Not enough gems');
    }

    // Check if already owned (unique items like frames/hats)
    // Consumables (streak freeze) might be stackable
    const existingItem = await this.inventoryRepository.findOne({ 
        where: { userId, itemId } 
    });

    if (existingItem && item.category !== 'streak_freeze' && item.category !== 'xp_boost') {
         throw new BadRequestException('You already own this item');
    }

    // Deduct gems
    profile.gems -= item.costGems;
    await this.profileRepository.save(profile);

    // Add to inventory
    if (existingItem) {
        existingItem.quantity += 1;
        return this.inventoryRepository.save(existingItem);
    } else {
        const newItem = this.inventoryRepository.create({
            userId,
            itemId,
            quantity: 1
        });
        return this.inventoryRepository.save(newItem);
    }
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
