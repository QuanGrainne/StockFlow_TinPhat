'use client';

// Kế hoạch sản xuất (UC-PP-01..06, mã tạm, chưa có trong Report 3).
// - mode 'plans' (feat-production-plans): danh sách, lập, sửa, gửi duyệt, hủy, lập lệnh từ kế hoạch.
// - mode 'approvals' (feat-production-plan-approval): cùng màn, mặc định lọc Chờ duyệt để Manager duyệt / từ chối.
// Bố cục giống màn Lệnh sản xuất: thanh tiêu đề + bộ lọc trái + bảng, bấm dòng mở chi tiết.
// Nút thao tác theo detail.actions do backend tính.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import { message } from 'antd';
import * as XLSX from 'xlsx';
import { FileDown, Inbox, Plus, RefreshCcw, Search } from 'lucide-react';
import { useActiveWarehouse, type WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import { productionPlanService } from '../services/productionPlanService';
import type { PlanMaterialRequirementLine, ProductionListFilter, ProductionPlanDetail, ProductionPlanSummary } from '../types';
import { useProductionFeatures } from '../hooks/useProductionFeatures';
import { fmtDateTime, fmtQty } from '../utils/productionFormat';
import { PLAN_REASON_MAX, PLAN_STATUS_LABEL, PLAN_STATUS_OPTIONS, fmtDateOnly, planErrorText } from '../utils/productionPlanFormat';
import { ProductionFilterSidebar, SidebarToggle } from '../components/ProductionFilterSidebar';
import { ProgressBar } from '../components/ProductionStatusTag';
import { ProductionPlanStatusTag } from '../components/ProductionPlanStatusTag';
import { ProductionPlanDetailPanel, planShortageQty, type ProductionPlanAction } from '../components/ProductionPlanDetailPanel';
import { ProductionPlanFormModal } from '../components/ProductionPlanFormModal';
import { CreateOrderFromPlanModal } from '../components/CreateOrderFromPlanModal';
import { ConfirmDialog } from '../components/ProductionDialog';
import { ReasonDialog } from '../components/ReasonDialog';

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit' | 'submit' | 'approve' | 'reject' | 'cancel' | 'close' | 'createOrder'; detail: ProductionPlanDetail }
  | null;

interface ProductionPlansScreenProps {
  mode?: 'plans' | 'approvals';
}

/** Khóa thông báo của nút Đặt hàng nhập: bấm lặp chỉ thay thông báo cũ */
const ORDER_MSG_KEY = 'plan-order-materials';

/** Trạng thái kế hoạch được đặt hàng nhập NVL từ màn Duyệt kế hoạch */
const ORDERABLE_STATUSES: string[] = ['PENDING_APPROVAL', 'APPROVED'];

/**
 * Danh sách hàng cho trang đặt hàng nhập: "id:số lượng" — CHỈ các NVL đang thiếu so với tồn tại kho làm việc,
 * số lượng = phần thiếu (theo số còn lại chưa lập lệnh nếu có). Gộp theo NVL; làm tròn lên số nguyên
 * vì ô số lượng của phiếu đặt chỉ nhận số nguyên (không đặt thiếu).
 */
function purchaseItemsParam(materials: PlanMaterialRequirementLine[]): string {
  const byMaterial = new Map<number, number>();
  for (const m of materials) {
    const shortage = planShortageQty(m);
    if (shortage > 0) byMaterial.set(m.materialId, (byMaterial.get(m.materialId) ?? 0) + shortage);
  }
  return Array.from(byMaterial.entries())
    .map(([id, qty]) => [id, Math.ceil(Number(qty.toFixed(2)))] as const)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => `${id}:${qty}`)
    .join(',');
}

function initialFilter(mode: 'plans' | 'approvals'): ProductionListFilter {
  return {
    // Duyệt kế hoạch: mặc định Nháp + Chờ duyệt + Đã duyệt (16/11/2026, theo yêu cầu nhóm)
    statuses: mode === 'approvals' ? ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'] : ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
    timeRange: 'all',
    dateFrom: undefined,
    dateTo: undefined,
    warehouseIds: [],
    needsReviewOnly: false,
  };
}

