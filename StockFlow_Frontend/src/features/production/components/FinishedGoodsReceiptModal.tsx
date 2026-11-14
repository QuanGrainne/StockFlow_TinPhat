'use client';

// UC-49 Nhập thành phẩm (kèm UC-50 ghi nhận thành phẩm lỗi).
// Production Accountant chọn kho / vị trí, nhập SL đạt, số lô, ngày sản xuất, SL lỗi + lý do theo báo cáo kiểm đếm.
// - Luỹ kế SL đạt ≤ kế hoạch (BR-35, MSG42). Chỉ SL đạt vào tồn kho (BR-36).
// - Cần nhiều NVL hơn số đã xuất → cảnh báo MSG43, bắt buộc ghi chú, phiếu được gắn cờ cho Manager (BR-37).

import React, { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { productionService } from '../services/productionService';
import type { FinishedGoodsReceipt, MaterialUsageWarning, ProductionOrderProductItem, ProductionOrderSummary, WarehouseLocation } from '../types';
import { errorText, fmtQty, parseQty, todayIso } from '../utils/productionFormat';
import { ProductionDialog, btnPrimary, btnSecondary, inputCls, labelCls } from './ProductionDialog';

interface FinishedGoodsReceiptModalProps {
  productionOrderId: number;
  onClose: () => void;
  onDone: (receipt: FinishedGoodsReceipt, orderCompleted: boolean) => void;
}

const DEFECT_REASONS = ['Trầy xước bề mặt / phồng màng', 'Cong vênh do nhiệt', 'Nứt mối nối', 'Sai độ dày', 'Khác'];

export function FinishedGoodsReceiptModal({ productionOrderId, onClose, onDone }: FinishedGoodsReceiptModalProps) {
  const { activeWarehouse, warehouses } = useActiveWarehouse();
  const [order, setOrder] = useState<{ loaded: boolean; summary: ProductionOrderSummary | null; error?: string }>({
    loaded: false,
    summary: null,
  });
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [warehouseId, setWarehouseId] = useState<number>(activeWarehouse.warehouseId);
  const [locations, setLocations] = useState<{ warehouseId: number; items: WarehouseLocation[] }>({ warehouseId: 0, items: [] });
  const [locationId, setLocationId] = useState<number | null>(null);
  const [accepted, setAccepted] = useState('');
  const [defect, setDefect] = useState('');
  const [defectReason, setDefectReason] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [productionDate, setProductionDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<MaterialUsageWarning[] | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [exceedConfirmMsg, setExceedConfirmMsg] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    productionService
      .getOrder(productionOrderId)
      .then((d) => {
        if (stale) return;
        setOrder({ loaded: true, summary: d.summary });
        const itemsList =
          d.summary.items && d.summary.items.length > 0
            ? d.summary.items
            : [
                {
                  productionOrderItemId: 0,
                  productId: d.summary.productId,
                  productCode: d.summary.productCode,
                  productName: d.summary.productName,
                  unitName: d.summary.unitName,
                  bomId: d.summary.bomId,
                  bomCode: d.summary.bomCode,
                  bomVersion: d.summary.bomVersion,
                  plannedQuantity: d.summary.plannedQuantity,
                  receivedQuantity: d.summary.receivedQuantity,
                  remainingQuantity: Math.max(0, d.summary.plannedQuantity - d.summary.receivedQuantity),
                  progressPercent: d.summary.progressPercent,
                  notes: null,
                },
              ];
        // Mặc định chọn thành phẩm đầu tiên còn số lượng chưa nhập kho
        const firstIncomplete = itemsList.find((it) => it.remainingQuantity > 0) ?? itemsList[0];
        if (firstIncomplete) {
          setSelectedProductId(firstIncomplete.productId);
          setAccepted(firstIncomplete.remainingQuantity > 0 ? String(firstIncomplete.remainingQuantity) : '');
        }
        const ymd = todayIso().replace(/-/g, '');
        setLotNumber((prev) => prev || `LOT-${ymd}-${d.summary.code}`);
      })
      .catch((err: unknown) => {
        if (!stale) setOrder({ loaded: true, summary: null, error: errorText(err, 'Không tải được lệnh sản xuất') });
      });
    return () => {
      stale = true;
    };
  }, [productionOrderId]);

  useEffect(() => {
    let stale = false;
    productionService
      .getLocations(warehouseId)
      .then((items) => {
        if (!stale) setLocations({ warehouseId, items });
      })
      .catch(() => {
        if (!stale) setLocations({ warehouseId, items: [] });
      });
    return () => {
      stale = true;
    };
  }, [warehouseId]);

  const summary = order.summary;
  const orderItems: ProductionOrderProductItem[] = useMemo(() => {
    if (!summary) return [];
    return summary.items && summary.items.length > 0
      ? summary.items
      : [
          {
            productionOrderItemId: 0,
            productId: summary.productId,
            productCode: summary.productCode,
            productName: summary.productName,
            unitName: summary.unitName,
            bomId: summary.bomId,
            bomCode: summary.bomCode,
            bomVersion: summary.bomVersion,
            plannedQuantity: summary.plannedQuantity,
            receivedQuantity: summary.receivedQuantity,
            remainingQuantity: Math.max(0, summary.plannedQuantity - summary.receivedQuantity),
            progressPercent: summary.progressPercent,
            notes: null,
          },
        ];
  }, [summary]);

  const activeItem = orderItems.find((it) => it.productId === selectedProductId) ?? orderItems[0] ?? null;

  function selectProductRow(item: ProductionOrderProductItem) {
    setSelectedProductId(item.productId);
    setAccepted(item.remainingQuantity > 0 ? String(item.remainingQuantity) : '');
  }

  const remaining = activeItem ? Math.max(0, activeItem.plannedQuantity - activeItem.receivedQuantity) : 0;
  const acceptedQty = parseQty(accepted);
  const defectQty = defect.trim() === '' ? 0 : parseQty(defect);
  const acceptedError =
    accepted.trim() === ''
      ? null
      : Number.isNaN(acceptedQty) || acceptedQty <= 0
        ? 'Số lượng đạt phải lớn hơn 0.'
        : null;
  const exceedsPlan = !Number.isNaN(acceptedQty) && acceptedQty > 0 && acceptedQty > remaining;
  const defectError = Number.isNaN(defectQty) || defectQty < 0 ? 'Số lượng lỗi không được âm.' : null;
  const defectReasonMissing = defectQty > 0 && !defectReason.trim();

  function validate(): boolean {
    if (!summary || !activeItem) return false;
    if (accepted.trim() === '' || acceptedError) {
      message.error(acceptedError ?? 'Vui lòng nhập số lượng đạt.');
      return false;
    }
    if (defectError) {
      message.error(defectError);
      return false;
    }
    if (defectReasonMissing) {
      message.error('Vui lòng nhập lý do lỗi.');
      return false;
    }
    if (!lotNumber.trim()) {
      message.error('Vui lòng nhập số lô thành phẩm.');
      return false;
    }
    return true;
  }

  async function save(note: string | null, confirmExceed = false) {
    if (!summary || !activeItem) return;
    setBusy(true);
    try {
      const receipt = await productionService.createFinishedGoodsReceipt({
        productionOrderId,
        warehouseId,
        locationId,
        acceptedQuantity: acceptedQty,
        defectQuantity: defectQty,
        defectReason: defectQty > 0 ? defectReason.trim() : null,
        lotNumber: lotNumber.trim(),
        productionDate: productionDate || null,
        notes: notes.trim() || null,
        reviewNote: note,
        productionOrderItemId: activeItem.productionOrderItemId > 0 ? activeItem.productionOrderItemId : null,
        productId: activeItem.productId,
        confirmExceedPlan: confirmExceed,
      });
      const allCompleted = orderItems.every((it) =>
        it.productId === activeItem.productId
          ? it.receivedQuantity + acceptedQty >= it.plannedQuantity - 0.004
          : it.receivedQuantity >= it.plannedQuantity - 0.004
      );
      message.success(`Đã nhập thành phẩm ${receipt.fgrCode}. Tiến độ lệnh sản xuất đã được cập nhật.`);
      if (allCompleted) message.info(`Lệnh sản xuất ${summary.code} đã hoàn thành.`);
      onDone(receipt, allCompleted);
    } catch (err) {
      const msg = errorText(err, 'Không ghi nhận được phiếu nhập thành phẩm');
      if (msg.includes('[CONFIRM_EXCEED_PLAN]')) {
        setExceedConfirmMsg(msg.replace('[CONFIRM_EXCEED_PLAN]', '').trim());
      } else {
        message.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  /** UC-49 bước 8: kiểm tra vượt kế hoạch ([Có]/[Không]) và kiểm tra NVL đã xuất theo BOM trước khi lưu */
  async function confirm(alreadyConfirmedExceed = false) {
    if (!validate() || !summary || !activeItem) return;
    if (exceedsPlan && !alreadyConfirmedExceed) {
      setExceedConfirmMsg(
        `Số lượng thành phẩm sản xuất nhập kho lớn hơn số lượng trên lệnh sản xuất: ${activeItem.productCode}, lệnh sản xuất ${summary.code}. Bạn có muốn lưu chứng từ không?`
      );
      return;
    }
    setBusy(true);
    try {
      const check = await productionService.checkFinishedGoodsReceipt(
        productionOrderId,
        acceptedQty,
        defectQty,
        activeItem.productionOrderItemId > 0 ? activeItem.productionOrderItemId : null,
        activeItem.productId
      );
      if (check.warnings.length > 0) {
        setWarnings(check.warnings);
        setBusy(false);
        return;
      }
    } catch (err) {
      message.error(errorText(err, 'Không kiểm tra được định mức NVL'));
      setBusy(false);
      return;
    }
    setBusy(false);
    await save(null, alreadyConfirmedExceed || exceedsPlan);
  }

  return (
    <>
      <ProductionDialog
        title={
          <span>
            Nhập thành phẩm{summary ? <span className="font-mono text-[#0070f4]"> · {summary.code}</span> : null}
          </span>
        }
        onClose={onClose}
        widthClass="max-w-2xl"
        footer={
          <>
            <button type="button" onClick={onClose} className={btnSecondary}>
              Bỏ qua
            </button>
            <button type="button" disabled={busy || !summary} onClick={() => void confirm(false)} className={btnPrimary}>
              {busy ? 'Đang xử lý...' : 'Xác nhận nhập kho'}
            </button>
          </>
        }
      >
        {!order.loaded ? (
          <div className="py-10 text-center text-slate-400">
            <RefreshCcw size={16} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
            Đang tải lệnh sản xuất...
          </div>
        ) : !summary || !activeItem ? (
          <div className="py-8 text-center text-[#fb2c36]">{order.error}</div>
        ) : (
          <div className="space-y-4">
            {/* Bảng lựa chọn thành phẩm nhập kho (giống MISA 04:18) */}
            <div className="border border-slate-200 rounded-[8px] overflow-hidden bg-slate-50/50">
              <div className="px-3 py-1.5 bg-[#f7f8f9] border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#15171a]">Lựa chọn thành phẩm nhập kho</span>
                <span className="text-[11px] text-[#677484]">Chọn dòng thành phẩm cần ghi nhận nhập kho đợt này</span>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead className="text-[#677484] border-b border-slate-200 bg-white">
                  <tr>
                    <th className="py-1.5 px-3 w-10 text-center">Chọn</th>
                    <th className="py-1.5 px-3 w-28">Mã TP</th>
                    <th className="py-1.5 px-3">Tên thành phẩm</th>
                    <th className="py-1.5 px-3 w-14 text-center">ĐVT</th>
                    <th className="py-1.5 px-3 w-24 text-right">SL theo lệnh</th>
                    <th className="py-1.5 px-3 w-24 text-right">Đã nhập</th>
                    <th className="py-1.5 px-3 w-28 text-right">Chưa nhập kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {orderItems.map((it) => {
                    const isSelected = activeItem.productId === it.productId;
                    const rem = Math.max(0, it.plannedQuantity - it.receivedQuantity);
                    return (
                      <tr
                        key={it.productId}
                        onClick={() => selectProductRow(it)}
                        className={`cursor-pointer ${isSelected ? 'bg-[#e6f1fe]/75 font-medium' : 'hover:bg-slate-50'}`}
                      >
                        <td className="py-1.5 px-3 text-center">
                          <input
                            type="radio"
                            name="fgr-product"
                            checked={isSelected}
                            onChange={() => selectProductRow(it)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-1.5 px-3 font-mono font-semibold text-[#0070f4]">{it.productCode}</td>
                        <td className="py-1.5 px-3">{it.productName}</td>
                        <td className="py-1.5 px-3 text-center text-slate-500">{it.unitName}</td>
                        <td className="py-1.5 px-3 text-right">{fmtQty(it.plannedQuantity)}</td>
                        <td className="py-1.5 px-3 text-right text-[#16a34a]">{fmtQty(it.receivedQuantity)}</td>
                        <td className="py-1.5 px-3 text-right font-bold text-[#0070f4]">{fmtQty(rem)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Kho thành phẩm *</label>
                <select
                  value={warehouseId}
                  onChange={(e) => {
                    setWarehouseId(Number(e.target.value));
                    setLocationId(null);
                  }}
                  className={inputCls}
                >
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Vị trí lưu kho</label>
                <select
                  value={locationId ?? ''}
                  onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : null)}
                  className={inputCls}
                  disabled={locations.warehouseId !== warehouseId || locations.items.length === 0}
                >
                  <option value="">{locations.items.length === 0 ? 'Kho chưa khai báo vị trí' : 'Không chọn vị trí'}</option>
                  {locations.items.map((l) => (
                    <option key={l.locationId} value={l.locationId}>
                      {[l.locationCode, l.locationName].filter(Boolean).join(' · ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  SL đạt (nhập kho) * <span className="text-slate-400">({activeItem.unitName})</span>
                </label>
                <input
                  inputMode="decimal"
                  value={accepted}
                  onChange={(e) => setAccepted(e.target.value)}
                  placeholder={`Còn lại ${fmtQty(remaining)}`}
                  className={`${inputCls} text-right ${
                    acceptedError ? 'border-[#fb2c36]' : exceedsPlan ? 'border-amber-400 bg-amber-50/40' : ''
                  }`}
                />
                {acceptedError && <p className="mt-1 text-xs text-[#fb2c36]">{acceptedError}</p>}
                {!acceptedError && exceedsPlan && (
                  <p className="mt-1 text-xs text-amber-700">
                    Vượt số lượng chưa nhập trên lệnh ({fmtQty(remaining)} {activeItem.unitName}) — sẽ hỏi xác nhận [Có]/[Không] khi lưu.
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>SL lỗi / phế phẩm</label>
                <input
                  inputMode="decimal"
                  value={defect}
                  onChange={(e) => setDefect(e.target.value)}
                  placeholder="0"
                  className={`${inputCls} text-right ${defectError ? 'border-[#fb2c36]' : ''}`}
                />
                {defectError && <p className="mt-1 text-xs text-[#fb2c36]">{defectError}</p>}
              </div>
              {defectQty > 0 && (
                <div className="md:col-span-2">
                  <label className={labelCls}>Lý do lỗi *</label>
                  <input
                    list="stockflow-defect-reasons"
                    value={defectReason}
                    onChange={(e) => setDefectReason(e.target.value)}
                    maxLength={500}
                    placeholder="Chọn hoặc nhập lý do lỗi"
                    className={`${inputCls} ${defectReasonMissing ? 'border-[#fb2c36]' : ''}`}
                  />
                  <datalist id="stockflow-defect-reasons">
                    {DEFECT_REASONS.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-[11px] text-slate-400">Hàng lỗi được ghi riêng, không cộng vào tồn kho bán được.</p>
                </div>
              )}
              <div>
                <label className={labelCls}>Số lô *</label>
                <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} maxLength={50} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Ngày sản xuất</label>
                <input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Ghi chú</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Đóng gói, kiểm tra ngoại quan..."
                  className="w-full px-2.5 py-1.5 text-[13px] border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
                />
              </div>
            </div>
          </div>
        )}
      </ProductionDialog>

      {/* MSG43: cảnh báo dùng NVL vượt số đã xuất (không chặn, bắt buộc ghi chú) */}
      {warnings && (
        <ProductionDialog
          title="Cảnh báo định mức nguyên vật liệu"
          onClose={() => setWarnings(null)}
          widthClass="max-w-xl"
          footer={
            <>
              <button type="button" onClick={() => setWarnings(null)} className={btnSecondary}>
                Quay lại
              </button>
              <button
                type="button"
                disabled={busy || !reviewNote.trim()}
                onClick={async () => {
                  const note = reviewNote.trim();
                  setWarnings(null);
                  await save(note, true);
                }}
                className={btnPrimary}
              >
                Vẫn nhập kho
              </button>
            </>
          }
        >
          <div className="flex items-start gap-2.5 mb-3">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <span>
              Số thành phẩm cần nhiều nguyên vật liệu hơn số đã xuất theo BOM. Vui lòng nhập ghi chú để tiếp tục; phiếu sẽ được
              gắn cờ để Quản lý xem xét.
            </span>
          </div>
          <table className="w-full text-left border-collapse text-xs border border-slate-200 rounded-[8px] mb-3">
            <thead className="bg-[#f7f8f9] font-semibold text-[#677484]">
              <tr>
                <th className="py-2 px-3">NVL</th>
                <th className="py-2 px-3 text-right">Cần theo BOM</th>
                <th className="py-2 px-3 text-right">Đã xuất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {warnings.map((w) => (
                <tr key={w.materialCode}>
                  <td className="py-2 px-3">
                    <span className="font-mono font-semibold">{w.materialCode}</span> · {w.materialName}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-[#fb2c36]">
                    {fmtQty(w.neededQty)} {w.unitName}
                  </td>
                  <td className="py-2 px-3 text-right">{fmtQty(w.issuedQty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <label className={labelCls}>Ghi chú cho Quản lý *</label>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            maxLength={500}
            rows={3}
            autoFocus
            className="w-full px-2.5 py-1.5 text-[13px] border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
          />
        </ProductionDialog>
      )}

      {/* Hộp thoại xác nhận [Có] / [Không] khi nhập vượt số lượng kế hoạch trên lệnh sản xuất (Video 06:37) */}
      {exceedConfirmMsg && (
        <ProductionDialog
          title="Xác nhận nhập vượt số lượng lệnh sản xuất"
          onClose={() => setExceedConfirmMsg(null)}
          widthClass="max-w-md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setExceedConfirmMsg(null)}
                className={btnSecondary}
              >
                Không
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setExceedConfirmMsg(null);
                  await confirm(true);
                }}
                className={btnPrimary}
              >
                Có
              </button>
            </>
          }
        >
          <div className="flex items-start gap-3 text-xs leading-relaxed text-[#15171a]">
            <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <p>{exceedConfirmMsg}</p>
          </div>
        </ProductionDialog>
      )}
    </>
  );
}
