-- 47. Fix clothing items category
-- Part 1: Add the value to enum (must be done in its own transaction)
ALTER TYPE item_category ADD VALUE IF NOT EXISTS 'clothing';
