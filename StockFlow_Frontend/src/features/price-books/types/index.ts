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
  scopeCustomerType: 'ALL' | 'SPECIFIC';
  scopeCustomerGroupCodes: string[] | null;
  scopeUserType: 'ALL' | 'SPECIFIC';
  scopeUserIds: number[] | null;
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
  scopeCustomerGroupCodes?: string[] | null;
  scopeUserType?: 'ALL' | 'SPECIFIC';
  scopeUserIds?: number[] | null;
  autoApplyFormula?: boolean;
}

export interface UpdatePriceBookPayload extends CreatePriceBookPayload {
  priceBookId: number;
  recalculateFormula?: boolean;
}

export interface UpdateProductPriceItemPayload {
  productId: number;
  price: number;
}
