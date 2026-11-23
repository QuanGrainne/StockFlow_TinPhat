/** Cài đặt giao dịch (GET/PUT /api/settings/orders): chỉ 2 tuỳ chọn, mặc định đều cho phép */
export interface OrderSettings {
  settingId: number;
  /** Cho phép bán hàng vượt tồn kho (bán âm kho) */
  allowNegativeStockSale: boolean;
  /** Cho phép xuất chuyển hàng khi tồn kho xuất không đủ (kho xuất âm) */
  allowNegativeStockTransfer: boolean;

  updatedAt?: string;
  updatedBy?: number | null;
  updatedByName?: string | null;
}

export type UpdateOrderSettingsPayload = Pick<OrderSettings, 'allowNegativeStockSale' | 'allowNegativeStockTransfer'>;
