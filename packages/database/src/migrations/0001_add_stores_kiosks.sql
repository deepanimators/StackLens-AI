-- Add stores and kiosks tables for store/kiosk metadata tracking
-- Migration: 0001_add_stores_kiosks
-- Created: 2024

-- Create stores table
CREATE TABLE `stores` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `store_number` text NOT NULL UNIQUE,
  `name` text NOT NULL,
  `location` text,
  `address` text,
  `city` text,
  `state` text,
  `zip_code` text,
  `country` text DEFAULT 'USA',
  `phone_number` text,
  `is_active` integer DEFAULT 1,
  `created_at` integer DEFAULT (unixepoch() * 1000),
  `updated_at` integer DEFAULT (unixepoch() * 1000)
);

-- Create kiosks table
CREATE TABLE `kiosks` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `kiosk_number` text NOT NULL UNIQUE,
  `store_id` integer NOT NULL,
  `name` text NOT NULL,
  `location` text,
  `device_type` text,
  `ip_address` text,
  `is_active` integer DEFAULT 1,
  `last_check_in` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000),
  `updated_at` integer DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);

-- Add store_number and kiosk_number to log_files table
ALTER TABLE `log_files` ADD COLUMN `store_number` text;
ALTER TABLE `log_files` ADD COLUMN `kiosk_number` text;
