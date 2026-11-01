export type OrderCodeRule = 'SEQUENTIAL' | 'DATETIME' | 'RANDOM';

export interface OrderSettings {
  settingId: number;

  // Group A: Đặt hàng
  enableOrderPlacement: boolean;
  allowOrderWhenOutOfStock: boolean;
  allowSellingReservedStock: boolean;
  allowTransferringOrderBranch: boolean;

  // Group B: Bán hàng & POS
  allowNegativeStockSale: boolean;
  enablePrintQuotation: boolean;
  confirmBeforeCompleteOrder: boolean;

  // Group C: Trả hàng
  enableReturnTimeLimit: boolean;
  returnTimeLimitDays: number;

  // Group D: Thời gian giao dịch
  lockTransactionTime: boolean;

  // Group E: Quy tắc sinh mã
  orderCodeRule: OrderCodeRule;
  orderCodePrefix: string;
  bookingCodePrefix: string;
  returnCodePrefix: string;
  transferCodePrefix: string;

  updatedAt?: string;
  updatedBy?: number | null;
  updatedByName?: string | null;
}

export type UpdateOrderSettingsPayload = Omit<
  OrderSettings,
  'settingId' | 'updatedAt' | 'updatedBy' | 'updatedByName'
>;

