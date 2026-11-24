// src/features/products/types/goodsCatalog.ts
// Kiểu dữ liệu Danh mục Hàng hóa (T19 lát 1: chuyển nguyên văn từ screens/GoodsCatalogScreen.tsx).

export interface GoodsVariantItem {
  id: string;
  attributeValue?: string;
  unitName: string;
  conversionRate: number;
  code: string;
  barcode: string;
  costPrice: number;
  salePrice: number;
  stock: number;
}

export interface GoodsUnitConversion {
  name: string;
  /** Số đơn vị cơ bản trong 1 đơn vị này (dùng tính giá, tồn) */
  conversionRate: number;
  isBase: boolean;
  isDirectSale: boolean;
  /** Quy đổi theo đơn vị khác đơn vị cơ bản (VD 1 thùng = 10 túi): tên đơn vị đó, chỉ để hiển thị */
  refUnitName?: string;
  /** Số lượng theo refUnitName (VD 10) */
  refRate?: number;
}

export interface GoodsAttributeDef {
  name: string;
  values: string[];
}

export interface GoodsItem {
  id: string;
  productId?: number;
  code: string;
  name: string;
  category: 'Thành phẩm' | 'Nguyên vật liệu';
  subCategory: string;
  brand?: string;
  uom: string;
  specification: string;
  warehouse: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minSafeStock: number;
  maxSafeStock: number;
  /** MRP: thời gian giao (ngày); null = chưa khai báo */
  leadTimeDays?: number | null;
  standardPrice: number;
  costPrice: number;
  barcode: string;
  status: 'ACTIVE' | 'DISCONTINUED';
  createdAt?: string;
  isStarred?: boolean;
  supplier?: string;
  weight?: number;
  dimensions?: { width: number; length: number; unit: string };
  locationName?: string;
  isDirectSale?: boolean;
  hasRewardPoints?: boolean;
  imageUrl?: string;
  description?: string;
  units?: GoodsUnitConversion[];
  attributes?: GoodsAttributeDef[];
  variants?: GoodsVariantItem[];
  stockByWarehouse: {
    /** Id kho trong DB (ProductWarehouseStockDto.warehouseId) — dùng để ghép đúng kho, không dò theo tên */
    warehouseId?: number;
    warehouseName: string;
    warehouseCode?: string;
    actualStock: number;
    availableStock: number;
    costPrice?: number;
    standardPrice?: number;
    minSafeStock?: number;
    maxSafeStock?: number;
  }[];
  stockCardRecent: {
    date: string;
    docCode: string;
    type: 'NHAP' | 'XUAT' | 'CHUYEN';
    typeName: string;
    qtyChange: number;
    balance: number;
    partnerOrDept: string;
  }[];
}
