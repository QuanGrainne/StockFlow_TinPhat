// src/types/index.ts
// Các kiểu dữ liệu cốt lõi cho hệ thống StockFlow OIMS (Phân quyền Sales & Manager)

export type UserRole = 'SALES' | 'MANAGER' | 'ADMIN' | 'WAREHOUSE' | 'PRODUCTION' | string;

export interface UserProfile {
  id: string;
  name: string;
  code: string;
  email: string;
  role: UserRole;
  avatar?: string;
  assignedWarehouses: string[];
}

// ─── Master Data Types ────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  code: string;           // Vd: KH-AP01, KH-HG03
  name: string;
  phone: string;
  address: string;
  currentDebt: number;    // Nợ hiện tại (VND)
  creditLimit: number;    // Hạn mức nợ tối đa (VND)
  paymentTermDays: number;// Thời hạn công nợ (ngày: 15, 30, 45)
  status: 'ACTIVE' | 'LOCKED';
}

export interface ProductVariant {
  id?: string;
  attributeValue?: string;
  unitName: string;
  conversionRate: number;
  code: string;
  barcode: string;
  costPrice: number;
  salePrice: number;
  stock: number;
}

export interface ProductUnitConversion {
  name: string;
  conversionRate: number;
  isBase: boolean;
  isDirectSale: boolean;
}

export interface ProductAttributeDef {
  name: string;
  values: string[];
}

export interface Product {
  id: string;
  code: string;           // Vd: TP-SP01, TP-KE001
  name: string;
  type: 'FINISHED' | 'RAW_MATERIAL' | 'SEMI_FINISHED';
  uom: string;            // Đơn vị tính: Tấm, Tuýp, Cây, Cuộn, Kg, Thanh
  standardPrice: number;  // Giá tiêu chuẩn (VND)
  costPrice: number;      // Giá vốn (VND)
  stockQuantity: number;  // Tồn kho hiện tại
  barcode?: string;
  brand?: string;
  minSafeStock?: number;
  maxSafeStock?: number;
  weight?: number;
  dimensions?: { width: number; length: number; unit: string };
  locationName?: string;
  isDirectSale?: boolean;
  hasRewardPoints?: boolean;
  imageUrl?: string;
  description?: string;
  units?: ProductUnitConversion[];
  attributes?: ProductAttributeDef[];
  variants?: ProductVariant[];
  createdAt?: string;
  isStarred?: boolean;
}

// ─── Sales Types ─────────────────────────────────────────────────────────────
export type OrderStatus = 'DRAFT' | 'PENDING' | 'CONSOLIDATED' | 'DISPATCHED' | 'CANCELLED';
export type OrderChannel = 'Zalo' | 'Điện thoại' | 'Tại quầy';

export interface OrderItem {
  productId: string;
  productCode: string;
  productName: string;
  uom: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  subtotal: number;
}

export interface PendingOrder {
  id: string;
  orderCode: string;      // Vd: DC-2026-001
  channel: OrderChannel;  // 'Zalo' | 'Điện thoại' | 'Tại quầy'
  customerId: string;
  customerCode: string;   // KH-AP01
  customerName: string;
  customerPhone: string;
  orderDate: string;
  createdAtTime: string;  // Vd: 18/10/2026 08:30
  deliveryDate: string;
  items: OrderItem[];
  netAmount: number;      // Giá trị thuần (NET)
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: OrderStatus;
  deliveryNotes?: string;
  notes?: string;
  createdBy: string;
}

export interface ConsolidateOrdersPayload {
  customerId: string;
  selectedOrderIds: string[];
  shippingAddress: string;
  notes?: string;
}

export interface CreditLimitRequest {
  id: string;
  requestCode: string;    // Vd: CLR-2026-001
  customerId: string;
  customerName: string;
  currentDebt: number;
  currentCreditLimit: number;
  requestedCreditLimit: number;
  pendingOrderCode: string;
  expectedNewDebt: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface ReturnClaim {
  id: string;
  claimCode: string;          // Vd: YCTH-2026-001
  pxkCode: string;            // Vd: PXK-2026-095
  customerId: string;
  customerCode: string;       // Vd: KH-AP01
  customerName: string;
  customerPhone: string;
  productId: string;
  productCode: string;        // Vd: TP-SP01
  productName: string;
  returnQty: number;          // Vd: 6 Tấm
  uom: string;
  reason: 'Vận chuyển trầy xước' | 'Giao sai mã hàng' | 'Lỗi kỹ thuật sản phẩm' | 'Thừa vật tư công trình';
  physicalCondition: string;  // Vd: Mẻ góc hèm khóa và trầy 5cm trên bề mặt film b...
  customerNotes?: string;     // Chi tiết khiếu nại
  qcStatus: 'CHO_KIEM_TRA' | 'DA_NHAP_LAI_KHO' | 'TU_CHOI';
  submittedAt: string;        // Vd: 17/10/2026 15:45
}

// ─── Manager Types ───────────────────────────────────────────────────────────
export interface BomItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  uom: string;
  standardQuantity: number; // Định mức tiêu hao cho 1 đơn vị thành phẩm
  scrapPercent: number;      // Tỉ lệ hao hụt cho phép (%)
}

export interface BomFormula {
  id: string;
  bomCode: string;          // Vd: BOM-MC-300
  finishedProductId: string;
  finishedProductCode: string;
  finishedProductName: string;
  finishedProductUom: string;
  version: string;
  status: 'ACTIVE' | 'DRAFT' | 'OBSOLETE';
  items: BomItem[];
  notes?: string;
  updatedAt: string;
}

