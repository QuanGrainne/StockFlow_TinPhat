// src/features/production/types/mrp.ts
// Định nghĩa kiểu dữ liệu cho Hoạch định nhu cầu nguyên vật liệu (MRP)

export interface RunMrpRequest {
  periodEnd: string; // yyyy-MM-dd
  warehouseIds: number[];
  includePendingPlans?: boolean;
}

export interface MrpWarehouseLookup {
  warehouseId: number;
  warehouseName: string;
}

export interface MrpProductLookup {
  productId: number;
  productCode: string;
  productName: string;
}

export interface MrpRunSummary {
  mrpRunId: number;
  runCode: string;
  runAt: string;
  runByName: string;
  periodStart: string;
  periodEnd: string;
  warehouses: MrpWarehouseLookup[];
  includePendingPlans: boolean;
  materialCount: number;
  shortageCount: number;
  lateCount: number;
  productsWithoutBom: MrpProductLookup[];
  isStale: boolean;
  staleReasons: string[];
}

export interface MrpRunListItem {
  mrpRunId: number;
  runCode: string;
  runAt: string;
  runByName: string;
  periodStart: string;
  periodEnd: string;
  warehouseNames: string;
  materialCount: number;
  shortageCount: number;
  lateCount: number;
}

export interface MrpDemandSource {
  type: string; // PLAN | ORDER
  code: string;
  productCode: string;
  quantity: number;
}

export interface MrpDailyRequirement {
  date: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  grossRequirement: number;
  sources: MrpDemandSource[];
}

export interface MrpMonthlyMaterialDemand {
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  quantities: number[];
  total: number;
}

export interface MrpMonthlyDemand {
  buckets: string[];
  materials: MrpMonthlyMaterialDemand[];
}

export interface MrpAffectedRequirement {
  type: string;
  code: string;
  productCode: string;
  neededDate: string;
  shortageQty: number;
}

export interface MrpOtherWarehouseStock {
  warehouseId: number;
  warehouseName: string;
  onHand: number;
}

export interface MrpShortage {
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  firstShortageDate: string | null;
  totalNetRequirement: number;
  isLate: boolean;
  hasLeadTime: boolean;
  onHand: number;
  onOrderWithoutDate: number;
  affected: MrpAffectedRequirement[];
  otherWarehouses: MrpOtherWarehouseStock[];
}

export interface MrpProjectionRow {
  date: string;
  grossRequirement: number;
  scheduledReceipt: number;
  projectedBalance: number;
  netRequirement: number;
  plannedReceipt: number;
  projectedBalanceAfterPlan: number;
  plannedReleaseDate: string | null;
  isLate: boolean;
}

export interface MrpProjection {
  material: MrpProductLookup;
  unitName: string;
  openingBalance: number;
  safetyStock: number;
  leadTimeDays: number | null;
  rows: MrpProjectionRow[];
}

export interface MrpLastSupplier {
  partnerId: number;
  partnerName: string;
}

export interface MrpPurchaseSuggestion {
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  suggestedQty: number;
  suggestedQtyRounded: number;
  requiredReceiptDate: string | null;
  releaseDate: string | null;
  status: 'ON_TIME' | 'LATE' | 'NO_LEAD_TIME' | string;
  lastSupplier: MrpLastSupplier | null;
}
