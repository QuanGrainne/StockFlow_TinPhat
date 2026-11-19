// src/features/products/components/StockCardTab.tsx
// Tab "Thẻ kho" trong chi tiết hàng hóa: lịch sử biến động SL & giá vốn tại 1 chi nhánh (mới nhất trước).
// Chỉ xem và xuất file — các dòng do hệ thống tự ghi khi nhập / bán / trả hàng / chuyển / kiểm kho / sửa giá vốn.

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ChevronLeft, ChevronRight, FileOutput, Info, Loader2, Warehouse } from 'lucide-react';
import { productService, type StockCardEntry } from '../services/goodsCatalogService';
import { StockCardDocumentModal, type StockCardDocumentRef } from './StockCardDocumentModal';
import { formatCost } from '@/lib/utils/cost';

export interface StockCardWarehouseOption {
  warehouseId: number;
  name: string;
}

interface StockCardTabProps {
  productId?: number;
  productCode: string;
  productName: string;
  /** Các chi nhánh người dùng được xem */
  warehouses: StockCardWarehouseOption[];
  /** Chi nhánh mở mặc định (chi nhánh đang làm việc) */
  defaultWarehouseId?: number;
  /** Ẩn cột Giá vốn với vai trò không được xem giá vốn */
  canViewCost: boolean;
}

const PAGE_SIZE = 10;

const fmtNumber = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : Math.round(n).toLocaleString('vi-VN');

const fmtQty = (n: number) => {
  const text = Math.abs(n).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  return n > 0 ? `+${text}` : n < 0 ? `-${text}` : '0';
};