export interface ProductionOrder {
  id: string;
  mfgOrderCode: string;     // Vd: MO-2026-001
  bomId: string;
  finishedProductId: string;
  finishedProductName: string;
  targetQuantity: number;
  completedQuantity: number;
  startDate: string;
  dueDate: string;
  assignedWorkshop: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export type VoucherType = 'RECEIPT' | 'PAYMENT'; // Thu tiền / Chi tiền

export interface CashFlowVoucher {
  id: string;
  voucherCode: string;      // Vd: VCH-2026-001
  type: VoucherType;
  category: string;         // 'Thu tiền khách hàng' | 'Chi trả NCC' | 'Chi phí vận hành' | 'Khác'
  partnerId?: string;
  partnerName: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  voucherDate: string;
  description: string;
  createdBy: string;
  referenceDoc?: string;    // Số hóa đơn / Số đơn hàng tham chiếu
}

export interface ManagerInventoryProduct {
  id: string;
  code: string;
  name: string;
  locationDetail: string;
  category: 'Thành phẩm' | 'Nguyên vật liệu' | 'Combo gói';
  uom: string;
  actualStock: number;
  netPrice: number | null;
  macCost: number;
  safeStockStatus: 'SAFE' | 'LOW';
  thresholdText: string;
}

export interface LandedCostRecord {
  id: string;
  receiptCode: string;
  supplierName: string;
  receiptDate: string;
  warehouseName: string;
  productName: string;
  quantityInfo: string;
  landedCost: number;
  macAfterInbound: number;
  receivedBy: string;
}

export interface ManagerProductionPlan {
  id: string;
  orderCode: string;
  productName: string;
  bomCode: string;
  status: 'Đang sản xuất' | 'Chờ nhập kho' | 'Hoàn thành';
  workshop: string;
  manager: string;
  sourceWarehouse: string;
  dueDate: string;
  targetQty: number;
  actualQty: number;
  progressPercent: number;
  materials: {
    name: string;
    needed: string;
    status: 'Đủ vật tư' | 'Thiếu vật tư';
  }[];
}

export interface PartnerCreditProfile {
  id: string;
  code: string;
  name: string;
  contact: string;
  category: 'Khách hàng B2B' | 'Nhà cung cấp';
  paymentTerm: string;
  currentDebt: number;
  creditLimit: number | null;
  usagePercent: number | null;
  barColor?: 'orange' | 'red' | 'green' | 'none';
}


export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Warehouse Types ────────────────────────────────────────────────────────
export type InboundStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';

export interface InboundReceiptItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  uom: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  defectiveQty: number;
  binLocation: string; // Vị trí giá kệ: Vd A1-02-03
  lotNumber: string;
}

export interface InboundReceipt {
  id: string;
  receiptCode: string;       // Vd: GR-2026-001
  poCode: string;            // Vd: PO-2026-088
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  receiptDate: string;
  status: InboundStatus;
  items: InboundReceiptItem[];
  totalReceivedValue: number;
  notes?: string;
  receivedBy: string;
}

export interface StockInventoryItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  binLocation: string;
  lotNumber: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  uom: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

// ─── Production Types ────────────────────────────────────────────────────────
export interface ProductionWorkShift {
  id: string;
  orderCode: string;         // Vd: MO-2026-001
  finishedProductName: string;
  shiftName: 'Ca 1 (Sáng)' | 'Ca 2 (Chiều)' | 'Ca 3 (Đêm)';
  targetQty: number;
  actualQty: number;
  defectQty: number;
  operator: string;
  workshop: string;
  status: 'RUNNING' | 'COMPLETED' | 'PENDING';
  recordedAt: string;
  scrapReportNotes?: string;
}

// ─── Admin Types (RBAC & System Users) ──────────────────────────────────────
export interface SystemUser {
  id: string;
  userCode: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  assignedWarehouses: string[];
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin?: string;
}

export interface StaffAccount {
  id: string;
  code: string;           // Vd: TP-AD001, TP-MN002
  name: string;           // Vd: Nguyễn Văn A
  title: string;          // Vd: Giám đốc Công nghệ
  email: string;
  phone: string;
  department: string;     // Quản trị hệ thống, Ban Giám đốc, Phòng Kinh doanh, Kho vận & Logistics, Xưởng Sản xuất
  role: UserRole;
  roleTitle: string;      // Quản trị viên, Quản lý, Nhân viên bán hàng, Nhân viên kho, Nhân viên sản xuất
  assignedWarehouses: string[]; // Vd: ['WH-HN-01', 'WH-HN-02']
  status: 'ACTIVE' | 'LOCKED';
  avatar?: string;
  password?: string;
  username?: string;
}

export interface WarehouseFacility {
  id: string;
  code: string;           // WH-HN-01, WH-HN-02, WH-HN-03, WH-HN-04
  name: string;           // Kho Tổng Gia Lâm, Kho Đông Anh, Kho Hà Đông, Kho Hoàn Kiếm
  address: string;
  staffCount: number;
  area: string;           // 8,500 m²
  status: 'ACTIVE' | 'INACTIVE';
}

export interface RoleDefinition {
  id: string;
  name: string;           // Quản trị viên, Quản lý...
  code: string;           // ROLE_ADMIN, ROLE_MANAGER...
  rank: string;           // Rank #1 ... Rank #5
  isSystem: boolean;
  description: string;
  staffCount: number;
}

export interface PermissionMatrixModule {
  id: string;
  stt: string;            // 01, 02 ... 08
  name: string;
  code: string;           // [AUTH], [MASTER]...
  description: string;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  approve: boolean;
}


