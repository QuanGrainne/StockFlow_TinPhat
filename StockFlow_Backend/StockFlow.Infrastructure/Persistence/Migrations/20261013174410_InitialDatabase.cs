using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialDatabase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "stockflow");

            migrationBuilder.CreateTable(
                name: "mst_business_partners",
                schema: "stockflow",
                columns: table => new
                {
                    partner_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    partner_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    partner_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    partner_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    address = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    credit_limit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    current_debt = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    current_payable = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("mst_business_partners_pkey", x => x.partner_id);
                });

            migrationBuilder.CreateTable(
                name: "mst_product_categories",
                schema: "stockflow",
                columns: table => new
                {
                    category_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    category_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("mst_product_categories_pkey", x => x.category_id);
                });

            migrationBuilder.CreateTable(
                name: "mst_units",
                schema: "stockflow",
                columns: table => new
                {
                    unit_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    unit_name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    abbreviation = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("mst_units_pkey", x => x.unit_id);
                });

            migrationBuilder.CreateTable(
                name: "mst_warehouses",
                schema: "stockflow",
                columns: table => new
                {
                    warehouse_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    warehouse_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    warehouse_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    address = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("mst_warehouses_pkey", x => x.warehouse_id);
                });

            migrationBuilder.CreateTable(
                name: "sec_permissions",
                schema: "stockflow",
                columns: table => new
                {
                    permission_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    permission_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    permission_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    module = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("sec_permissions_pkey", x => x.permission_id);
                });

            migrationBuilder.CreateTable(
                name: "sec_roles",
                schema: "stockflow",
                columns: table => new
                {
                    role_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    role_name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("sec_roles_pkey", x => x.role_id);
                });

            migrationBuilder.CreateTable(
                name: "sec_users",
                schema: "stockflow",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    password_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    full_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("sec_users_pkey", x => x.user_id);
                });

            migrationBuilder.CreateTable(
                name: "mst_products",
                schema: "stockflow",
                columns: table => new
                {
                    product_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    product_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    product_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    category_id = table.Column<int>(type: "integer", nullable: false),
                    base_unit_id = table.Column<int>(type: "integer", nullable: false),
                    product_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    reorder_point = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    moving_average_cost = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("mst_products_pkey", x => x.product_id);
                    table.ForeignKey(
                        name: "fk_mst_products_base_unit_id",
                        column: x => x.base_unit_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_units",
                        principalColumn: "unit_id");
                    table.ForeignKey(
                        name: "fk_mst_products_category_id",
                        column: x => x.category_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_product_categories",
                        principalColumn: "category_id");
                });

            migrationBuilder.CreateTable(
                name: "mst_warehouse_locations",
                schema: "stockflow",
                columns: table => new
                {
                    location_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    location_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    location_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("mst_warehouse_locations_pkey", x => x.location_id);
                    table.ForeignKey(
                        name: "fk_mst_warehouse_locations_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "jnc_role_permissions",
                schema: "stockflow",
                columns: table => new
                {
                    role_id = table.Column<int>(type: "integer", nullable: false),
                    permission_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("jnc_role_permissions_pkey", x => new { x.role_id, x.permission_id });
                    table.ForeignKey(
                        name: "fk_jnc_role_permissions_permission_id",
                        column: x => x.permission_id,
                        principalSchema: "stockflow",
                        principalTable: "sec_permissions",
                        principalColumn: "permission_id");
                    table.ForeignKey(
                        name: "fk_jnc_role_permissions_role_id",
                        column: x => x.role_id,
                        principalSchema: "stockflow",
                        principalTable: "sec_roles",
                        principalColumn: "role_id");
                });

            migrationBuilder.CreateTable(
                name: "jnc_user_roles",
                schema: "stockflow",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    role_id = table.Column<int>(type: "integer", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("jnc_user_roles_pkey", x => new { x.user_id, x.role_id });
                    table.ForeignKey(
                        name: "fk_jnc_user_roles_role_id",
                        column: x => x.role_id,
                        principalSchema: "stockflow",
                        principalTable: "sec_roles",
                        principalColumn: "role_id");
                    table.ForeignKey(
                        name: "fk_jnc_user_roles_user_id",
                        column: x => x.user_id,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "jnc_user_warehouse_access",
                schema: "stockflow",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("jnc_user_warehouse_access_pkey", x => new { x.user_id, x.warehouse_id });
                    table.ForeignKey(
                        name: "fk_jnc_user_warehouse_access_user_id",
                        column: x => x.user_id,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_jnc_user_warehouse_access_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_financial_transactions",
                schema: "stockflow",
                columns: table => new
                {
                    tx_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    partner_id = table.Column<int>(type: "integer", nullable: false),
                    tx_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    payment_method = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    reference_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    reference_id = table.Column<int>(type: "integer", nullable: true),
                    transaction_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_financial_transactions_pkey", x => x.tx_id);
                    table.ForeignKey(
                        name: "fk_trx_financial_transactions_created_by",
                        column: x => x.created_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_financial_transactions_partner_id",
                        column: x => x.partner_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_business_partners",
                        principalColumn: "partner_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_goods_receipts",
                schema: "stockflow",
                columns: table => new
                {
                    gr_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    gr_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    external_po_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    partner_id = table.Column<int>(type: "integer", nullable: false),
                    warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    received_by = table.Column<int>(type: "integer", nullable: false),
                    received_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_goods_receipts_pkey", x => x.gr_id);
                    table.ForeignKey(
                        name: "fk_trx_goods_receipts_partner_id",
                        column: x => x.partner_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_business_partners",
                        principalColumn: "partner_id");
                    table.ForeignKey(
                        name: "fk_trx_goods_receipts_received_by",
                        column: x => x.received_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_goods_receipts_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_inventory_disposals",
                schema: "stockflow",
                columns: table => new
                {
                    disposal_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    disposal_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    processed_by = table.Column<int>(type: "integer", nullable: false),
                    disposal_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_inventory_disposals_pkey", x => x.disposal_id);
                    table.ForeignKey(
                        name: "fk_trx_inventory_disposals_processed_by",
                        column: x => x.processed_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_inventory_disposals_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_orders",
                schema: "stockflow",
                columns: table => new
                {
                    order_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    order_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    partner_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    consolidated_into_order_id = table.Column<int>(type: "integer", nullable: true),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    paid_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    outstanding_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    payment_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: false),
                    order_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_orders_pkey", x => x.order_id);
                    table.ForeignKey(
                        name: "fk_trx_orders_consolidated_into_order_id",
                        column: x => x.consolidated_into_order_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_orders",
                        principalColumn: "order_id");
                    table.ForeignKey(
                        name: "fk_trx_orders_created_by",
                        column: x => x.created_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_orders_partner_id",
                        column: x => x.partner_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_business_partners",
                        principalColumn: "partner_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_stock_transfers",
                schema: "stockflow",
                columns: table => new
                {
                    stock_transfer_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    transfer_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    source_warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    dest_warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    created_by = table.Column<int>(type: "integer", nullable: false),
                    transfer_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_stock_transfers_pkey", x => x.stock_transfer_id);
                    table.ForeignKey(
                        name: "fk_trx_stock_transfers_created_by",
                        column: x => x.created_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_stock_transfers_dest_warehouse_id",
                        column: x => x.dest_warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                    table.ForeignKey(
                        name: "fk_trx_stock_transfers_source_warehouse_id",
                        column: x => x.source_warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_stocktakes",
                schema: "stockflow",
                columns: table => new
                {
                    stocktake_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    stocktake_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    conducted_by = table.Column<int>(type: "integer", nullable: false),
                    stocktake_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_stocktakes_pkey", x => x.stocktake_id);
                    table.ForeignKey(
                        name: "fk_trx_stocktakes_conducted_by",
                        column: x => x.conducted_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_stocktakes_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "mst_boms",
                schema: "stockflow",
                columns: table => new
                {
                    bom_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    bom_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("mst_boms_pkey", x => x.bom_id);
                    table.ForeignKey(
                        name: "fk_mst_boms_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                });

            migrationBuilder.CreateTable(
                name: "mst_inventory_lots",
                schema: "stockflow",
                columns: table => new
                {
                    lot_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    lot_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    mfg_date = table.Column<DateOnly>(type: "date", nullable: true),
                    expiry_date = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("mst_inventory_lots_pkey", x => x.lot_id);
                    table.ForeignKey(
                        name: "fk_mst_inventory_lots_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                });

            migrationBuilder.CreateTable(
                name: "mst_product_images",
                schema: "stockflow",
                columns: table => new
                {
                    image_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    image_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_primary = table.Column<bool>(type: "boolean", nullable: true),
                    display_order = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("mst_product_images_pkey", x => x.image_id);
                    table.ForeignKey(
                        name: "fk_mst_product_images_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                });

            migrationBuilder.CreateTable(
                name: "mst_unit_conversions",
                schema: "stockflow",
                columns: table => new
                {
                    conversion_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    product_id = table.Column<int>(type: "integer", nullable: true),
                    from_unit_id = table.Column<int>(type: "integer", nullable: false),
                    to_unit_id = table.Column<int>(type: "integer", nullable: false),
                    conversion_factor = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("mst_unit_conversions_pkey", x => x.conversion_id);
                    table.ForeignKey(
                        name: "fk_mst_unit_conversions_from_unit_id",
                        column: x => x.from_unit_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_units",
                        principalColumn: "unit_id");
                    table.ForeignKey(
                        name: "fk_mst_unit_conversions_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_mst_unit_conversions_to_unit_id",
                        column: x => x.to_unit_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_units",
                        principalColumn: "unit_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_inbound_costs",
                schema: "stockflow",
                columns: table => new
                {
                    inbound_cost_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    gr_id = table.Column<int>(type: "integer", nullable: false),
                    cost_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    allocated_by = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_inbound_costs_pkey", x => x.inbound_cost_id);
                    table.ForeignKey(
                        name: "fk_trx_inbound_costs_allocated_by",
                        column: x => x.allocated_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_inbound_costs_gr_id",
                        column: x => x.gr_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_goods_receipts",
                        principalColumn: "gr_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_order_items",
                schema: "stockflow",
                columns: table => new
                {
                    order_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    order_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    unit_id = table.Column<int>(type: "integer", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_order_items_pkey", x => x.order_item_id);
                    table.ForeignKey(
                        name: "fk_dtl_order_items_order_id",
                        column: x => x.order_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_orders",
                        principalColumn: "order_id");
                    table.ForeignKey(
                        name: "fk_dtl_order_items_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_dtl_order_items_unit_id",
                        column: x => x.unit_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_units",
                        principalColumn: "unit_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_credit_limit_requests",
                schema: "stockflow",
                columns: table => new
                {
                    request_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    partner_id = table.Column<int>(type: "integer", nullable: false),
                    sales_order_id = table.Column<int>(type: "integer", nullable: true),
                    requested_by = table.Column<int>(type: "integer", nullable: false),
                    current_limit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    requested_limit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    approved_by = table.Column<int>(type: "integer", nullable: true),
                    request_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    approval_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    approval_notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_credit_limit_requests_pkey", x => x.request_id);
                    table.ForeignKey(
                        name: "fk_trx_credit_limit_requests_approved_by",
                        column: x => x.approved_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_credit_limit_requests_partner_id",
                        column: x => x.partner_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_business_partners",
                        principalColumn: "partner_id");
                    table.ForeignKey(
                        name: "fk_trx_credit_limit_requests_requested_by",
                        column: x => x.requested_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_credit_limit_requests_sales_order_id",
                        column: x => x.sales_order_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_orders",
                        principalColumn: "order_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_return_requests",
                schema: "stockflow",
                columns: table => new
                {
                    return_request_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    return_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    partner_id = table.Column<int>(type: "integer", nullable: false),
                    sales_order_id = table.Column<int>(type: "integer", nullable: false),
                    created_by = table.Column<int>(type: "integer", nullable: false),
                    request_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_return_requests_pkey", x => x.return_request_id);
                    table.ForeignKey(
                        name: "fk_trx_return_requests_created_by",
                        column: x => x.created_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_return_requests_partner_id",
                        column: x => x.partner_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_business_partners",
                        principalColumn: "partner_id");
                    table.ForeignKey(
                        name: "fk_trx_return_requests_sales_order_id",
                        column: x => x.sales_order_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_orders",
                        principalColumn: "order_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_bom_items",
                schema: "stockflow",
                columns: table => new
                {
                    bom_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    bom_id = table.Column<int>(type: "integer", nullable: false),
                    material_id = table.Column<int>(type: "integer", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    unit_id = table.Column<int>(type: "integer", nullable: false),
                    wastage_rate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_bom_items_pkey", x => x.bom_item_id);
                    table.ForeignKey(
                        name: "fk_dtl_bom_items_bom_id",
                        column: x => x.bom_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_boms",
                        principalColumn: "bom_id");
                    table.ForeignKey(
                        name: "fk_dtl_bom_items_material_id",
                        column: x => x.material_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_dtl_bom_items_unit_id",
                        column: x => x.unit_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_units",
                        principalColumn: "unit_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_production_orders",
                schema: "stockflow",
                columns: table => new
                {
                    production_order_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    production_order_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    bom_id = table.Column<int>(type: "integer", nullable: false),
                    planned_quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    actual_quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: false),
                    assigned_to = table.Column<int>(type: "integer", nullable: true),
                    start_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    end_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_production_orders_pkey", x => x.production_order_id);
                    table.ForeignKey(
                        name: "fk_trx_production_orders_assigned_to",
                        column: x => x.assigned_to,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_production_orders_bom_id",
                        column: x => x.bom_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_boms",
                        principalColumn: "bom_id");
                    table.ForeignKey(
                        name: "fk_trx_production_orders_created_by",
                        column: x => x.created_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_production_orders_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_goods_receipt_items",
                schema: "stockflow",
                columns: table => new
                {
                    gr_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    gr_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    ordered_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    received_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    accepted_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    defective_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    damaged_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    shortage_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    unit_landed_cost = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    location_id = table.Column<int>(type: "integer", nullable: true),
                    lot_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_goods_receipt_items_pkey", x => x.gr_item_id);
                    table.ForeignKey(
                        name: "fk_dtl_goods_receipt_items_gr_id",
                        column: x => x.gr_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_goods_receipts",
                        principalColumn: "gr_id");
                    table.ForeignKey(
                        name: "fk_dtl_goods_receipt_items_location_id",
                        column: x => x.location_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouse_locations",
                        principalColumn: "location_id");
                    table.ForeignKey(
                        name: "fk_dtl_goods_receipt_items_lot_id",
                        column: x => x.lot_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_inventory_lots",
                        principalColumn: "lot_id");
                    table.ForeignKey(
                        name: "fk_dtl_goods_receipt_items_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_inventory_disposal_items",
                schema: "stockflow",
                columns: table => new
                {
                    disposal_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    disposal_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    location_id = table.Column<int>(type: "integer", nullable: true),
                    lot_id = table.Column<int>(type: "integer", nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    reason = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_inventory_disposal_items_pkey", x => x.disposal_item_id);
                    table.ForeignKey(
                        name: "fk_dtl_inventory_disposal_items_disposal_id",
                        column: x => x.disposal_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_inventory_disposals",
                        principalColumn: "disposal_id");
                    table.ForeignKey(
                        name: "fk_dtl_inventory_disposal_items_location_id",
                        column: x => x.location_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouse_locations",
                        principalColumn: "location_id");
                    table.ForeignKey(
                        name: "fk_dtl_inventory_disposal_items_lot_id",
                        column: x => x.lot_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_inventory_lots",
                        principalColumn: "lot_id");
                    table.ForeignKey(
                        name: "fk_dtl_inventory_disposal_items_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_stock_transfer_items",
                schema: "stockflow",
                columns: table => new
                {
                    transfer_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    stock_transfer_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    lot_id = table.Column<int>(type: "integer", nullable: true),
                    source_location_id = table.Column<int>(type: "integer", nullable: true),
                    dest_location_id = table.Column<int>(type: "integer", nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    issued_quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    received_quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_stock_transfer_items_pkey", x => x.transfer_item_id);
                    table.ForeignKey(
                        name: "fk_dtl_stock_transfer_items_dest_location_id",
                        column: x => x.dest_location_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouse_locations",
                        principalColumn: "location_id");
                    table.ForeignKey(
                        name: "fk_dtl_stock_transfer_items_lot_id",
                        column: x => x.lot_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_inventory_lots",
                        principalColumn: "lot_id");
                    table.ForeignKey(
                        name: "fk_dtl_stock_transfer_items_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_dtl_stock_transfer_items_source_location_id",
                        column: x => x.source_location_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouse_locations",
                        principalColumn: "location_id");
                    table.ForeignKey(
                        name: "fk_dtl_stock_transfer_items_stock_transfer_id",
                        column: x => x.stock_transfer_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_stock_transfers",
                        principalColumn: "stock_transfer_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_stocktake_items",
                schema: "stockflow",
                columns: table => new
                {
                    stocktake_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    stocktake_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    location_id = table.Column<int>(type: "integer", nullable: true),
                    lot_id = table.Column<int>(type: "integer", nullable: true),
                    system_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    actual_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    discrepancy = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    discrepancy_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    adjustment_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    recorded_by = table.Column<int>(type: "integer", nullable: true),
                    approved_by = table.Column<int>(type: "integer", nullable: true),
                    approval_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_stocktake_items_pkey", x => x.stocktake_item_id);
                    table.ForeignKey(
                        name: "fk_dtl_stocktake_items_approved_by",
                        column: x => x.approved_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_dtl_stocktake_items_location_id",
                        column: x => x.location_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouse_locations",
                        principalColumn: "location_id");
                    table.ForeignKey(
                        name: "fk_dtl_stocktake_items_lot_id",
                        column: x => x.lot_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_inventory_lots",
                        principalColumn: "lot_id");
                    table.ForeignKey(
                        name: "fk_dtl_stocktake_items_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_dtl_stocktake_items_recorded_by",
                        column: x => x.recorded_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_dtl_stocktake_items_stocktake_id",
                        column: x => x.stocktake_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_stocktakes",
                        principalColumn: "stocktake_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_inventory_balances",
                schema: "stockflow",
                columns: table => new
                {
                    inventory_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    location_id = table.Column<int>(type: "integer", nullable: true),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    lot_id = table.Column<int>(type: "integer", nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    unit_cost = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    last_updated = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_inventory_balances_pkey", x => x.inventory_id);
                    table.ForeignKey(
                        name: "fk_trx_inventory_balances_location_id",
                        column: x => x.location_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouse_locations",
                        principalColumn: "location_id");
                    table.ForeignKey(
                        name: "fk_trx_inventory_balances_lot_id",
                        column: x => x.lot_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_inventory_lots",
                        principalColumn: "lot_id");
                    table.ForeignKey(
                        name: "fk_trx_inventory_balances_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_trx_inventory_balances_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_inventory_transactions",
                schema: "stockflow",
                columns: table => new
                {
                    transaction_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    location_id = table.Column<int>(type: "integer", nullable: true),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    lot_id = table.Column<int>(type: "integer", nullable: true),
                    transaction_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    reference_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    reference_id = table.Column<int>(type: "integer", nullable: true),
                    transaction_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_inventory_transactions_pkey", x => x.transaction_id);
                    table.ForeignKey(
                        name: "fk_trx_inventory_transactions_created_by",
                        column: x => x.created_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_inventory_transactions_location_id",
                        column: x => x.location_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouse_locations",
                        principalColumn: "location_id");
                    table.ForeignKey(
                        name: "fk_trx_inventory_transactions_lot_id",
                        column: x => x.lot_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_inventory_lots",
                        principalColumn: "lot_id");
                    table.ForeignKey(
                        name: "fk_trx_inventory_transactions_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_trx_inventory_transactions_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_return_request_items",
                schema: "stockflow",
                columns: table => new
                {
                    return_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    return_request_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    order_item_id = table.Column<int>(type: "integer", nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    condition = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    notes = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_return_request_items_pkey", x => x.return_item_id);
                    table.ForeignKey(
                        name: "fk_dtl_return_request_items_order_item_id",
                        column: x => x.order_item_id,
                        principalSchema: "stockflow",
                        principalTable: "dtl_order_items",
                        principalColumn: "order_item_id");
                    table.ForeignKey(
                        name: "fk_dtl_return_request_items_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_dtl_return_request_items_return_request_id",
                        column: x => x.return_request_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_return_requests",
                        principalColumn: "return_request_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_production_material_requirements",
                schema: "stockflow",
                columns: table => new
                {
                    requirement_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    production_order_id = table.Column<int>(type: "integer", nullable: false),
                    material_id = table.Column<int>(type: "integer", nullable: false),
                    required_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    issued_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    shortage_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    unit_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_production_material_requirements_pkey", x => x.requirement_id);
                    table.ForeignKey(
                        name: "fk_trx_production_material_requirements_material_id",
                        column: x => x.material_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_trx_production_material_requirements_production_order_id",
                        column: x => x.production_order_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_production_orders",
                        principalColumn: "production_order_id");
                    table.ForeignKey(
                        name: "fk_trx_production_material_requirements_unit_id",
                        column: x => x.unit_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_units",
                        principalColumn: "unit_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_production_reports",
                schema: "stockflow",
                columns: table => new
                {
                    report_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    production_order_id = table.Column<int>(type: "integer", nullable: false),
                    reported_by = table.Column<int>(type: "integer", nullable: false),
                    batch_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    produced_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    defect_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    wastage_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    report_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_production_reports_pkey", x => x.report_id);
                    table.ForeignKey(
                        name: "fk_trx_production_reports_production_order_id",
                        column: x => x.production_order_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_production_orders",
                        principalColumn: "production_order_id");
                    table.ForeignKey(
                        name: "fk_trx_production_reports_reported_by",
                        column: x => x.reported_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_stock_issues",
                schema: "stockflow",
                columns: table => new
                {
                    stock_issue_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    issue_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    issue_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    sales_order_id = table.Column<int>(type: "integer", nullable: true),
                    production_order_id = table.Column<int>(type: "integer", nullable: true),
                    warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    requested_by = table.Column<int>(type: "integer", nullable: false),
                    processed_by = table.Column<int>(type: "integer", nullable: true),
                    requested_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    processed_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    is_supplementary = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_stock_issues_pkey", x => x.stock_issue_id);
                    table.ForeignKey(
                        name: "fk_trx_stock_issues_processed_by",
                        column: x => x.processed_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_stock_issues_production_order_id",
                        column: x => x.production_order_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_production_orders",
                        principalColumn: "production_order_id");
                    table.ForeignKey(
                        name: "fk_trx_stock_issues_requested_by",
                        column: x => x.requested_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_stock_issues_sales_order_id",
                        column: x => x.sales_order_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_orders",
                        principalColumn: "order_id");
                    table.ForeignKey(
                        name: "fk_trx_stock_issues_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_inbound_cost_allocations",
                schema: "stockflow",
                columns: table => new
                {
                    allocation_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    inbound_cost_id = table.Column<int>(type: "integer", nullable: false),
                    gr_item_id = table.Column<int>(type: "integer", nullable: false),
                    allocated_amount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_inbound_cost_allocations_pkey", x => x.allocation_id);
                    table.ForeignKey(
                        name: "fk_dtl_inbound_cost_allocations_gr_item_id",
                        column: x => x.gr_item_id,
                        principalSchema: "stockflow",
                        principalTable: "dtl_goods_receipt_items",
                        principalColumn: "gr_item_id");
                    table.ForeignKey(
                        name: "fk_dtl_inbound_cost_allocations_inbound_cost_id",
                        column: x => x.inbound_cost_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_inbound_costs",
                        principalColumn: "inbound_cost_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_return_processing",
                schema: "stockflow",
                columns: table => new
                {
                    processing_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    return_item_id = table.Column<int>(type: "integer", nullable: false),
                    category = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    warehouse_id = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    processed_by = table.Column<int>(type: "integer", nullable: false),
                    process_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_return_processing_pkey", x => x.processing_id);
                    table.ForeignKey(
                        name: "fk_trx_return_processing_processed_by",
                        column: x => x.processed_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_return_processing_return_item_id",
                        column: x => x.return_item_id,
                        principalSchema: "stockflow",
                        principalTable: "dtl_return_request_items",
                        principalColumn: "return_item_id");
                    table.ForeignKey(
                        name: "fk_trx_return_processing_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_finished_goods_receipts",
                schema: "stockflow",
                columns: table => new
                {
                    fgr_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fgr_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    production_order_id = table.Column<int>(type: "integer", nullable: false),
                    report_id = table.Column<int>(type: "integer", nullable: false),
                    warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    location_id = table.Column<int>(type: "integer", nullable: true),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    lot_id = table.Column<int>(type: "integer", nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    received_by = table.Column<int>(type: "integer", nullable: false),
                    received_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_finished_goods_receipts_pkey", x => x.fgr_id);
                    table.ForeignKey(
                        name: "fk_trx_finished_goods_receipts_location_id",
                        column: x => x.location_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouse_locations",
                        principalColumn: "location_id");
                    table.ForeignKey(
                        name: "fk_trx_finished_goods_receipts_lot_id",
                        column: x => x.lot_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_inventory_lots",
                        principalColumn: "lot_id");
                    table.ForeignKey(
                        name: "fk_trx_finished_goods_receipts_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_trx_finished_goods_receipts_production_order_id",
                        column: x => x.production_order_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_production_orders",
                        principalColumn: "production_order_id");
                    table.ForeignKey(
                        name: "fk_trx_finished_goods_receipts_received_by",
                        column: x => x.received_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_finished_goods_receipts_report_id",
                        column: x => x.report_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_production_reports",
                        principalColumn: "report_id");
                    table.ForeignKey(
                        name: "fk_trx_finished_goods_receipts_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_stock_issue_items",
                schema: "stockflow",
                columns: table => new
                {
                    si_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    stock_issue_id = table.Column<int>(type: "integer", nullable: false),
                    order_item_id = table.Column<int>(type: "integer", nullable: true),
                    material_requirement_id = table.Column<int>(type: "integer", nullable: true),
                    lot_id = table.Column<int>(type: "integer", nullable: true),
                    requested_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    actual_issued_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_stock_issue_items_pkey", x => x.si_item_id);
                    table.ForeignKey(
                        name: "fk_dtl_stock_issue_items_lot_id",
                        column: x => x.lot_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_inventory_lots",
                        principalColumn: "lot_id");
                    table.ForeignKey(
                        name: "fk_dtl_stock_issue_items_material_requirement_id",
                        column: x => x.material_requirement_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_production_material_requirements",
                        principalColumn: "requirement_id");
                    table.ForeignKey(
                        name: "fk_dtl_stock_issue_items_order_item_id",
                        column: x => x.order_item_id,
                        principalSchema: "stockflow",
                        principalTable: "dtl_order_items",
                        principalColumn: "order_item_id");
                    table.ForeignKey(
                        name: "fk_dtl_stock_issue_items_stock_issue_id",
                        column: x => x.stock_issue_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_stock_issues",
                        principalColumn: "stock_issue_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_dtl_bom_items_bom_id",
                schema: "stockflow",
                table: "dtl_bom_items",
                column: "bom_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_bom_items_material_id",
                schema: "stockflow",
                table: "dtl_bom_items",
                column: "material_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_bom_items_unit_id",
                schema: "stockflow",
                table: "dtl_bom_items",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_goods_receipt_items_gr_id",
                schema: "stockflow",
                table: "dtl_goods_receipt_items",
                column: "gr_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_goods_receipt_items_location_id",
                schema: "stockflow",
                table: "dtl_goods_receipt_items",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_goods_receipt_items_lot_id",
                schema: "stockflow",
                table: "dtl_goods_receipt_items",
                column: "lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_goods_receipt_items_product_id",
                schema: "stockflow",
                table: "dtl_goods_receipt_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_inbound_cost_allocations_gr_item_id",
                schema: "stockflow",
                table: "dtl_inbound_cost_allocations",
                column: "gr_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_inbound_cost_allocations_inbound_cost_id",
                schema: "stockflow",
                table: "dtl_inbound_cost_allocations",
                column: "inbound_cost_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_inventory_disposal_items_disposal_id",
                schema: "stockflow",
                table: "dtl_inventory_disposal_items",
                column: "disposal_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_inventory_disposal_items_location_id",
                schema: "stockflow",
                table: "dtl_inventory_disposal_items",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_inventory_disposal_items_lot_id",
                schema: "stockflow",
                table: "dtl_inventory_disposal_items",
                column: "lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_inventory_disposal_items_product_id",
                schema: "stockflow",
                table: "dtl_inventory_disposal_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_order_items_order_id",
                schema: "stockflow",
                table: "dtl_order_items",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_order_items_product_id",
                schema: "stockflow",
                table: "dtl_order_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_order_items_unit_id",
                schema: "stockflow",
                table: "dtl_order_items",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_return_request_items_order_item_id",
                schema: "stockflow",
                table: "dtl_return_request_items",
                column: "order_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_return_request_items_product_id",
                schema: "stockflow",
                table: "dtl_return_request_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_return_request_items_return_request_id",
                schema: "stockflow",
                table: "dtl_return_request_items",
                column: "return_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stock_issue_items_lot_id",
                schema: "stockflow",
                table: "dtl_stock_issue_items",
                column: "lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stock_issue_items_material_requirement_id",
                schema: "stockflow",
                table: "dtl_stock_issue_items",
                column: "material_requirement_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stock_issue_items_order_item_id",
                schema: "stockflow",
                table: "dtl_stock_issue_items",
                column: "order_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stock_issue_items_stock_issue_id",
                schema: "stockflow",
                table: "dtl_stock_issue_items",
                column: "stock_issue_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stock_transfer_items_dest_location_id",
                schema: "stockflow",
                table: "dtl_stock_transfer_items",
                column: "dest_location_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stock_transfer_items_lot_id",
                schema: "stockflow",
                table: "dtl_stock_transfer_items",
                column: "lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stock_transfer_items_product_id",
                schema: "stockflow",
                table: "dtl_stock_transfer_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stock_transfer_items_source_location_id",
                schema: "stockflow",
                table: "dtl_stock_transfer_items",
                column: "source_location_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stock_transfer_items_stock_transfer_id",
                schema: "stockflow",
                table: "dtl_stock_transfer_items",
                column: "stock_transfer_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stocktake_items_approved_by",
                schema: "stockflow",
                table: "dtl_stocktake_items",
                column: "approved_by");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stocktake_items_location_id",
                schema: "stockflow",
                table: "dtl_stocktake_items",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stocktake_items_lot_id",
                schema: "stockflow",
                table: "dtl_stocktake_items",
                column: "lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stocktake_items_product_id",
                schema: "stockflow",
                table: "dtl_stocktake_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stocktake_items_recorded_by",
                schema: "stockflow",
                table: "dtl_stocktake_items",
                column: "recorded_by");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stocktake_items_stocktake_id",
                schema: "stockflow",
                table: "dtl_stocktake_items",
                column: "stocktake_id");

            migrationBuilder.CreateIndex(
                name: "IX_jnc_role_permissions_permission_id",
                schema: "stockflow",
                table: "jnc_role_permissions",
                column: "permission_id");

            migrationBuilder.CreateIndex(
                name: "IX_jnc_user_roles_role_id",
                schema: "stockflow",
                table: "jnc_user_roles",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_jnc_user_warehouse_access_warehouse_id",
                schema: "stockflow",
                table: "jnc_user_warehouse_access",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_mst_boms_product_id",
                schema: "stockflow",
                table: "mst_boms",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "uq_mst_business_partners_1",
                schema: "stockflow",
                table: "mst_business_partners",
                column: "partner_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_mst_inventory_lots_product_id",
                schema: "stockflow",
                table: "mst_inventory_lots",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_mst_product_images_product_id",
                schema: "stockflow",
                table: "mst_product_images",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_mst_products_base_unit_id",
                schema: "stockflow",
                table: "mst_products",
                column: "base_unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_mst_products_category_id",
                schema: "stockflow",
                table: "mst_products",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "uq_mst_products_1",
                schema: "stockflow",
                table: "mst_products",
                column: "product_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_mst_unit_conversions_from_unit_id",
                schema: "stockflow",
                table: "mst_unit_conversions",
                column: "from_unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_mst_unit_conversions_product_id",
                schema: "stockflow",
                table: "mst_unit_conversions",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_mst_unit_conversions_to_unit_id",
                schema: "stockflow",
                table: "mst_unit_conversions",
                column: "to_unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_mst_warehouse_locations_warehouse_id",
                schema: "stockflow",
                table: "mst_warehouse_locations",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "uq_mst_warehouses_1",
                schema: "stockflow",
                table: "mst_warehouses",
                column: "warehouse_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_sec_permissions_1",
                schema: "stockflow",
                table: "sec_permissions",
                column: "permission_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_sec_roles_1",
                schema: "stockflow",
                table: "sec_roles",
                column: "role_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_sec_users_1",
                schema: "stockflow",
                table: "sec_users",
                column: "username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_credit_limit_requests_approved_by",
                schema: "stockflow",
                table: "trx_credit_limit_requests",
                column: "approved_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_credit_limit_requests_partner_id",
                schema: "stockflow",
                table: "trx_credit_limit_requests",
                column: "partner_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_credit_limit_requests_requested_by",
                schema: "stockflow",
                table: "trx_credit_limit_requests",
                column: "requested_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_credit_limit_requests_sales_order_id",
                schema: "stockflow",
                table: "trx_credit_limit_requests",
                column: "sales_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_financial_transactions_created_by",
                schema: "stockflow",
                table: "trx_financial_transactions",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_financial_transactions_partner_id",
                schema: "stockflow",
                table: "trx_financial_transactions",
                column: "partner_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_finished_goods_receipts_location_id",
                schema: "stockflow",
                table: "trx_finished_goods_receipts",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_finished_goods_receipts_lot_id",
                schema: "stockflow",
                table: "trx_finished_goods_receipts",
                column: "lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_finished_goods_receipts_product_id",
                schema: "stockflow",
                table: "trx_finished_goods_receipts",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_finished_goods_receipts_production_order_id",
                schema: "stockflow",
                table: "trx_finished_goods_receipts",
                column: "production_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_finished_goods_receipts_received_by",
                schema: "stockflow",
                table: "trx_finished_goods_receipts",
                column: "received_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_finished_goods_receipts_warehouse_id",
                schema: "stockflow",
                table: "trx_finished_goods_receipts",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "uq_trx_finished_goods_receipts_1",
                schema: "stockflow",
                table: "trx_finished_goods_receipts",
                column: "fgr_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_trx_finished_goods_receipts_2",
                schema: "stockflow",
                table: "trx_finished_goods_receipts",
                column: "report_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_goods_receipts_partner_id",
                schema: "stockflow",
                table: "trx_goods_receipts",
                column: "partner_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_goods_receipts_received_by",
                schema: "stockflow",
                table: "trx_goods_receipts",
                column: "received_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_goods_receipts_warehouse_id",
                schema: "stockflow",
                table: "trx_goods_receipts",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "uq_trx_goods_receipts_1",
                schema: "stockflow",
                table: "trx_goods_receipts",
                column: "gr_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_inbound_costs_allocated_by",
                schema: "stockflow",
                table: "trx_inbound_costs",
                column: "allocated_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_inbound_costs_gr_id",
                schema: "stockflow",
                table: "trx_inbound_costs",
                column: "gr_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_inventory_balances_location_id",
                schema: "stockflow",
                table: "trx_inventory_balances",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_inventory_balances_lot_id",
                schema: "stockflow",
                table: "trx_inventory_balances",
                column: "lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_inventory_balances_product_id",
                schema: "stockflow",
                table: "trx_inventory_balances",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "uq_trx_inventory_balances_location_product_lot",
                schema: "stockflow",
                table: "trx_inventory_balances",
                columns: new[] { "warehouse_id", "location_id", "product_id", "lot_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_inventory_disposals_processed_by",
                schema: "stockflow",
                table: "trx_inventory_disposals",
                column: "processed_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_inventory_disposals_warehouse_id",
                schema: "stockflow",
                table: "trx_inventory_disposals",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "uq_trx_inventory_disposals_1",
                schema: "stockflow",
                table: "trx_inventory_disposals",
                column: "disposal_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_inventory_transactions_created_by",
                schema: "stockflow",
                table: "trx_inventory_transactions",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_inventory_transactions_location_id",
                schema: "stockflow",
                table: "trx_inventory_transactions",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_inventory_transactions_lot_id",
                schema: "stockflow",
                table: "trx_inventory_transactions",
                column: "lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_inventory_transactions_product_id",
                schema: "stockflow",
                table: "trx_inventory_transactions",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_inventory_transactions_warehouse_id",
                schema: "stockflow",
                table: "trx_inventory_transactions",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_orders_consolidated_into_order_id",
                schema: "stockflow",
                table: "trx_orders",
                column: "consolidated_into_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_orders_created_by",
                schema: "stockflow",
                table: "trx_orders",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_orders_partner_id",
                schema: "stockflow",
                table: "trx_orders",
                column: "partner_id");

            migrationBuilder.CreateIndex(
                name: "uq_trx_orders_1",
                schema: "stockflow",
                table: "trx_orders",
                column: "order_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_material_requirements_material_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "material_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_material_requirements_production_order_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "production_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_material_requirements_unit_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_orders_assigned_to",
                schema: "stockflow",
                table: "trx_production_orders",
                column: "assigned_to");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_orders_bom_id",
                schema: "stockflow",
                table: "trx_production_orders",
                column: "bom_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_orders_created_by",
                schema: "stockflow",
                table: "trx_production_orders",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_orders_product_id",
                schema: "stockflow",
                table: "trx_production_orders",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "uq_trx_production_orders_1",
                schema: "stockflow",
                table: "trx_production_orders",
                column: "production_order_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_reports_production_order_id",
                schema: "stockflow",
                table: "trx_production_reports",
                column: "production_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_reports_reported_by",
                schema: "stockflow",
                table: "trx_production_reports",
                column: "reported_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_return_processing_processed_by",
                schema: "stockflow",
                table: "trx_return_processing",
                column: "processed_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_return_processing_return_item_id",
                schema: "stockflow",
                table: "trx_return_processing",
                column: "return_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_return_processing_warehouse_id",
                schema: "stockflow",
                table: "trx_return_processing",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_return_requests_created_by",
                schema: "stockflow",
                table: "trx_return_requests",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_return_requests_partner_id",
                schema: "stockflow",
                table: "trx_return_requests",
                column: "partner_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_return_requests_sales_order_id",
                schema: "stockflow",
                table: "trx_return_requests",
                column: "sales_order_id");

            migrationBuilder.CreateIndex(
                name: "uq_trx_return_requests_1",
                schema: "stockflow",
                table: "trx_return_requests",
                column: "return_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_stock_issues_processed_by",
                schema: "stockflow",
                table: "trx_stock_issues",
                column: "processed_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_stock_issues_production_order_id",
                schema: "stockflow",
                table: "trx_stock_issues",
                column: "production_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_stock_issues_requested_by",
                schema: "stockflow",
                table: "trx_stock_issues",
                column: "requested_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_stock_issues_sales_order_id",
                schema: "stockflow",
                table: "trx_stock_issues",
                column: "sales_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_stock_issues_warehouse_id",
                schema: "stockflow",
                table: "trx_stock_issues",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "uq_trx_stock_issues_1",
                schema: "stockflow",
                table: "trx_stock_issues",
                column: "issue_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_stock_transfers_created_by",
                schema: "stockflow",
                table: "trx_stock_transfers",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_stock_transfers_dest_warehouse_id",
                schema: "stockflow",
                table: "trx_stock_transfers",
                column: "dest_warehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_stock_transfers_source_warehouse_id",
                schema: "stockflow",
                table: "trx_stock_transfers",
                column: "source_warehouse_id");

            migrationBuilder.CreateIndex(
                name: "uq_trx_stock_transfers_1",
                schema: "stockflow",
                table: "trx_stock_transfers",
                column: "transfer_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_stocktakes_conducted_by",
                schema: "stockflow",
                table: "trx_stocktakes",
                column: "conducted_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_stocktakes_warehouse_id",
                schema: "stockflow",
                table: "trx_stocktakes",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "uq_trx_stocktakes_1",
                schema: "stockflow",
                table: "trx_stocktakes",
                column: "stocktake_code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "dtl_bom_items",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "dtl_inbound_cost_allocations",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "dtl_inventory_disposal_items",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "dtl_stock_issue_items",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "dtl_stock_transfer_items",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "dtl_stocktake_items",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "jnc_role_permissions",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "jnc_user_roles",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "jnc_user_warehouse_access",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "mst_product_images",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "mst_unit_conversions",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_credit_limit_requests",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_financial_transactions",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_finished_goods_receipts",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_inventory_balances",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_inventory_transactions",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_return_processing",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "dtl_goods_receipt_items",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_inbound_costs",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_inventory_disposals",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_production_material_requirements",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_stock_issues",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_stock_transfers",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_stocktakes",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "sec_permissions",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "sec_roles",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_production_reports",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "dtl_return_request_items",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "mst_warehouse_locations",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "mst_inventory_lots",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_goods_receipts",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_production_orders",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "dtl_order_items",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_return_requests",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "mst_warehouses",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "mst_boms",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_orders",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "mst_products",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "sec_users",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "mst_business_partners",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "mst_units",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "mst_product_categories",
                schema: "stockflow");
        }
    }
}