/** "2026-11-02T23:13:00" → "02/11/2026 23:13" (giờ đã lưu theo giờ Việt Nam, không đổi múi giờ) */
function fmtDateTime(value: string | null): string {
  if (!value) return '';
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

export function StockCardTab({
  productId,
  productCode,
  productName,
  warehouses,
  defaultWarehouseId,
  canViewCost,
}: StockCardTabProps) {
  const [warehouseId, setWarehouseId] = useState<number | undefined>(
    defaultWarehouseId ?? warehouses[0]?.warehouseId
  );
  // Kết quả tải gắn với khóa (hàng + chi nhánh): khóa hiện tại chưa có kết quả → đang tải
  const requestKey = productId && warehouseId ? `${productId}@${warehouseId}` : null;
  const [result, setResult] = useState<{ key: string; rows: StockCardEntry[]; error: string | null } | null>(null);
  const [page, setPage] = useState(1);
  const [openDoc, setOpenDoc] = useState<StockCardDocumentRef | null>(null);
  const loading = requestKey !== null && result?.key !== requestKey;
  const rows = useMemo(() => (result && result.key === requestKey ? result.rows : []), [result, requestKey]);
  const error = result && result.key === requestKey ? result.error : null;

  useEffect(() => {
    if (!productId || !warehouseId || !requestKey) return;
    let cancelled = false;
    productService
      .getStockCard(productId, warehouseId)
      .then((data) => {
        if (cancelled) return;
        setResult({ key: requestKey, rows: Array.isArray(data) ? data : [], error: null });
        setPage(1);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({ key: requestKey, rows: [], error: err instanceof Error ? err.message : 'Không tải được thẻ kho.' });
      });
    return () => {
      cancelled = true;
    };
  }, [productId, warehouseId, requestKey]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);
  const warehouseName = warehouses.find((w) => w.warehouseId === warehouseId)?.name ?? '';

  const handleExport = () => {
    const header = ['Chứng từ', 'Thời gian', 'Loại giao dịch', 'Giá GD', ...(canViewCost ? ['Giá vốn'] : []), 'Số lượng', 'Tồn cuối', 'Đối tác'];
    const body = rows.map((r) => [
      r.documentCode,
      fmtDateTime(r.transactionDate),
      r.transactionTypeName,
      r.transactionPrice ?? '',
      ...(canViewCost ? [r.unitCost ?? ''] : []),
      r.quantity,
      r.endingBalance,
      r.partnerName ?? '',
    ]);
    const aoa = [
      [`THẺ KHO – ${productCode} – ${productName}`],
      [`Chi nhánh: ${warehouseName}`],
      [],
      header,
      ...body,
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, ...(canViewCost ? [{ wch: 14 }] : []), { wch: 10 }, { wch: 10 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'The kho');
    XLSX.writeFile(wb, `TheKho_${productCode}_${warehouseName.replace(/\s+/g, '')}.xlsx`);
  };

  const documentModal = openDoc ? <StockCardDocumentModal doc={openDoc} onClose={() => setOpenDoc(null)} /> : null;

  if (!productId) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-8 text-center text-xs text-slate-400">
        Hàng hóa chưa được lưu trên hệ thống nên chưa có thẻ kho.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      {/* Chọn chi nhánh */}
      <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Lịch sử biến động số lượng và giá vốn, giao dịch mới nhất ở trên cùng.
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
          <Warehouse size={13} className="text-slate-500" />
          <span>Chi nhánh</span>
          <select
            value={warehouseId ?? ''}
            onChange={(e) => setWarehouseId(Number(e.target.value) || undefined)}
            className="h-7 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-[#0070f4] cursor-pointer"
          >
            {warehouses.map((w) => (
              <option key={w.warehouseId} value={w.warehouseId}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13px] min-w-[860px]">
          <thead>
            <tr className="bg-[#f1f3f6] text-[12px] font-semibold text-slate-700">
              <th className="py-2.5 px-3">Chứng từ</th>
              <th className="py-2.5 px-3">Thời gian</th>
              <th className="py-2.5 px-3">Loại giao dịch</th>
              <th className="py-2.5 px-3 text-right">
                <span className="inline-flex items-center gap-1">
                  Giá GD
                  <span title="Giá giao dịch: đơn giá mua vào / bán ra trên chứng từ. Để trống nếu chỉ sửa giá vốn hoặc kiểm kho.">
                    <Info size={13} className="text-slate-500 cursor-help" />
                  </span>
                </span>
              </th>
              {canViewCost && <th className="py-2.5 px-3 text-right">Giá vốn</th>}
              <th className="py-2.5 px-3 text-right">Số lượng</th>
              <th className="py-2.5 px-3 text-right">Tồn cuối</th>
              <th className="py-2.5 px-3">Đối tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={canViewCost ? 8 : 7} className="py-8 text-center text-slate-400">
                  <Loader2 size={16} className="inline animate-spin mr-1.5" />
                  Đang tải thẻ kho...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={canViewCost ? 8 : 7} className="py-8 text-center text-rose-600">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={canViewCost ? 8 : 7} className="py-8 text-center text-slate-400">
                  Chưa phát sinh giao dịch kho cho hàng hóa này tại {warehouseName || 'chi nhánh đã chọn'}.
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
                <tr key={r.transactionId} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                    {r.documentId && r.referenceType ? (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenDoc({ referenceType: r.referenceType as string, documentId: r.documentId as number, documentCode: r.documentCode })
                        }
                        className="text-[#0070f4] hover:underline cursor-pointer"
                        title={`Xem phiếu ${r.documentCode}`}
                      >
                        {r.documentCode}
                      </button>
                    ) : (
                      <span className="text-[#0070f4]">{r.documentCode}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{fmtDateTime(r.transactionDate)}</td>
                  <td className="py-2.5 px-3 text-slate-800">{r.transactionTypeName}</td>
                  <td className="py-2.5 px-3 text-right text-slate-800">{fmtNumber(r.transactionPrice)}</td>
                  {canViewCost && <td className="py-2.5 px-3 text-right text-slate-800">{formatCost(r.unitCost)}</td>}
                  <td
                    className={`py-2.5 px-3 text-right font-medium ${
                      r.quantity > 0 ? 'text-emerald-600' : r.quantity < 0 ? 'text-rose-600' : 'text-slate-800'
                    }`}
                  >
                    {fmtQty(r.quantity)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                    {r.endingBalance.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{r.partnerName ?? ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Chân bảng: xuất file + phân trang */}
      <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileOutput size={14} />
          <span>Xuất file</span>
        </button>

        {rows.length > PAGE_SIZE && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} / {rows.length} giao dịch
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-default"
              aria-label="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-semibold">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-default"
              aria-label="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
      {documentModal}
    </div>
  );
}
