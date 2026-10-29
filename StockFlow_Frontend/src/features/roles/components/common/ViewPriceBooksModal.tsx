'use client';

import React, { useState, useEffect } from 'react';
import { X, Tag, Info, SlidersHorizontal, CheckCircle2, Lock } from 'lucide-react';
import { PriceBook } from '@/features/price-books/types';
import { priceBookService } from '@/features/price-books/services/priceBookService';
import { GoodsItem } from './GoodsCatalogScreen';

interface ViewPriceBooksModalProps {
  item: GoodsItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');
function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) return '0 ₫';
  return `${currencyFormatter.format(Math.round(value))} ₫`;
}

function calculateFormulaPrice(
  basePrice: number,
  op?: string | null,
  val?: number | null,
  unit?: string | null
): number {
  if (!op || val === undefined || val === null || val <= 0) return Math.round(basePrice);
  let delta = 0;
  if (unit === 'PERCENT') {
    delta = basePrice * (val / 100);
  } else {
    delta = val;
  }
  const res = op === '-' ? basePrice - delta : basePrice + delta;
  return Math.max(0, Math.round(res));
}

export default function ViewPriceBooksModal({
  item,
  isOpen,
  onClose,
}: ViewPriceBooksModalProps) {
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [dbPrices, setDbPrices] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !item) return;

    let isMounted = true;
    setLoading(true);

    Promise.all([
      priceBookService.getPriceBooks(),
      item.code
        ? priceBookService.getPriceMatrix({ search: item.code, pageSize: 5 }).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([books, matrixRes]) => {
        if (!isMounted) return;
        setPriceBooks(books || []);

        if (matrixRes && matrixRes.items && matrixRes.items.length > 0) {
          const matched = matrixRes.items.find(
            (m) =>
              m.productCode.toUpperCase() === (item.code || '').toUpperCase() ||
              (item.productId && m.productId === item.productId)
          );
          if (matched && matched.prices) {
            const mapped: Record<number, number> = {};
            for (const [k, v] of Object.entries(matched.prices)) {
              if (v !== null && v !== undefined) {
                mapped[Number(k)] = v;
              }
            }
            setDbPrices(mapped);
          }
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh sách bảng giá:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const standardBasePrice = item.standardPrice || 0;
  const costPrice = item.costPrice || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0071BA] flex items-center justify-center">
              <SlidersHorizontal size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Thiết lập giá sản phẩm
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                  <Lock size={10} />
                  Chế độ chỉ xem
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem đơn giá áp dụng trên tất cả các bảng giá trong hệ thống
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product Quick Info Card */}
        <div className="p-4 mx-6 mt-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-slate-900 text-sm">{item.name}</div>
            <div className="text-slate-500 text-[11px] mt-0.5 font-mono">
              Mã: <span className="font-semibold text-blue-700">{item.code}</span> • ĐVT: {item.uom}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-medium">Giá bán chung (Giá gốc)</div>
            <div className="font-mono font-bold text-[#0071BA] text-sm mt-0.5">
              {formatCurrency(standardBasePrice)}
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Đang tải danh sách bảng giá...
            </div>
          ) : priceBooks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Chưa có bảng giá nào được thiết lập trong hệ thống.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    <th className="py-2.5 px-4">Tên bảng giá</th>
                    <th className="py-2.5 px-3">Công thức tính</th>
                    <th className="py-2.5 px-4 text-right">Đơn giá áp dụng</th>
                    <th className="py-2.5 px-3 text-center">Phạm vi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {priceBooks.map((pb) => {
                    const isDefault = pb.isDefault;

                    // Tính đơn giá cho bảng giá này
                    let priceVal = dbPrices[pb.priceBookId];
                    if (priceVal === undefined || priceVal === null) {
                      if (isDefault) {
                        priceVal = standardBasePrice;
                      } else if (pb.formulaOperator && pb.formulaValue) {
                        const base = pb.formulaBaseType === 'COST' ? costPrice : standardBasePrice;
                        priceVal = calculateFormulaPrice(
                          base,
                          pb.formulaOperator,
                          pb.formulaValue,
                          pb.formulaUnit
                        );
                      } else {
                        priceVal = standardBasePrice;
                      }
                    }

                    // Nhãn công thức
                    let formulaLabel = 'Giá gốc cố định';
                    if (isDefault) {
                      formulaLabel = 'Bảng giá chung (Giá gốc)';
                    } else if (pb.formulaOperator && pb.formulaValue) {
                      const baseName = pb.formulaBaseType === 'COST' ? 'Giá vốn' : 'Giá chung';
                      const unitStr = pb.formulaUnit === 'PERCENT' ? '%' : ' ₫';
                      formulaLabel = `${baseName} ${pb.formulaOperator} ${pb.formulaValue}${unitStr}`;
                    }

                    return (
                      <tr key={pb.priceBookId} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <span>{pb.priceBookName}</span>
                            {isDefault && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                Mặc định
                              </span>
                            )}
                          </div>
                          {pb.priceBookCode && (
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {pb.priceBookCode}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {formulaLabel}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {formatCurrency(priceVal)}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="text-[11px] text-slate-500">
                            {pb.scopeBranchType === 'ALL' ? 'Toàn công ty' : 'Theo chi nhánh'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Policy Note */}
          <div className="mt-4 p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 flex items-start gap-2 text-xs text-amber-900">
            <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Ghi chú:</strong> Tại danh mục hàng hóa, các bảng giá chỉ hiển thị ở chế độ <strong>Xem</strong> và được tự động sinh theo công thức từ <strong>Bảng giá chung</strong>. Để thay đổi giá gốc hoặc cập nhật công thức, vui lòng truy cập menu <strong>Hàng hóa &gt; Thiết lập giá</strong>.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

