'use client';

// Chi tiết lệnh sản xuất mở dưới dòng (UC-44 bước 5, UC-45, UC-60, UC-61):
// - Tab Thông tin & NVL: nhu cầu / đã xuất / còn thiếu / tồn tại kho đang chọn (A45.1), định mức đã điều chỉnh (BR-51).
// - Tab Phiếu xuất NVL, tab Nhập thành phẩm (cờ cần xem xét BR-37).
// Nút thao tác hiện theo chức năng được phân quyền: Lập lệnh / Duyệt hoàn thành (Manager) / Xuất NVL.
// Phiếu nhập thành phẩm do hệ thống tự sinh khi Manager Duyệt hoàn thành (không nhập tay).

import React, { useState } from 'react';
import Link from 'next/link';
import { documentLinkHref } from '@/lib/navigation/documentLink';
import { AlertTriangle, Ban, BadgeCheck, CheckCircle2, PackageMinus, RefreshCcw, Sliders } from 'lucide-react';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import type { WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import type { ProductionOrderDetail } from '../types';
import type { ProductionFeatures } from '../hooks/useProductionFeatures';
import { fmtDate, fmtDateTime, fmtNorm, fmtPercent, fmtQty, producedSoFar, producibleFromIssued } from '../utils/productionFormat';
import { ProductionStatusTag, ProgressBar, SmallTag } from './ProductionStatusTag';

type Tab = 'info' | 'issues' | 'receipts';

export type ProductionOrderAction = 'adjust' | 'close' | 'cancel' | 'issue' | 'supplement' | 'approve';

interface ProductionOrderDetailPanelProps {
  detail: ProductionOrderDetail | null;
  loading: boolean;
  features: ProductionFeatures;
  warehouses: WarehouseItem[];
  availabilityWarehouseId: number | null;
  onChangeWarehouse: (warehouseId: number) => void;
  onAction: (action: ProductionOrderAction) => void;
}

const actionBtn =
  'flex items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer';
const primaryBtn =
  'flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0070f4] hover:bg-[#005ac3] text-white rounded-[8px] font-semibold cursor-pointer';

export function ProductionOrderDetailPanel({
  detail,
  loading,
  features,
  warehouses,
  availabilityWarehouseId,
  onChangeWarehouse,
  onAction,
}: ProductionOrderDetailPanelProps) {
  const [tab, setTab] = useState<Tab>('info');

  if (!detail) {
    return (
      <div className="py-10 text-center text-xs text-slate-400">
        <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
        Đang tải chi tiết lệnh sản xuất...
      </div>
    );
  }

  const s = detail.summary;
  const notStarted = s.status === 'NOT_STARTED';
  const inProgress = s.status === 'IN_PROGRESS';
  // Số thành phẩm làm được từ NVL đã xuất (cùng công thức backend dùng để chặn Duyệt hoàn thành)
  const multiItems = !!s.items && s.items.length > 1;
  const producibleOf = (planned: number, itemId: number | null) => producibleFromIssued(detail.materials, planned, itemId);
  const orderProducible = multiItems ? null : producibleOf(s.plannedQuantity, s.items?.[0]?.productionOrderItemId ?? null);
  const orderProduced = detail.receipts.reduce((sum, r) => sum + r.acceptedQuantity + r.defectQuantity, 0);
  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Thông tin & NVL' },
    { key: 'issues', label: `Phiếu xuất NVL (${detail.issues.length})` },
    { key: 'receipts', label: `Nhập thành phẩm (${detail.receipts.length})` },
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

      {tab === 'info' && (
        <>
          <div className="mb-4">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-base font-bold font-mono">{s.code}</span>
              <ProductionStatusTag status={s.status} />
              {s.reviewFlagCount > 0 && (
                <SmallTag tone="red" title="Phiếu nhập thành phẩm dùng NVL vượt số đã xuất (BR-37)">
                  {s.reviewFlagCount} phiếu cần xem xét
                </SmallTag>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">Thành phẩm: </span>
                <span className="font-semibold text-slate-800">
                  <ProductCodeLink code={s.productCode} productId={s.productId} /> · {s.productName}
                </span>
              </div>
              <div>
                <span className="text-slate-400">BOM áp dụng: </span>
                <span className="font-medium text-slate-800">
                  {s.bomCode} (v{s.bomVersion})
                </span>
              </div>
              <div>
                <span className="text-slate-400">Xưởng phụ trách: </span>
                <span className="font-medium text-slate-800">{s.workshop || <span className="text-slate-400">Chưa có</span>}</span>
              </div>
              <div>
                <span className="text-slate-400">Người lập: </span>
                <span className="font-medium text-slate-800">{s.createdByName}</span>
              </div>
              {s.productionPlanCode && (
                <div>
                  <span className="text-slate-400">Kế hoạch sản xuất: </span>
                  {/* Bấm mở kế hoạch ở tab mới (màn Kế hoạch sản xuất mở sẵn chi tiết theo ?code=&id=) */}
                  <Link
                    href={documentLinkHref('/production/plans', { code: s.productionPlanCode, id: s.productionPlanId ?? null })}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono font-semibold text-[#0070f4] hover:underline"
                    title={`Mở kế hoạch sản xuất ${s.productionPlanCode}`}
                  >
                    {s.productionPlanCode}
                  </Link>
                </div>
              )}
              <div>
                <span className="text-slate-400">Ngày lập: </span>
                <span className="font-medium text-slate-800">{fmtDateTime(s.createdDate)}</span>
              </div>
              <div>
                <span className="text-slate-400">Hạn hoàn thành: </span>
                <span className="font-medium text-slate-800">{fmtDate(s.deadline) || <span className="text-slate-400">Chưa có</span>}</span>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-3 mb-4 ${orderProducible != null ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
            {[
              { label: 'SL kế hoạch', value: s.plannedQuantity, cls: '' },
              { label: 'Đã nhập kho', value: s.receivedQuantity, cls: 'text-[#16a34a]' },
              { label: 'Còn lại', value: Math.max(0, s.plannedQuantity - s.receivedQuantity), cls: 'text-[#0070f4]' },
              { label: 'Lỗi / phế phẩm', value: s.defectQuantity, cls: 'text-[#fb2c36]' },
            ].map((k) => (
              <div key={k.label} className="border border-slate-200 rounded-[8px] px-3 py-2 bg-slate-50/60">
                <div className="text-[11px] text-slate-400">{k.label}</div>
                <div className={`text-base font-bold ${k.cls}`}>
                  {fmtQty(k.value)} <span className="text-xs font-normal text-slate-500">{s.unitName}</span>
                </div>
              </div>
            ))}
            {orderProducible != null && (
              <div
                className="border border-[#0070f4]/25 rounded-[8px] px-3 py-2 bg-[#e6f1fe]/60"
                title="Số thành phẩm làm được từ NVL đã xuất (NVL ít nhất quyết định). Duyệt hoàn thành không vượt số này."
              >
                <div className="text-[11px] text-slate-500">Đủ SX từ NVL đã xuất</div>
                <div className="text-base font-bold text-[#0070f4]">
                  {fmtQty(orderProducible)} <span className="text-xs font-normal text-slate-500">{s.unitName}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Còn duyệt được: <b>{fmtQty(Math.max(0, orderProducible - orderProduced))}</b>
                </div>
              </div>
            )}
          </div>
          <div className="mb-4 max-w-md">
            <ProgressBar percent={s.progressPercent} />
          </div>

          {s.items && s.items.length > 1 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-[#15171a] mb-1.5">
                Danh sách thành phẩm trong lệnh ({s.items.length} thành phẩm)
              </div>
              <div className="border border-slate-200 rounded-[8px] overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
                    <tr>
                      <th className="py-1.5 px-3 w-10 text-center">STT</th>
                      <th className="py-1.5 px-3 w-32">Mã TP</th>
                      <th className="py-1.5 px-3">Tên thành phẩm</th>
                      <th className="py-1.5 px-3 w-14 text-center">ĐVT</th>
                      <th className="py-1.5 px-3 w-36">Định mức BOM</th>
                      <th className="py-1.5 px-3 w-24 text-right">SL kế hoạch</th>
                      <th className="py-1.5 px-3 w-24 text-right">Đã nhập</th>
                      <th className="py-1.5 px-3 w-24 text-right">Còn lại</th>
                      <th className="py-1.5 px-3 w-28 text-right" title="Số thành phẩm làm được từ NVL đã xuất / còn duyệt được">
                        Đủ SX từ NVL
                      </th>
                      <th className="py-1.5 px-3 w-36">Tiến độ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.items.map((it, idx) => (
                      <tr key={it.productId}>
                        <td className="py-1.5 px-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-mono font-semibold">
                          <ProductCodeLink code={it.productCode} productId={it.productId} />
                        </td>
                        <td className="py-1.5 px-3 font-medium">{it.productName}</td>
                        <td className="py-1.5 px-3 text-center text-slate-500">{it.unitName}</td>
                        <td className="py-1.5 px-3 text-slate-600">
                          {it.bomCode} (v{it.bomVersion})
                        </td>
                        <td className="py-1.5 px-3 text-right font-semibold">{fmtQty(it.plannedQuantity)}</td>
                        <td className="py-1.5 px-3 text-right text-[#16a34a] font-semibold">{fmtQty(it.receivedQuantity)}</td>
                        <td className="py-1.5 px-3 text-right text-[#0070f4] font-semibold">{fmtQty(it.remainingQuantity)}</td>
                        <td className="py-1.5 px-3 text-right">
                          {(() => {
                            const p = producibleOf(it.plannedQuantity, it.productionOrderItemId);
                            if (p == null) return <span className="text-slate-400">—</span>;
                            const room = Math.max(0, p - producedSoFar(detail.receipts, it.productId));
                            return (
                              <span title={`Còn duyệt được ${fmtQty(room)}`}>
                                <b className="text-[#0070f4]">{fmtQty(p)}</b>
                                <span className="text-slate-400"> / còn {fmtQty(room)}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-1.5 px-3">
                          <ProgressBar percent={it.progressPercent} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-xs font-semibold text-[#15171a]">Nguyên vật liệu theo BOM (không hiển thị giá)</div>
            <label className="flex items-center gap-2 text-xs text-[#677484]">
              Tồn tại kho
              <select
                value={availabilityWarehouseId ?? ''}
                onChange={(e) => onChangeWarehouse(Number(e.target.value))}
                className="h-7 px-2 text-xs border border-slate-300 rounded-[6px] bg-white focus:outline-none focus:border-[#0070f4] cursor-pointer"
              >
                {warehouses.map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-3">
            <table className="w-full text-left border-collapse text-xs min-w-[900px]">
              <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
                <tr>
                  <th className="py-2 px-3 w-10 text-center">STT</th>
                  <th className="py-2 px-3 w-32">Mã NVL</th>
                  <th className="py-2 px-3">Tên NVL</th>
                  {s.items && s.items.length > 1 && <th className="py-2 px-3 w-28">Thành phẩm</th>}
                  <th className="py-2 px-3 w-14 text-center">ĐVT</th>
                  <th className="py-2 px-3 w-24 text-right">Định mức/đv</th>
                  <th className="py-2 px-3 w-20 text-right">Hao hụt</th>
                  <th className="py-2 px-3 w-24 text-right">Nhu cầu</th>
                  <th className="py-2 px-3 w-24 text-right">Đã xuất</th>
                  <th className="py-2 px-3 w-24 text-right">Còn thiếu</th>
                  <th className="py-2 px-3 w-24 text-right">Tồn kho</th>
                  <th className="py-2 px-3 w-24 text-center">Tình trạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.materials.map((m, i) => (
                  <tr key={m.requirementId}>
                    <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                    <td className="py-2 px-3 font-mono font-semibold">
                      <ProductCodeLink code={m.materialCode} productId={m.materialId} />
                    </td>
                    <td className="py-2 px-3 font-medium">
                      {m.materialName}
                      {m.isAdjusted && (
                        <span
                          className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-[#d97706] cursor-help"
                          title={`${m.fromBom ? 'Đã điều chỉnh' : 'Thêm ngoài BOM'} bởi ${m.adjustedByName ?? ''} lúc ${fmtDateTime(m.adjustedAt)}: ${m.adjustReason ?? ''}`}
                        >
                          <Sliders size={10} /> {m.fromBom ? 'đã điều chỉnh' : 'ngoài BOM'}
                        </span>
                      )}
                    </td>
                    {s.items && s.items.length > 1 && (
                      <td className="py-2 px-3 font-mono text-[11px] text-[#0070f4]">
                        {m.finishedProductCode ?? s.productCode}
                      </td>
                    )}
                    <td className="py-2 px-3 text-center text-slate-500">{m.unitName}</td>
                    <td className="py-2 px-3 text-right">{fmtNorm(m.normPerUnit)}</td>
                    <td className="py-2 px-3 text-right">{fmtPercent(m.wastageRate)}</td>
                    <td className="py-2 px-3 text-right font-semibold">{fmtQty(m.requiredQty)}</td>
                    <td className="py-2 px-3 text-right">{fmtQty(m.issuedQty)}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${m.shortageQty > 0 ? 'text-[#d97706]' : 'text-[#16a34a]'}`}>
                      {fmtQty(m.shortageQty)}
                    </td>
                    <td className={`py-2 px-3 text-right ${m.availableQty !== null && m.availableQty < m.shortageQty ? 'text-[#fb2c36]' : ''}`}>
                      {m.availableQty === null ? '—' : fmtQty(m.availableQty)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {m.shortageQty <= 0 ? <SmallTag tone="green">Đã xuất đủ</SmallTag> : <SmallTag tone="amber">Còn thiếu</SmallTag>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-4">
            <label className="text-xs text-slate-500 font-medium block mb-1">Ghi chú</label>
            <div className="p-2.5 text-xs border border-slate-200 rounded-[8px] bg-slate-50/60 min-h-[44px] text-slate-700 whitespace-pre-line">
              {detail.notes || 'Chưa có ghi chú'}
            </div>
          </div>
        </>
      )}

      {tab === 'issues' && (
        <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-4">
          <table className="w-full text-left border-collapse text-xs min-w-[820px]">
            <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
              <tr>
                <th className="py-2 px-3 w-28">Mã phiếu</th>
                <th className="py-2 px-3 w-36">Thời gian</th>
                <th className="py-2 px-3 w-40">Kho xuất</th>
                <th className="py-2 px-3">Nguyên vật liệu</th>
                <th className="py-2 px-3 w-24 text-center">Loại</th>
                <th className="py-2 px-3 w-32">Người lập</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.issues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Chưa có phiếu xuất NVL nào (ở các kho bạn được phân quyền)
                  </td>
                </tr>
              ) : (
                detail.issues.map((iss) => (
                  <tr key={iss.stockIssueId} className="align-top">
                    <td className="py-2 px-3 font-mono font-semibold text-[#0070f4]">{iss.issueCode}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{fmtDateTime(iss.issueDate)}</td>
                    <td className="py-2 px-3">{iss.warehouseName}</td>
                    <td className="py-2 px-3">
                      {iss.items.map((it) => (
                        <div key={it.requirementId}>
                          {s.items && s.items.length > 1 && it.finishedProductCode && (
                            <span className="font-mono text-[10px] text-[#0070f4] mr-1">[{it.finishedProductCode}]</span>
                          )}
                          <span className="font-mono">{it.materialCode}</span> · {it.materialName}:{' '}
                          <b>
                            {fmtQty(it.quantity)} {it.unitName}
                          </b>
                        </div>
                      ))}
                      {iss.reason && <div className="text-[11px] text-slate-500 mt-0.5">Lý do: {iss.reason}</div>}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {iss.isSupplementary ? <SmallTag tone="amber">Bổ sung</SmallTag> : <SmallTag tone="blue">Theo lệnh</SmallTag>}
                    </td>
                    <td className="py-2 px-3">{iss.createdByName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'receipts' && (
        <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-4">
          <table className="w-full text-left border-collapse text-xs min-w-[920px]">
            <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
              <tr>
                <th className="py-2 px-3 w-28">Mã phiếu</th>
                <th className="py-2 px-3 w-36">Thời gian</th>
                <th className="py-2 px-3 w-44">Thành phẩm</th>
                <th className="py-2 px-3 w-40">Kho / vị trí</th>
                <th className="py-2 px-3 w-36">Số lô</th>
                <th className="py-2 px-3 w-20 text-right">SL đạt</th>
                <th className="py-2 px-3 w-20 text-right">SL lỗi</th>
                <th className="py-2 px-3">Ghi chú</th>
                <th className="py-2 px-3 w-28">Người nhập</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.receipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400">
                    Chưa có phiếu nhập thành phẩm nào (ở các kho bạn được phân quyền)
                  </td>
                </tr>
              ) : (
                detail.receipts.map((r) => (
                  <tr key={r.fgrId} className={`align-top ${r.needsReview ? 'bg-[#fef2f2]/50' : ''}`}>
                    <td className="py-2 px-3 font-mono font-semibold text-[#0070f4]">
                      {r.fgrCode}
                      {r.needsReview && (
                        <div className="mt-0.5">
                          <SmallTag tone="red">Cần xem xét</SmallTag>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">{fmtDateTime(r.receivedDate)}</td>
                    <td className="py-2 px-3">
                      <span className="font-mono font-semibold">{r.productCode}</span>
                      <div className="text-[11px] text-slate-500">{r.productName}</div>
                    </td>
                    <td className="py-2 px-3">
                      {r.warehouseName}
                      {r.locationName && <div className="text-[11px] text-slate-400">{r.locationName}</div>}
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {r.lotNumber}
                      {r.productionDate && <div className="text-[11px] text-slate-400 font-sans">NSX {fmtDate(r.productionDate)}</div>}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-[#16a34a]">{fmtQty(r.acceptedQuantity)}</td>
                    <td className="py-2 px-3 text-right text-[#fb2c36]">{fmtQty(r.defectQuantity)}</td>
                    <td className="py-2 px-3">
                      {r.defectReason && <div>Lỗi: {r.defectReason}</div>}
                      {r.reviewNote && (
                        <div className="text-[#b45309] flex items-start gap-1">
                          <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {r.reviewNote}
                        </div>
                      )}
                      {r.notes && <div className="text-slate-500">{r.notes}</div>}
                    </td>
                    <td className="py-2 px-3">{r.receivedByName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {features.canPlan && notStarted && (
            <button type="button" onClick={() => onAction('cancel')} className={`${actionBtn} text-rose-600 border-rose-200 hover:bg-rose-50`}>
              <Ban size={13} />
              <span>Hủy lệnh</span>
            </button>
          )}
          {features.canPlan && inProgress && (
            <button type="button" onClick={() => onAction('close')} className={actionBtn}>
              <CheckCircle2 size={13} />
              <span>Đóng lệnh</span>
            </button>
          )}
          {features.canPlan && (notStarted || inProgress) && (
            <button type="button" onClick={() => onAction('adjust')} className={actionBtn}>
              <Sliders size={13} />
              <span>Điều chỉnh định mức</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {features.canIssue && inProgress && (
            <button type="button" onClick={() => onAction('supplement')} className={actionBtn}>
              <PackageMinus size={13} />
              <span>Xuất bổ sung</span>
            </button>
          )}
          {/* Đã xuất đủ NVL theo lệnh → chỉ còn "Xuất bổ sung" */}
          {features.canIssue && (notStarted || inProgress) && !s.isFullyIssued && (
            <button type="button" onClick={() => onAction('issue')} className={primaryBtn}>
              <PackageMinus size={13} />
              <span>Xuất NVL</span>
            </button>
          )}
          {features.canPlan && inProgress && (
            <button
              type="button"
              onClick={() => onAction('approve')}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#16a34a] hover:bg-[#15803d] text-white rounded-[8px] font-semibold cursor-pointer"
              title="Nhập SL thực tế, hệ thống tự sinh phiếu nhập thành phẩm; nhập đủ kế hoạch thì lệnh chuyển Hoàn thành"
            >
              <BadgeCheck size={13} />
              <span>Duyệt hoàn thành</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
