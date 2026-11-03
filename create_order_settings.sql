-- Migration script for Order Settings and Transaction Rules
CREATE TABLE IF NOT EXISTS stockflow.mst_order_settings (
    setting_id INTEGER NOT NULL DEFAULT 1 PRIMARY KEY,
    -- Group A: Order placement & reservation
    enable_order_placement BOOLEAN NOT NULL DEFAULT TRUE,
    allow_order_when_out_of_stock BOOLEAN NOT NULL DEFAULT TRUE,
    allow_selling_reserved_stock BOOLEAN NOT NULL DEFAULT FALSE,
    allow_transferring_order_branch BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Group B: Sales & POS execution
    allow_negative_stock_sale BOOLEAN NOT NULL DEFAULT FALSE,
    enable_print_quotation BOOLEAN NOT NULL DEFAULT TRUE,
    confirm_before_complete_order BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Group C: Return policy
    enable_return_time_limit BOOLEAN NOT NULL DEFAULT TRUE,
    return_time_limit_days INTEGER NOT NULL DEFAULT 30,
    
    -- Group D: Transaction timing
    lock_transaction_time BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Group E: Code generation rules
    order_code_rule VARCHAR(20) NOT NULL DEFAULT 'SEQUENTIAL',
    order_code_prefix VARCHAR(10) NOT NULL DEFAULT 'HD',
    booking_code_prefix VARCHAR(10) NOT NULL DEFAULT 'DH',
    return_code_prefix VARCHAR(10) NOT NULL DEFAULT 'TH',
    transfer_code_prefix VARCHAR(10) NOT NULL DEFAULT 'CK',
    
    -- Audit
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER NULL REFERENCES stockflow.sec_users(user_id),
    
    -- Constraints
    CONSTRAINT chk_mst_order_settings_singleton CHECK (setting_id = 1),
    CONSTRAINT chk_order_code_rule CHECK (order_code_rule IN ('SEQUENTIAL', 'DATETIME', 'RANDOM')),
    CONSTRAINT chk_return_time_limit_days CHECK (return_time_limit_days >= 0)
);

-- Seed initial default configuration (singleton)
INSERT INTO stockflow.mst_order_settings (
    setting_id,
    enable_order_placement,
    allow_order_when_out_of_stock,
    allow_selling_reserved_stock,
    allow_transferring_order_branch,
    allow_negative_stock_sale,
    enable_print_quotation,
    confirm_before_complete_order,
    enable_return_time_limit,
    return_time_limit_days,
    lock_transaction_time,
    order_code_rule,
    order_code_prefix,
    booking_code_prefix,
    return_code_prefix,
    transfer_code_prefix,
    updated_at
) VALUES (
    1,
    TRUE,
    TRUE,
    FALSE,
    TRUE,
    FALSE,
    TRUE,
    FALSE,
    TRUE,
    30,
    TRUE,
    'SEQUENTIAL',
    'HD',
    'DH',
    'TH',
    'CK',
    CURRENT_TIMESTAMP
) ON CONFLICT (setting_id) DO NOTHING;

-- Sequences for other document types if not exists
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_booking_code START 1;
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_return_code START 1;
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_transfer_code START 1;

