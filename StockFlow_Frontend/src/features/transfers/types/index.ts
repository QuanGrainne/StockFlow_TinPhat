// src/features/transfers/types/index.ts
// Các kiểu dữ liệu chuẩn nghiệp vụ Chuyển hàng (Inventory Transfer) theo giao diện KiotViet

export type TransferStatus = 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface TransferRecord {
  id: number;
  code: string;
  transferDate?: string | null;
  receivedDate?: string | null;
  sourceWarehouseId: number;
  sourceWarehouseCode: string;
  sourceWarehouseName: string;
  destWarehouseId: number;
  destWarehouseCode: string;
  destWarehouseName: string;
  createdBy: string;
  receivedBy?: string | null;
  /** Ghi chú của chi nhánh nhận */
  receiveNotes?: string | null;
  status: TransferStatus;
  totalQuantity: number;
  totalReceivedQuantity?: number | null;
  totalAmount: number;
  /** Giá trị nhận = Σ SL nhận × giá chuyển; null khi phiếu chưa nhận */
  totalReceivedAmount?: number | null;
  notes?: string | null;
  isStarred?: boolean;
  isMatched?: boolean | null;
}

export interface TransferItem {
  id?: number;
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  sourceStock: number;
  destStock: number;
  transferQuantity: number;
  receivedQuantity?: number | null;
  transferPrice: number;
  lineTotal: number;
  notes?: string;
  /** Ghi chú dòng hàng của chi nhánh nhận */
  receiveNotes?: string;
}

export interface TransferDetail extends TransferRecord {
  items: TransferItem[];
}

export interface TransferFilterState {
  sourceWarehouseId: number | 'ALL';
  destWarehouseId: number | 'ALL';
  statuses: TransferStatus[];
  matchStatus?: 'ALL' | 'MATCHED' | 'UNMATCHED';
  dateType: 'transfer' | 'received';
  timeRange: string;
  dateFrom?: string;
  dateTo?: string;
  search: string;
}

export interface ProductForTransfer {
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  costPrice: number;
  standardPrice: number;
  sourceStock: number;
  destStock: number;
  imageUrl?: string | null;
}
