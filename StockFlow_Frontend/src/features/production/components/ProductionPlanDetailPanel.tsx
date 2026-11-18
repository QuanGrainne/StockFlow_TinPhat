'use client';

// Chi tiết kế hoạch sản xuất mở dưới dòng (UC-PP-01 bước 4–5):
// - Tab Thông tin & tiến độ: từng thành phẩm với số kế hoạch, đã lập lệnh, còn lại, đã nhập kho (BR-PP-10, BR-PP-11).
// - Tab Nhu cầu NVL (UC-PP-03), tab Lệnh sản xuất thuộc kế hoạch.
// Nút thao tác hiện theo detail.actions do backend tính (không tự suy ra từ trạng thái).

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, ClipboardPlus, Lock, Pencil, RefreshCcw, Send, ShoppingCart, XCircle } from 'lucide-react';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import type { WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import type { PlanMaterialRequirementLine, ProductionPlanDetail } from '../types';
import { productionPlanService } from '../services/productionPlanService';
import { fmtDate, fmtDateTime, fmtQty } from '../utils/productionFormat';
import { fmtDateOnly } from '../utils/productionPlanFormat';
import { ProductionPlanStatusTag } from './ProductionPlanStatusTag';
import { ProductionStatusTag, ProgressBar, SmallTag } from './ProductionStatusTag';
import { PlanMaterialRequirementsPanel } from './PlanMaterialRequirementsPanel';
import { ProductionDocLink } from './ProductionDocLink';

type Tab = 'info' | 'materials' | 'orders';

export type ProductionPlanAction =
  | 'edit'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'createOrder'
  | 'close'
  | 'cancel'
  | 'purchaseOrder';

interface ProductionPlanDetailPanelProps {
  detail: ProductionPlanDetail | null;
  loading: boolean;
  warehouses: WarehouseItem[];
  defaultWarehouseId: number | null;
  onAction: (action: ProductionPlanAction) => void;
  /** Hiện nút "Đặt hàng nhập" (đặt NVL theo kế hoạch); màn hình cha quyết định theo chức năng và trạng thái */
  canOrderMaterials?: boolean;
  /** Hiện nút "Duyệt": chỉ ở màn Duyệt kế hoạch sản xuất (màn Kế hoạch sản xuất không duyệt) */
  allowApprove?: boolean;
}

/** Số thiếu dùng để cảnh báo / đặt hàng: theo phần còn lại chưa lập lệnh (nếu có), không thì theo tổng kế hoạch */
export const planShortageQty = (m: PlanMaterialRequirementLine): number => m.remainingShortageQty ?? m.shortageQty ?? 0;

/**
 * Cảnh báo thiếu NVL hiện ngay khi mở chi tiết kế hoạch (không phải vào tab Nhu cầu NVL mới thấy),
 * so với tồn tại kho làm việc. Chỉ cảnh báo, không chặn gửi duyệt / duyệt (BR-PP-15).
 */
function PlanShortageBanner({
  planId,
  reloadKey,
  warehouseId,
  warehouseName,
  onViewDetail,
}: {
  planId: number;
  reloadKey: string;
  warehouseId: number | null;
  warehouseName: string;
  onViewDetail: () => void;
}) {
  const key = `${reloadKey}:${warehouseId ?? ''}`;
  const [state, setState] = useState<{ key: string; lines: PlanMaterialRequirementLine[] }>({ key: '', lines: [] });

  useEffect(() => {
    let stale = false;
    productionPlanService
      .getMaterialRequirements(planId, warehouseId)
      .then((req) => {
        if (!stale) setState({ key, lines: req.materials.filter((m) => planShortageQty(m) > 0) });
      })
      .catch(() => {
        if (!stale) setState({ key, lines: [] });
      });
    return () => {
      stale = true;
    };
    // key gom đủ tham số (kế hoạch + số lượng + kho)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (state.key !== key || state.lines.length === 0) return null;
  const shown = state.lines.slice(0, 5);
  return (
    <div className="mb-3 flex items-start gap-2 rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs text-[#b91c1c]">
      <AlertTriangle size={14} className="shrink-0 mt-px" />
      <div className="min-w-0 flex-1">
        <span className="font-semibold">
          Thiếu {state.lines.length} nguyên vật liệu tại {warehouseName}:
        </span>{' '}
        {shown.map((m, i) => (
          <span key={m.materialId}>
            {i > 0 && ', '}
            {m.materialCode} {m.materialName} (thiếu {fmtQty(planShortageQty(m))} {m.unitName})
          </span>
        ))}
        {state.lines.length > shown.length && <span>, … và {state.lines.length - shown.length} NVL khác</span>}
        <span className="text-[#9f1239]">. Chỉ là cảnh báo, kế hoạch vẫn gửi duyệt / duyệt được.</span>
      </div>
      <button type="button" onClick={onViewDetail} className="shrink-0 font-semibold text-[#0070f4] hover:underline cursor-pointer">
        Xem nhu cầu NVL
      </button>
    </div>
  );
}

const actionBtn =
  'flex items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer';
const primaryBtn =
  'flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0070f4] hover:bg-[#005ac3] text-white rounded-[8px] font-semibold cursor-pointer';
const dangerBtn =
  'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[8px] border border-[#fecaca] text-[#fb2c36] bg-white hover:bg-[#fef2f2] cursor-pointer';

export function ProductionPlanDetailPanel({
  detail,
  loading,
  warehouses,
  defaultWarehouseId,
  onAction,
  canOrderMaterials,
  allowApprove = true,
}: ProductionPlanDetailPanelProps) {
  const [tab, setTab] = useState<Tab>('info');

  if (!detail) {
    return (
      <div className="py-10 text-center text-xs text-slate-400">
        <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
        Đang tải chi tiết kế hoạch...
      </div>
    );
  }

  const s = detail.summary;
  const a = detail.actions;
  const totalRemaining = detail.items.reduce((sum, i) => sum + i.remainingQuantity, 0);
  const totalReceived = detail.items.reduce((sum, i) => sum + i.receivedQuantity, 0);
  const missingBom = detail.items.filter((i) => !i.hasActiveBom);
  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Thông tin & tiến độ' },
    { key: 'materials', label: 'Nhu cầu NVL' },
    { key: 'orders', label: `Lệnh sản xuất (${detail.orders.length})` },
  ];

  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px cursor-pointer ${
              tab === t.key ? 'border-[#0070f4] text-[#0070f4] font-semibold' : 'border-transparent text-[#677484] hover:text-[#15171a]'
            }`}
          >
            {t.label}
          </button>
        ))}
        {loading && <RefreshCcw size={13} className="animate-spin ml-2 text-[#0070f4]" />}
      </div>

      {/* Cảnh báo thiếu NVL hiện ở mọi tab (trừ tab Nhu cầu NVL đã có bảng chi tiết); kế hoạch đã đóng / hủy thì thôi */}
      {tab !== 'materials' && s.status !== 'CLOSED' && s.status !== 'CANCELLED' && (
        <PlanShortageBanner
          planId={s.productionPlanId}
          reloadKey={`${s.productionPlanId}:${s.totalPlannedQuantity}:${s.totalOrderedQuantity}`}
          warehouseId={defaultWarehouseId}
          warehouseName={warehouses.find((w) => w.warehouseId === defaultWarehouseId)?.name ?? 'kho làm việc'}
          onViewDetail={() => setTab('materials')}
        />
      )}

      {tab === 'info' && (
        <>
          <div className="mb-4">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-base font-bold font-mono">{s.planCode}</span>
              <span className="text-sm font-semibold">{s.planName}</span>
              <ProductionPlanStatusTag status={s.status} />
              {missingBom.length > 0 && (
                <SmallTag tone="amber" title="Cần thiết lập định mức trước khi gửi duyệt (BR-PP-09)">
                  {missingBom.length} thành phẩm chưa có định mức
                </SmallTag>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">Kỳ kế hoạch: </span>
                <span className="font-medium text-slate-800">
                  {fmtDateOnly(s.periodStart)} – {fmtDateOnly(s.periodEnd)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Người lập: </span>
                <span className="font-medium text-slate-800">{s.createdByName}</span>
              </div>
              <div>
                <span className="text-slate-400">Ngày lập: </span>
                <span className="font-medium text-slate-800">{fmtDateTime(s.planDate)}</span>
              </div>
              <div>
                <span className="text-slate-400">Người duyệt: </span>
                <span className="font-medium text-slate-800">{s.approvedByName || <span className="text-slate-400">Chưa duyệt</span>}</span>
              </div>
              <div>
                <span className="text-slate-400">Thời điểm duyệt: </span>
                <span className="font-medium text-slate-800">{fmtDateTime(s.approvalDate) || <span className="text-slate-400">—</span>}</span>
              </div>
              <div>
                <span className="text-slate-400">Số lệnh còn hiệu lực: </span>
                <span className="font-medium text-slate-800">{s.orderCount}</span>
              </div>
              {s.updatedAt && (
                <div className="md:col-span-3">
                  <span className="text-slate-400">Cập nhật lần cuối: </span>
                  <span className="font-medium text-slate-800">
                    {s.updatedByName} · {fmtDateTime(s.updatedAt)}
                  </span>
                </div>
              )}
            </div>
            {detail.notes && (
              <div className="mt-2 text-xs text-slate-600 whitespace-pre-line">
                <span className="text-slate-400">Ghi chú: </span>
                {detail.notes}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Tổng SL kế hoạch', value: s.totalPlannedQuantity, cls: '' },
              { label: 'Đã lập lệnh', value: s.totalOrderedQuantity, cls: 'text-[#0070f4]' },
              { label: 'Còn lại chưa lập lệnh', value: totalRemaining, cls: 'text-[#d97706]' },
              { label: 'Đã nhập kho', value: totalReceived, cls: 'text-[#16a34a]' },
            ].map((k) => (
              <div key={k.label} className="border border-slate-200 rounded-[8px] px-3 py-2 bg-slate-50/60">
                <div className="text-[11px] text-slate-400">{k.label}</div>
                <div className={`text-base font-bold ${k.cls}`}>{fmtQty(k.value)}</div>
              </div>
            ))}
          </div>

          <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-4">
            <table className="w-full text-left border-collapse text-xs min-w-[900px]">
              <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
                <tr>
                  <th className="py-1.5 px-3 w-10 text-center">STT</th>
                  <th className="py-1.5 px-3 w-32">Mã TP</th>
                  <th className="py-1.5 px-3">Tên thành phẩm</th>
                  <th className="py-1.5 px-3 w-14 text-center">ĐVT</th>
                  <th className="py-1.5 px-3 w-44">Thời gian</th>
                  <th className="py-1.5 px-3 w-36">Kho nhận</th>
                  <th className="py-1.5 px-3 w-24 text-right">SL kế hoạch</th>
                  <th className="py-1.5 px-3 w-24 text-right">Đã lập lệnh</th>
                  <th className="py-1.5 px-3 w-24 text-right">Còn lại</th>
                  <th className="py-1.5 px-3 w-24 text-right">Đã nhập kho</th>
                  <th className="py-1.5 px-3 w-36">Đã lập lệnh (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.items.map((it, idx) => (
                  <tr key={it.productionPlanItemId}>
                    <td className="py-1.5 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-1.5 px-3 font-mono font-semibold">
                      <ProductCodeLink code={it.productCode} productId={it.productId} />
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="font-medium">{it.productName}</div>
                      {!it.hasActiveBom && <div className="text-[11px] text-[#d97706]">Chưa có định mức đang áp dụng</div>}
                      {it.notes && <div className="text-[11px] text-[#677484]">{it.notes}</div>}
                    </td>
                    <td className="py-1.5 px-3 text-center text-slate-500">{it.unitName}</td>
                    <td className="py-1.5 px-3 text-slate-600">
                      {fmtDateOnly(it.plannedStartDate)} – {fmtDateOnly(it.plannedEndDate)}
                    </td>
                    <td className="py-1.5 px-3 text-slate-600">{it.warehouseName || <span className="text-slate-400">Chưa chỉ định</span>}</td>
                    <td className="py-1.5 px-3 text-right font-semibold">{fmtQty(it.plannedQuantity)}</td>
                    <td className="py-1.5 px-3 text-right text-[#0070f4] font-semibold">{fmtQty(it.orderedQuantity)}</td>
                    <td className="py-1.5 px-3 text-right text-[#d97706] font-semibold">{fmtQty(it.remainingQuantity)}</td>
                    <td className="py-1.5 px-3 text-right text-[#16a34a] font-semibold">{fmtQty(it.receivedQuantity)}</td>
                    <td className="py-1.5 px-3">
                      <ProgressBar percent={it.plannedQuantity > 0 ? (it.orderedQuantity * 100) / it.plannedQuantity : 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'materials' && (
        <div className="mb-4">
          <PlanMaterialRequirementsPanel
            reloadKey={`${s.productionPlanId}:${s.totalPlannedQuantity}:${s.totalOrderedQuantity}`}
            load={(warehouseId) => productionPlanService.getMaterialRequirements(s.productionPlanId, warehouseId)}
            warehouses={warehouses}
            defaultWarehouseId={defaultWarehouseId}
            showRemainingToggle={s.totalOrderedQuantity > 0}
          />
        </div>
      )}

      {tab === 'orders' && (
        <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-4">
          <table className="w-full text-left border-collapse text-xs min-w-[800px]">
            <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
              <tr>
                <th className="py-1.5 px-3 w-28">Mã lệnh</th>
                <th className="py-1.5 px-3 w-32">Ngày lập</th>
                <th className="py-1.5 px-3">Thành phẩm</th>
                <th className="py-1.5 px-3 w-24 text-right">SL kế hoạch</th>
                <th className="py-1.5 px-3 w-24 text-right">Đã nhập</th>
                <th className="py-1.5 px-3 w-28">Hạn hoàn thành</th>
                <th className="py-1.5 px-3 w-32">Người lập</th>
                <th className="py-1.5 px-3 w-28 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    Chưa có lệnh sản xuất nào được lập từ kế hoạch này
                  </td>
                </tr>
              ) : (
                detail.orders.map((o) => (
                  <tr key={o.productionOrderId}>
                    <td className="py-1.5 px-3">
                      {/* Không truyền ngày: màn Lệnh sản xuất lọc theo ngày lập, khác ngày bắt đầu của lệnh */}
                      <ProductionDocLink kind="order" code={o.productionOrderCode} id={o.productionOrderId} />
                    </td>
                    <td className="py-1.5 px-3 whitespace-nowrap">{fmtDateTime(o.startDate)}</td>
                    <td className="py-1.5 px-3">
                      {o.items.map((i) => (
                        <div key={i.productId}>
                          <span className="font-mono">{i.productCode}</span> · {fmtQty(i.plannedQuantity)}
                        </div>
                      ))}
                    </td>
                    <td className="py-1.5 px-3 text-right font-semibold">{fmtQty(o.plannedQuantity)}</td>
                    <td className="py-1.5 px-3 text-right text-[#16a34a]">{fmtQty(o.actualQuantity)}</td>
                    <td className="py-1.5 px-3 whitespace-nowrap">{fmtDate(o.endDate)}</td>
                    <td className="py-1.5 px-3">{o.createdByName}</td>
                    <td className="py-1.5 px-3 text-center">
                      <ProductionStatusTag status={o.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
        {a.canCancel && (
          <button type="button" onClick={() => onAction('cancel')} className={dangerBtn}>
            <Ban size={14} /> Hủy kế hoạch
          </button>
        )}
        {a.canClose && (
          <button type="button" onClick={() => onAction('close')} className={actionBtn}>
            <Lock size={14} /> Đóng kế hoạch
          </button>
        )}
        {a.canEdit && (
          <button type="button" onClick={() => onAction('edit')} className={actionBtn}>
            <Pencil size={14} /> {a.isLimitedEdit ? 'Điều chỉnh' : 'Sửa'}
          </button>
        )}
        {a.canReject && (
          <button type="button" onClick={() => onAction('reject')} className={dangerBtn}>
            <XCircle size={14} /> Từ chối
          </button>
        )}
        {canOrderMaterials && (
          <button
            type="button"
            onClick={() => onAction('purchaseOrder')}
            className={actionBtn}
            title="Mở phiếu đặt hàng nhập, điền sẵn các nguyên vật liệu đang thiếu (số lượng = phần thiếu tại kho làm việc)"
          >
            <ShoppingCart size={14} /> Đặt hàng nhập
          </button>
        )}
        {a.canSubmit && (
          <button type="button" onClick={() => onAction('submit')} className={primaryBtn}>
            <Send size={14} /> Gửi duyệt
          </button>
        )}
        {a.canApprove && allowApprove && (
          <button type="button" onClick={() => onAction('approve')} className={primaryBtn}>
            <CheckCircle2 size={14} /> Duyệt
          </button>
        )}
        {a.canCreateOrder && (
          <button type="button" onClick={() => onAction('createOrder')} className={primaryBtn}>
            <ClipboardPlus size={14} /> Lập lệnh sản xuất
          </button>
        )}
      </div>
    </div>
  );
}
