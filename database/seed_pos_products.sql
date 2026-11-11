-- Seed 4 sản phẩm mẫu chuẩn POS
INSERT INTO stockflow.mst_products (
  product_code, product_name, category_id, base_unit_id, product_type,
  description, standard_price, moving_average_cost, barcode, brand,
  min_safe_stock, max_safe_stock, is_direct_sale, is_active
) VALUES 
(
  'SP-10294', 'Switch Cisco Catalyst 1000 24-Port Gigabit', 6, 8, 'FINISHED',
  'Switch Cisco Catalyst 1000 Series 24 cổng GE, 4x 1G SFP uplinks', 8450000, 6800000, '8936001029401', 'Cisco',
  5, 50, true, true
),
(
  'SP-20411', 'Ổ cứng SSD Samsung 980 PRO 1TB PCIe 4.0 NVMe M.2', 7, 10, 'FINISHED',
  'Ổ cứng SSD Samsung 980 PRO PCIe 4.0 NVMe tốc độ đọc 7000MB/s', 2650000, 2100000, '8936002041102', 'Samsung',
  10, 100, true, true
),
(
  'SP-08832', 'Cáp mạng CommScope Cat6 UTP 305m/thùng chính hãng', 5, 9, 'FINISHED',
  'Thùng cáp mạng CommScope Netconnect Cat6 UTP 23AWG vỏ xanh 305m', 2150000, 1750000, '8936000883203', 'CommScope',
  5, 30, true, true
),
(
  'SP-33019', 'Nguồn máy chủ Dell 750W Titanium Hot-plug Power Supply', 7, 11, 'FINISHED',
  'Nguồn server Dell PowerEdge 750W Hot-Plug Titanium', 3890000, 3100000, '8936003301904', 'Dell',
  5, 20, true, true
)
ON CONFLICT (product_code) DO NOTHING;

-- Cập nhật tồn kho vào trx_inventory_balances cho kho K001 (warehouse_id = 3) hoặc kho 1
INSERT INTO stockflow.trx_inventory_balances (warehouse_id, product_id, quantity, unit_cost, last_updated)
SELECT 3, p.product_id, 18, 6800000, NOW() FROM stockflow.mst_products p WHERE p.product_code = 'SP-10294'
ON CONFLICT DO NOTHING;

INSERT INTO stockflow.trx_inventory_balances (warehouse_id, product_id, quantity, unit_cost, last_updated)
SELECT 3, p.product_id, 52, 2100000, NOW() FROM stockflow.mst_products p WHERE p.product_code = 'SP-20411'
ON CONFLICT DO NOTHING;

INSERT INTO stockflow.trx_inventory_balances (warehouse_id, product_id, quantity, unit_cost, last_updated)
SELECT 3, p.product_id, 8, 1750000, NOW() FROM stockflow.mst_products p WHERE p.product_code = 'SP-08832'
ON CONFLICT DO NOTHING;

INSERT INTO stockflow.trx_inventory_balances (warehouse_id, product_id, quantity, unit_cost, last_updated)
SELECT 3, p.product_id, 1, 3100000, NOW() FROM stockflow.mst_products p WHERE p.product_code = 'SP-33019'
ON CONFLICT DO NOTHING;