export default function ProductionPlansScreen({ mode = 'plans' }: ProductionPlansScreenProps) {
  const router = useRouter();
  const features = useProductionFeatures();
  const { activeWarehouse, setActiveWarehouse, warehouses } = useActiveWarehouse();
  // Đặt hàng nhập khi kho làm việc khác kho xuất NVL của kế hoạch: hỏi đổi kho trước (phiếu đặt nhập về kho làm việc)
  const [warehouseWarn, setWarehouseWarn] = useState<{ detail: ProductionPlanDetail; planWarehouse: WarehouseItem } | null>(null);

  // Link mở thẳng 1 kế hoạch (?code=KHSX00004&id=4, VD bấm mã kế hoạch ở chi tiết Lệnh sản xuất):
  // điền mã vào ô tìm, hiện mọi trạng thái, mở sẵn chi tiết và cuộn tới dòng đó
  const searchParams = useSearchParams();
  const [docLink] = useState(() => readDocumentLink(searchParams));

  const [query, setQuery] = useState(() => docLink?.code ?? '');
  const [filter, setFilter] = useState<ProductionListFilter>(() =>
    docLink ? { ...initialFilter(mode), statuses: PLAN_STATUS_OPTIONS.map((o) => o.value) } : initialFilter(mode)
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(() => docLink?.id ?? null);

  useEffect(() => {
    if (!docLink?.id) return;
    return scrollToWhenReady(`[data-doc-row="${docLink.id}"]`);
  }, [docLink]);
  const [details, setDetails] = useState<Record<string, ProductionPlanDetail>>({});
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  // V-03(a): chặn bấm xác nhận lặp (gửi duyệt, duyệt, từ chối, hủy, đóng) trước khi nút kịp khóa
  const runningRef = useRef(false);

  const requestKey = JSON.stringify({ statuses: filter.statuses, fromDate: filter.dateFrom, toDate: filter.dateTo, reloadTick });
  const [result, setResult] = useState<{ key: string; data: ProductionPlanSummary[]; error: string | null }>({
    key: '',
    data: [],
    error: null,
  });
  const noStatus = filter.statuses.length === 0;
  const loading = !noStatus && result.key !== requestKey;

  useEffect(() => {
    const p = JSON.parse(requestKey) as { statuses: string[]; fromDate?: string; toDate?: string };
    if (p.statuses.length === 0) return;
    let stale = false;
    productionPlanService
      .getPlans(p)
      .then((data) => {
        if (!stale) setResult({ key: requestKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (stale) return;
        const text = planErrorText(err, 'Không thể tải danh sách kế hoạch sản xuất');
        message.error(text);
        setResult({ key: requestKey, data: [], error: text });
      });
    return () => {
      stale = true;
    };
  }, [requestKey]);

  const filtered = useMemo(() => {
    if (noStatus) return [];
    const q = query.trim().toLowerCase();
    if (!q) return result.data;
    return result.data.filter((p) => p.planCode.toLowerCase().includes(q) || p.planName.toLowerCase().includes(q));
  }, [result.data, query, noStatus]);

  // Chi tiết kế hoạch đang mở
  const detailKey = expandedId ? `${expandedId}:${reloadTick}` : '';
  const detail = detailKey ? details[detailKey] ?? null : null;
  useEffect(() => {
    if (!expandedId || details[detailKey]) return;
    let stale = false;
    productionPlanService
      .getPlan(expandedId)
      .then((d) => {
        if (!stale) setDetails((prev) => ({ ...prev, [detailKey]: d }));
      })
      .catch((err: unknown) => {
        if (!stale) message.error(planErrorText(err, 'Không tải được chi tiết kế hoạch sản xuất'));
      });
    return () => {
      stale = true;
    };
  }, [expandedId, detailKey, details]);

  // Giữ chi tiết đã tải gần nhất khi tải lại (không nháy trống)
  const lastDetail = useMemo(() => {
    if (detail) return detail;
    const prefix = `${expandedId}:`;
    const key = Object.keys(details).reverse().find((k) => k.startsWith(prefix));
    return key ? details[key] : null;
  }, [detail, details, expandedId]);

  const reload = () => {
    setDetails({});
    setReloadTick((t) => t + 1);
  };

  function handleAction(action: ProductionPlanAction) {
    if (!lastDetail) return;
    if (action === 'purchaseOrder') {
      orderMaterials(lastDetail);
      return;
    }
    setDialog({ kind: action, detail: lastDetail });
  }

  // Màn Duyệt kế hoạch: người có quyền Đặt hàng nhập được đặt NVL cho kế hoạch Chờ duyệt / Đã duyệt
  const canOrderMaterials = (d: ProductionPlanDetail | null): boolean =>
    mode === 'approvals' && features.canOrderPurchase && !!d && ORDERABLE_STATUSES.includes(d.summary.status);

  /**
   * Đặt hàng nhập NVL cho kế hoạch. Phiếu đặt nhập về kho làm việc, nên kho làm việc phải trùng kho xuất NVL của kế hoạch:
   * khác kho → hỏi đổi kho làm việc trước; không có quyền kho xuất NVL → báo, không đặt.
   * Kế hoạch cũ chưa có kho xuất NVL → dùng kho làm việc như trước.
   */
  function orderMaterials(d: ProductionPlanDetail) {
    const planWarehouseId = d.summary.warehouseId;
    if (planWarehouseId && planWarehouseId !== activeWarehouse.warehouseId) {
      const planWarehouse = warehouses.find((w) => w.warehouseId === planWarehouseId);
      if (!planWarehouse) {
        message.error({
          key: ORDER_MSG_KEY,
          content: `Kho xuất nguyên vật liệu của kế hoạch là ${d.summary.warehouseName ?? 'kho khác'}, bạn không có quyền kho này nên không đặt hàng nhập được.`,
        });
        return;
      }
      setWarehouseWarn({ detail: d, planWarehouse });
      return;
    }
    void openPurchaseOrder(d, activeWarehouse.warehouseId, activeWarehouse.name);
  }

  /**
   * Mở trang đặt hàng nhập, điền sẵn CHỈ các NVL đang thiếu so với tồn tại kho đã chọn (số lượng = phần thiếu)
   * và ghi chú mã kế hoạch. Không thiếu NVL nào → báo, không mở trang đặt hàng.
   */
  async function openPurchaseOrder(d: ProductionPlanDetail, warehouseId: number, warehouseName: string) {
    if (runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    try {
      const req = await productionPlanService.getMaterialRequirements(d.summary.productionPlanId, warehouseId);
      const missingBom = req.productsWithoutBom.map((p) => p.productCode).join(', ');
      const products = purchaseItemsParam(req.materials);
      if (!products) {
        // key: bấm nhiều lần chỉ thay thông báo cũ, không chồng nhiều dòng
        message.info({
          key: ORDER_MSG_KEY,
          content: missingBom
            ? `Các thành phẩm chưa có định mức đang áp dụng (${missingBom}) nên chưa tính được nguyên vật liệu cần đặt.`
            : `Không thiếu nguyên vật liệu nào tại ${warehouseName}, không cần đặt hàng nhập.`,
        });
        return;
      }
      if (missingBom)
        message.warning({ key: ORDER_MSG_KEY, content: `Chưa có định mức đang áp dụng, không tính nguyên vật liệu cho: ${missingBom}.` });
      const notes = `Đặt NVL còn thiếu tại ${warehouseName} cho kế hoạch sản xuất ${d.summary.planCode}`;
      router.push(`/purchase-orders/create?products=${products}&notes=${encodeURIComponent(notes)}`);
    } catch (err) {
      message.error(planErrorText(err, 'Không tải được nhu cầu nguyên vật liệu của kế hoạch'));
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }

  async function run(label: string, fn: () => Promise<ProductionPlanDetail>, success: (d: ProductionPlanDetail) => string) {
    if (runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    try {
      const d = await fn();
      message.success(success(d));
      setDialog(null);
      reload();
    } catch (err) {
      message.error(planErrorText(err, label));
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }

  function exportList() {
    const rows = filtered.map((p) => ({
      'Mã kế hoạch': p.planCode,
      'Tên kế hoạch': p.planName,
      'Kỳ từ': fmtDateOnly(p.periodStart),
      'Kỳ đến': fmtDateOnly(p.periodEnd),
      'Ngày lập': fmtDateTime(p.planDate),
      'Người lập': p.createdByName,
      'Số thành phẩm': p.itemCount,
      'Tổng SL kế hoạch': p.totalPlannedQuantity,
      'Đã lập lệnh': p.totalOrderedQuantity,
      'Đã lập lệnh (%)': p.orderedPercent,
      'Số lệnh': p.orderCount,
      'Người duyệt': p.approvedByName ?? '',
      'Trạng thái': PLAN_STATUS_LABEL[p.status] ?? p.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KeHoachSanXuat');
    XLSX.writeFile(wb, `DanhSachKeHoachSanXuat_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const canCreate = mode === 'plans' && (features.canPlanProduction || features.canApprovePlans);
  const th = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';
  const title = mode === 'approvals' ? 'Duyệt kế hoạch sản xuất' : 'Kế hoạch sản xuất';

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-transparent overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Thanh tiêu đề */}
      <header className="min-h-12 bg-white/84 backdrop-blur-[2px] border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        <div className="flex items-center gap-4 flex-1 basis-[320px] min-w-[260px] max-w-xl">
          <h1 className="text-[20px] font-bold leading-7 tracking-tight whitespace-nowrap">{title}</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Theo mã hoặc tên kế hoạch"
              className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={() => setDialog({ kind: 'create' })}
              className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
            >
              <Plus size={15} className="stroke-[2.5]" />
              <span>Lập kế hoạch</span>
            </button>
          )}
          <button
            type="button"
            onClick={exportList}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] bg-white cursor-pointer"
          >
            <FileDown size={14} className="text-[#677484]" />
            <span>Xuất file</span>
          </button>
        </div>
      </header>

      {/* 2. Bộ lọc + bảng */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="relative shrink-0 h-full flex">
          <ProductionFilterSidebar
            state={filter}
            onChange={(patch) => setFilter((prev) => ({ ...prev, ...patch }))}
            isCollapsed={sidebarCollapsed}
            statusOptions={PLAN_STATUS_OPTIONS}
            timeLabel="Kỳ kế hoạch"
          />
          <SidebarToggle collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
        </div>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white/62">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className={th}>Mã kế hoạch</th>
                  <th className={th}>Tên kế hoạch</th>
                  <th className={th}>Kỳ kế hoạch</th>
                  <th className={th}>Ngày lập</th>
                  <th className={th}>Người lập</th>
                  <th className={`${th} text-right`}>Số TP</th>
                  <th className={`${th} text-right`}>Tổng SL kế hoạch</th>
                  <th className={th}>Đã lập lệnh</th>
                  <th className={`${th} text-right`}>Số lệnh</th>
                  <th className={`${th} text-center`}>Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center text-[#677484]">
                      <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải kế hoạch sản xuất...
                    </td>
                  </tr>
                ) : result.error && !noStatus ? (
                  <tr>
                    <td colSpan={10} className="py-24 text-center text-[#fb2c36]">
                      {result.error}
                      <div className="mt-2">
                        <button type="button" onClick={reload} className="text-xs text-[#0070f4] hover:underline cursor-pointer">
                          Thử lại
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-24 text-center text-[#677484]">
                      <Inbox size={28} className="mx-auto mb-2 text-[#0070f4]" />
                      Không tìm thấy kế hoạch sản xuất nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const isExpanded = expandedId === p.productionPlanId;
                    return (
                      <React.Fragment key={p.productionPlanId}>
                        <tr
                          data-doc-row={p.productionPlanId}
                          onClick={() => setExpandedId(isExpanded ? null : p.productionPlanId)}
                          className={`cursor-pointer text-[13px] ${isExpanded ? 'bg-[#e6f1fe]/80' : 'hover:bg-[#f7f8f9]'}`}
                        >
                          <td className="py-2.5 px-3 font-mono font-medium text-[#0070f4]">{p.planCode}</td>
                          <td className="py-2.5 px-3 max-w-[260px] truncate font-medium" title={p.planName}>
                            {p.planName}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {fmtDateOnly(p.periodStart)} – {fmtDateOnly(p.periodEnd)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{fmtDateTime(p.planDate)}</td>
                          <td className="py-2.5 px-3">{p.createdByName}</td>
                          <td className="py-2.5 px-3 text-right">{p.itemCount}</td>
                          <td className="py-2.5 px-3 text-right">{fmtQty(p.totalPlannedQuantity)}</td>
                          <td className="py-2.5 px-3">
                            <ProgressBar percent={p.orderedPercent} />
                          </td>
                          <td className="py-2.5 px-3 text-right">{p.orderCount}</td>
                          <td className="py-2.5 px-3 text-center">
                            <ProductionPlanStatusTag status={p.status} />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} className="p-0 border-b-2 border-[#0070f4] bg-white">
                              <ProductionPlanDetailPanel
                                detail={lastDetail && lastDetail.summary.productionPlanId === p.productionPlanId ? lastDetail : null}
                                loading={!detail}
                                warehouses={warehouses}
                                defaultWarehouseId={activeWarehouse.warehouseId}
                                onAction={handleAction}
                                canOrderMaterials={canOrderMaterials(lastDetail)}
                                // Màn Kế hoạch sản xuất không có nút Duyệt; duyệt ở màn Duyệt kế hoạch sản xuất
                                allowApprove={mode === 'approvals'}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <footer className="h-10 bg-white/82 backdrop-blur-[2px] border-t border-slate-200 px-4 flex items-center text-[12px] text-[#677484] shrink-0">
            Hiển thị <strong className="mx-1 text-[#15171a]">{filtered.length}</strong> kế hoạch sản xuất
          </footer>
        </div>
      </div>

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <ProductionPlanFormModal
          detail={dialog.kind === 'edit' ? dialog.detail : null}
          onClose={() => setDialog(null)}
          onSaved={(d) => {
            setDialog(null);
            setExpandedId(d.summary.productionPlanId);
            reload();
          }}
        />
      )}
      {dialog?.kind === 'submit' && (
        <ConfirmDialog
          title="Gửi duyệt kế hoạch"
          busy={busy}
          confirmText="Gửi duyệt"
          message={
            <span>
              Gửi kế hoạch <b>{dialog.detail.summary.planCode}</b> cho Quản lý duyệt? Sau khi gửi, kế hoạch không sửa được cho tới khi được
              duyệt hoặc bị từ chối.
            </span>
          }
          onCancel={() => setDialog(null)}
          onConfirm={() =>
            void run(
              'Không gửi duyệt được kế hoạch',
              () => productionPlanService.submitPlan(dialog.detail.summary.productionPlanId),
              (d) => `Đã gửi duyệt kế hoạch ${d.summary.planCode}.`
            )
          }
        />
      )}
      {dialog?.kind === 'approve' && (
        <ConfirmDialog
          title="Duyệt kế hoạch"
          busy={busy}
          confirmText="Duyệt"
          message={
            <span>
              Duyệt kế hoạch <b>{dialog.detail.summary.planCode}</b>? Sau khi duyệt, kế hoạch được dùng để lập lệnh sản xuất. Nên xem tab{' '}
              <b>Nhu cầu NVL</b> trước: thiếu nguyên vật liệu chỉ là cảnh báo, không chặn duyệt.
            </span>
          }
          onCancel={() => setDialog(null)}
          onConfirm={() =>
            void run(
              'Không duyệt được kế hoạch',
              () => productionPlanService.approvePlan(dialog.detail.summary.productionPlanId),
              (d) => `Đã duyệt kế hoạch ${d.summary.planCode}.`
            )
          }
        />
      )}
      {dialog?.kind === 'reject' && (
        <ReasonDialog
          title="Từ chối kế hoạch"
          confirmText="Từ chối"
          busy={busy}
          maxLength={PLAN_REASON_MAX}
          description={
            <span>
              Kế hoạch <b>{dialog.detail.summary.planCode}</b> sẽ chuyển sang Bị từ chối. Người lập sửa rồi gửi duyệt lại.
            </span>
          }
          onCancel={() => setDialog(null)}
          onConfirm={(reason) =>
            void run(
              'Không từ chối được kế hoạch',
              () => productionPlanService.rejectPlan(dialog.detail.summary.productionPlanId, reason),
              (d) => `Đã từ chối kế hoạch ${d.summary.planCode}.`
            )
          }
        />
      )}
      {dialog?.kind === 'cancel' && (
        <ReasonDialog
          title="Hủy kế hoạch"
          confirmText="Hủy kế hoạch"
          busy={busy}
          maxLength={PLAN_REASON_MAX}
          description={
            <span>
              Hủy kế hoạch <b>{dialog.detail.summary.planCode}</b>? Kế hoạch đã hủy không dùng được nữa. Các lệnh đã lập (nếu có, đều đã hủy) giữ
              nguyên.
            </span>
          }
          onCancel={() => setDialog(null)}
          onConfirm={(reason) =>
            void run(
              'Không hủy được kế hoạch',
              () => productionPlanService.cancelPlan(dialog.detail.summary.productionPlanId, reason),
              (d) => `Đã hủy kế hoạch ${d.summary.planCode}.`
            )
          }
        />
      )}
      {dialog?.kind === 'close' && (
        <ConfirmDialog
          title="Đóng kế hoạch"
          busy={busy}
          confirmText="Đóng kế hoạch"
          message={
            <span>
              Đóng kế hoạch <b>{dialog.detail.summary.planCode}</b>? Phần còn lại chưa lập lệnh (
              {fmtQty(dialog.detail.items.reduce((s, i) => s + i.remainingQuantity, 0))}) sẽ bị bỏ, không lập thêm lệnh được nữa. Các lệnh
              đang mở vẫn chạy bình thường.
            </span>
          }
          onCancel={() => setDialog(null)}
          onConfirm={() =>
            void run(
              'Không đóng được kế hoạch',
              () => productionPlanService.closePlan(dialog.detail.summary.productionPlanId),
              (d) => `Đã đóng kế hoạch ${d.summary.planCode}.`
            )
          }
        />
      )}
      {warehouseWarn && (
        <ConfirmDialog
          title="Kho làm việc khác kho xuất NVL"
          danger
          busy={busy}
          confirmText={`Chuyển sang ${warehouseWarn.planWarehouse.name}`}
          message={
            <span>
              Kế hoạch <b>{warehouseWarn.detail.summary.planCode}</b> xuất nguyên vật liệu tại <b>{warehouseWarn.planWarehouse.name}</b>, nhưng bạn đang làm
              việc tại <b>{activeWarehouse.name}</b>. Phiếu đặt hàng nhập sẽ nhập về kho làm việc, nên cần chuyển kho làm việc sang{' '}
              <b>{warehouseWarn.planWarehouse.name}</b> để đặt đúng nguyên vật liệu còn thiếu tại kho đó.
            </span>
          }
          onCancel={() => setWarehouseWarn(null)}
          onConfirm={() => {
            const { detail: d, planWarehouse } = warehouseWarn;
            setWarehouseWarn(null);
            setActiveWarehouse(planWarehouse);
            void openPurchaseOrder(d, planWarehouse.warehouseId, planWarehouse.name);
          }}
        />
      )}
      {dialog?.kind === 'createOrder' && (
        <CreateOrderFromPlanModal
          detail={dialog.detail}
          onClose={() => setDialog(null)}
          onCreated={() => {
            setDialog(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
