-- Migration: Bổ sung order_type, updated_at, updated_by vào bảng trx_orders
ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) NOT NULL DEFAULT 'INVOICE';
ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS updated_by INTEGER NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_trx_orders_updated_by'
  ) THEN
    ALTER TABLE stockflow.trx_orders 
      ADD CONSTRAINT fk_trx_orders_updated_by FOREIGN KEY (updated_by) REFERENCES stockflow.sec_users(user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_trx_orders_order_type ON stockflow.trx_orders(order_type);

UPDATE stockflow.trx_orders
SET order_type = CASE
    WHEN order_code ILIKE 'DH%' OR order_code ILIKE 'SO%' THEN 'BOOKING'
    ELSE 'INVOICE'
END;

