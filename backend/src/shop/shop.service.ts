import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopItem } from '../entities/shop-item.entity';
import { UserInventory } from '../entities/user-inventory.entity';
import { Profile } from '../entities/profile.entity';

// 20 Pre-defined Colors
const COLORS = [
    'f44336', 'e91e63', '9c27b0', '673ab7', '3f51b5',
    '2196f3', '03a9f4', '00bcd4', '009688', '4caf50',
    '8bc34a', 'cddc39', 'ffeb3b', 'ffc107', 'ff9800',
    'ff5722', '795548', '9e9e9e', '607d8b', '000000'
];

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
    
    // Filter out non-rotating items (streak freeze, etc. if we want them always available?)
    // User said "minden nap kiválaszt ezek közül 5-öt".
    // We should probably keep 'streak_freeze' always available separately?
    // Or include it in the rotation? Usually consumables are always available.
    // Let's separate "Standard Items" and "Daily Rotation".
    // For now, I'll just rotate the cosmetic items.
    const cosmeticItems = allItems.filter(i => i.category !== 'streak_freeze' && i.category !== 'xp_boost');
    const standardItems = allItems.filter(i => i.category === 'streak_freeze' || i.category === 'xp_boost');

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
    const enrichedDailyItems = dailyCosmetics.map(item => {
        // Clone item to not affect cache/DB entities if persistent
        const enriched = { ...item, metadata: { ...item.metadata } };
        
        // Pick a color
        const colorIndex = Math.floor(rng.next() * COLORS.length);
        const color = COLORS[colorIndex];

        // Inject color into dicebear metadata based on category/keys
        if (!enriched.metadata.dicebear) enriched.metadata.dicebear = {};
        const db = enriched.metadata.dicebear;

        if (db.hat) db.hatColor = color;
        if (db.glasses) db.glassesColor = color;
        if (db.accessories) db.accessoriesColor = color;
        if (db.clothing) db.clothingColor = color;
        // Background/Theme might not need color rotation if it's gradient, but if it's solid...
        
        // Apply discount logic (from previous step)
        const isDiscounted = rng.next() < 0.3;
        if (isDiscounted) {
            const discountPercent = 0.1 + (rng.next() * 0.4); 
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
    const existingItem = await this.inventoryRepository.findOne({ 
        where: { userId, itemId } 
    });

    // Check if we already own this EXACT variation?
    // Actually, inventory logic is usually one per itemId.
    // If I buy "Hat V1" today (Red), and tomorrow "Hat V1" is Blue, do I have Red or Blue?
    // If I own the item, I own the item.
    // But the user wants specific colors.
    // "mindegyikhez külön-külön kiválaszt egy színt...".
    // If the base item is "Hat V1", and I own it, usually I own "Hat V1".
    // But if I want to own "Red Hat V1", then I need to store the color.
    // If I buy "Blue Hat V1" later, is it a separate item?
    // `UserInventory` has `itemId`. If `itemId` is same, it's the same row (unless we remove unique constraint on itemId/userId).
    // Unique constraint is usually on `(user_id, item_id)`.
    // If I want to allow multiple colors of same item, I need to remove that constraint or change logic.
    // User said: "minden nap kiválaszt... és ... kiválaszt egy színt".
    // This implies the OFFER is colored.
    // If I buy it, I get that color.
    // If I already own "Hat V1" (Red), can I buy "Hat V1" (Blue)?
    // If yes, I need to store multiple rows in `user_inventory` for same `itemId` but different `metadata`.
    // My schema `user_inventory` PK is `id`. `(user_id, item_id)` uniqueness is NOT enforced in schema (I checked schema.sql, no unique index on that pair, only FKs).
    // So I CAN add multiple rows.

    // Deduct gems
    profile.gems -= item.costGems;
    await this.profileRepository.save(profile);

    // Always create new entry to store specific color metadata
    const newItem = this.inventoryRepository.create({
        userId,
        itemId,
        quantity: 1,
        metadata: item.metadata // Store the specific color generated for today
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
