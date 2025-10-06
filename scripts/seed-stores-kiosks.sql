-- Seed script for Burger King stores and kiosks
-- Run this with: sqlite3 db/stacklens.db < scripts/seed-stores-kiosks.sql

-- Insert stores (unique store numbers with their franchise names)
INSERT OR IGNORE INTO stores (store_number, name, location, country, is_active) VALUES
('BK-14959', 'Applegreen BK Ltd', 'Burger King US', 'USA', 1),
('BK-1782', 'Quikserve Enterprises Inc.', 'Burger King US', 'USA', 1),
('BK-10', 'BKC', 'Burger King US', 'USA', 1),
('BK-5402', 'Jan King Inc', 'Burger King US', 'USA', 1),
('BK-6416', 'Humboldt Restaurants Inc', 'Burger King US', 'USA', 1),
('BK-30927', 'Shere', 'Burger King US', 'USA', 1),
('BK-2598', 'Carrols', 'Burger King US', 'USA', 1),
('BK-1015', 'Vanmar Inc', 'Burger King US', 'USA', 1),
('BK-9801', 'California Food Management LLC', 'Burger King US', 'USA', 1),
('BK-4188', 'Carrols', 'Burger King US', 'USA', 1);

-- Insert kiosks for BK-14959 (Applegreen BK Ltd)
INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-14959-K1', id, 'Kiosk 1 - Applegreen BK Ltd', 1 FROM stores WHERE store_number = 'BK-14959';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-14959-K2', id, 'Kiosk 2 - Applegreen BK Ltd', 1 FROM stores WHERE store_number = 'BK-14959';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-14959-K3', id, 'Kiosk 3 - Applegreen BK Ltd', 1 FROM stores WHERE store_number = 'BK-14959';

-- Insert kiosks for BK-1782 (Quikserve Enterprises Inc.)
INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-1782-K1', id, 'Kiosk 1 - Quikserve Enterprises Inc.', 1 FROM stores WHERE store_number = 'BK-1782';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-1782-K2', id, 'Kiosk 2 - Quikserve Enterprises Inc.', 1 FROM stores WHERE store_number = 'BK-1782';

-- Insert kiosks for BK-10 (BKC)
INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-10-K1', id, 'Kiosk 1 - BKC', 1 FROM stores WHERE store_number = 'BK-10';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-10-K2', id, 'Kiosk 2 - BKC', 1 FROM stores WHERE store_number = 'BK-10';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-10-K3', id, 'Kiosk 3 - BKC', 1 FROM stores WHERE store_number = 'BK-10';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-10-K4', id, 'Kiosk 4 - BKC', 1 FROM stores WHERE store_number = 'BK-10';

-- Insert kiosks for BK-5402 (Jan King Inc)
INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-5402-K1', id, 'Kiosk 1 - Jan King Inc', 1 FROM stores WHERE store_number = 'BK-5402';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-5402-K2', id, 'Kiosk 2 - Jan King Inc', 1 FROM stores WHERE store_number = 'BK-5402';

-- Insert kiosks for BK-6416 (Humboldt Restaurants Inc)
INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-6416-K1', id, 'Kiosk 1 - Humboldt Restaurants Inc', 1 FROM stores WHERE store_number = 'BK-6416';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-6416-K2', id, 'Kiosk 2 - Humboldt Restaurants Inc', 1 FROM stores WHERE store_number = 'BK-6416';

-- Insert kiosks for BK-30927 (Shere)
INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-30927-K1', id, 'Kiosk 1 - Shere', 1 FROM stores WHERE store_number = 'BK-30927';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-30927-K2', id, 'Kiosk 2 - Shere', 1 FROM stores WHERE store_number = 'BK-30927';

-- Insert kiosks for BK-2598 (Carrols)
INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-2598-K1', id, 'Kiosk 1 - Carrols (BK-2598)', 1 FROM stores WHERE store_number = 'BK-2598';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-2598-K2', id, 'Kiosk 2 - Carrols (BK-2598)', 1 FROM stores WHERE store_number = 'BK-2598';

-- Insert kiosks for BK-1015 (Vanmar Inc)
INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-1015-K1', id, 'Kiosk 1 - Vanmar Inc', 1 FROM stores WHERE store_number = 'BK-1015';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-1015-K2', id, 'Kiosk 2 - Vanmar Inc', 1 FROM stores WHERE store_number = 'BK-1015';

-- Insert kiosks for BK-9801 (California Food Management LLC)
INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-9801-K1', id, 'Kiosk 1 - California Food Management LLC', 1 FROM stores WHERE store_number = 'BK-9801';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-9801-K2', id, 'Kiosk 2 - California Food Management LLC', 1 FROM stores WHERE store_number = 'BK-9801';

-- Insert kiosks for BK-4188 (Carrols)
INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-4188-K1', id, 'Kiosk 1 - Carrols (BK-4188)', 1 FROM stores WHERE store_number = 'BK-4188';

INSERT OR IGNORE INTO kiosks (kiosk_number, store_id, name, is_active) 
SELECT 'BK-4188-K2', id, 'Kiosk 2 - Carrols (BK-4188)', 1 FROM stores WHERE store_number = 'BK-4188';

-- Verify the data
SELECT 'Stores inserted:' as info;
SELECT COUNT(*) as store_count FROM stores WHERE store_number LIKE 'BK-%';

SELECT 'Kiosks inserted:' as info;
SELECT COUNT(*) as kiosk_count FROM kiosks WHERE kiosk_number LIKE 'K%';

SELECT 'Store and Kiosk Summary:' as info;
SELECT s.store_number, s.name as franchise_name, COUNT(k.id) as kiosk_count
FROM stores s
LEFT JOIN kiosks k ON k.store_id = s.id
WHERE s.store_number LIKE 'BK-%'
GROUP BY s.id, s.store_number, s.name
ORDER BY s.store_number;
