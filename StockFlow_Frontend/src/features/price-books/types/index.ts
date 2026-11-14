export interface PriceBook {
  priceBookId: number;
  priceBookCode: string | null;
  priceBookName: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  isDefault: boolean;
  formulaBaseType: 'COST' | 'LATEST_PURCHASE' | 'STANDARD' | 'PRICE_BOOK' | null;
  formulaBasePriceBookId: number | null;
  formulaBasePriceBookName: string | null;
  formulaOperator: '+' | '-' | null;
  formulaValue: number | null;
  formulaUnit: 'VND' | 'PERCENT' | string | null;
  allowUnlistedProducts: boolean;
  warnUnlistedProducts: boolean;
  scopeBranchType: 'ALL' | 'SPECIFIC';
  scopeWarehouseIds: number[] | null;
  /** ALL = mọi khách; SPECIFIC = chỉ các khách trong scopeCustomerIds */
  scopeCustomerType: 'ALL' | 'SPECIFIC';
  scopeCustomerIds: number[] | null;
  scopeCustomers: PriceBookCustomerRef[];
  totalItemsCount: number;
  updatedAt: string | null;
}

export interface PriceBookMatrixItem {
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string;
  unitName: string;
  costPrice: number;
  latestPurchasePrice: number;
  stockQuantity: number;
  prices: Record<number, number | null>;
}

export interface PriceBookMatrixResult {
  items: PriceBookMatrixItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface CreatePriceBookPayload {
  priceBookName: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive?: boolean;
  formulaBaseType?: string | null;
  formulaBasePriceBookId?: number | null;
  formulaOperator?: string | null;
  formulaValue?: number | null;
  formulaUnit?: string | null;
  allowUnlistedProducts?: boolean;
  warnUnlistedProducts?: boolean;
  scopeBranchType?: 'ALL' | 'SPECIFIC';
  scopeWarehouseIds?: number[] | null;
  scopeCustomerType?: 'ALL' | 'SPECIFIC';
  scopeCustomerIds?: number[] | null;
  autoApplyFormula?: boolean;
  /** true = giá tự cập nhật theo nguồn; false = chỉ dùng công thức để tính giá rồi bỏ liên kết */
  linkFormula?: boolean;
}

/** Khách hàng trong phạm vi bảng giá (dữ liệu thật từ mst_business_partners) */
export interface PriceBookCustomerRef {
  partnerId: number;
  partnerCode: string | null;
  partnerName: string | null;
  phone: string | null;
}

/** Chi nhánh (kho) từ /api/warehouses */
export interface PriceBookWarehouseOption {
  warehouseId: number;
  code: string;
  name: string;
  status: string;
}

export interface UpdatePriceBookPayload extends CreatePriceBookPayload {
  priceBookId: number;
  recalculateFormula?: boolean;
}

export interface UpdateProductPriceItemPayload {
  productId: number;
  price: number;
}
