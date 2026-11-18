'use client';

// Ô tìm mặt hàng cho form BOM / lập lệnh / kế hoạch sản xuất (API tra cứu riêng của Sản xuất, không trả giá — BR-39).
// variant="catalog": giống ô tìm của màn Hàng hóa — chỉ hiện gợi ý khi đã gõ, có ảnh, dòng 2 tầng (tên + ĐVT / mã • tồn),
// không có nhãn loại hàng, không có ô "hiện cả thành phẩm", chọn bằng phím ↑ ↓ Enter.

import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { ProductThumb } from '@/components/ProductThumb';
import { productionService } from '../services/productionService';
import type { ProductionProductLookup } from '../types';
import { fmtQty } from '../utils/productionFormat';

interface ProductSearchInputProps {
  placeholder: string;
  onSelect: (product: ProductionProductLookup) => void;
  /** Chỉ thành phẩm có BOM đang áp dụng (lập lệnh, BR-30) */
  activeBomOnly?: boolean;
  /** Lọc theo loại mặt hàng: FINISHED (Thành phẩm) hoặc RAW_MATERIAL (Nguyên vật liệu) */
  productType?: 'FINISHED' | 'RAW_MATERIAL';
  /** Lọc nhiều loại hàng cùng lúc (VD kế hoạch sản xuất: FINISHED + SEMI_FINISHED); dùng thay cho productType */
  productTypes?: string[];
  /** Kho để hiện tồn (tuỳ chọn) */
  warehouseId?: number | null;
  /** Mặt hàng không được chọn (đã có trên form) */
  excludeIds?: number[];
  autoFocus?: boolean;
  disabled?: boolean;
  /** Kiểu hiển thị gợi ý (mặc định: dòng 1 tầng có nhãn loại hàng, mở khi bấm vào ô) */
  variant?: 'default' | 'catalog';
}

export function ProductSearchInput({
  placeholder,
  onSelect,
  activeBomOnly,
  productType,
  productTypes,
  warehouseId,
  excludeIds = [],
  autoFocus,
  disabled,
  variant = 'default',
}: ProductSearchInputProps) {
  const catalog = variant === 'catalog';
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [includeAllTypes, setIncludeAllTypes] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [result, setResult] = useState<{ key: string; items: ProductionProductLookup[] }>({ key: '', items: [] });
  const boxRef = useRef<HTMLDivElement>(null);
  /** Kiểu catalog: toạ độ ô tìm để đặt danh sách position:fixed (không bị khung cuộn của popup cắt) */
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);

  const effectiveType = includeAllTypes ? undefined : productType;
  const typesKey = productTypes?.join(',') ?? '';
  const requestKey = JSON.stringify({
    text: text.trim(),
    activeBomOnly: !!activeBomOnly,
    productType: effectiveType ?? null,
    productTypes: typesKey,
    warehouseId: warehouseId ?? null,
  });
  // Kiểu catalog: chỉ tìm / hiện gợi ý khi đã gõ
  const showList = open && !disabled && (!catalog || text.trim() !== '');
  const loading = showList && result.key !== requestKey;

  useEffect(() => {
    if (!showList) return;
    let stale = false;
    const timer = setTimeout(() => {
      productionService
        .searchProducts({
          search: text,
          activeBomOnly,
          productType: effectiveType,
          productTypes: typesKey ? typesKey.split(',') : undefined,
          warehouseId,
          limit: 20,
        })
        .then((items) => {
          if (!stale) setResult({ key: requestKey, items });
        })
        .catch(() => {
          if (!stale) setResult({ key: requestKey, items: [] });
        });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // requestKey gom đủ tham số tìm kiếm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, showList]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Kiểu catalog: bám theo vị trí ô tìm khi cuộn / đổi kích thước cửa sổ
  useEffect(() => {
    if (!catalog || !showList) return;
    const update = () => {
      const r = boxRef.current?.getBoundingClientRect();
      if (r) setAnchor({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [catalog, showList]);

  const items = result.items.filter((p) => !excludeIds.includes(p.productId));

  const pick = (p: ProductionProductLookup) => {
    onSelect(p);
    setText('');
    setOpen(false);
    setActiveIdx(0);
  };

  return (
    <div className="relative" ref={boxRef}>
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
      <input
        type="text"
        value={text}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActiveIdx(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (!catalog || !showList || loading || items.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, items.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const picked = items[activeIdx];
            if (picked) pick(picked);
          }
        }}
        placeholder={placeholder}
        className={`w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border ${catalog ? 'border-slate-200' : 'border-slate-300'} text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition disabled:opacity-60`}
      />
      {showList && (
        <div
          className={`bg-white border border-slate-200 rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] overflow-y-auto divide-y divide-slate-100 ${
            catalog ? 'fixed z-[60] max-h-[360px]' : 'absolute left-0 right-0 top-full mt-1.5 z-50 max-h-72'
          }`}
          style={catalog && anchor ? { top: anchor.top, left: anchor.left, width: anchor.width } : undefined}
        >
          {productType === 'RAW_MATERIAL' && !catalog && (
            <label className="px-2.5 py-1.5 bg-slate-50 flex items-center justify-between text-[11px] text-[#677484] cursor-pointer select-none">
              <span>Mặc định lọc Nguyên vật liệu</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeAllTypes}
                  onChange={(e) => setIncludeAllTypes(e.target.checked)}
                  className="accent-[#0070f4] cursor-pointer"
                />
                Hiện cả Thành phẩm / Bán TP
              </span>
            </label>
          )}
          {loading ? (
            <div className="p-4 text-center text-[#677484] italic">Đang tìm hàng hóa...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-[#677484]">
              {activeBomOnly
                ? 'Không có thành phẩm có định mức đang áp dụng phù hợp'
                : catalog
                  ? <>Không tìm thấy hàng hóa phù hợp với &quot;{text.trim()}&quot;</>
                  : 'Không tìm thấy hàng hóa phù hợp'}
            </div>
          ) : catalog ? (
            // Giống gợi ý ô tìm của màn Hàng hóa: ảnh, tên + đơn vị, dòng dưới mã • tồn (không nhãn loại hàng)
            items.map((p, idx) => (
              <button
                type="button"
                key={p.productId}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => pick(p)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 cursor-pointer transition ${idx === activeIdx ? 'bg-[#eff6ff]' : 'bg-white'}`}
              >
                <ProductThumb src={p.imageUrl} alt={p.productName} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-[#15171a] truncate">
                    {p.productName} <span className="font-medium text-[#0070f4]">{p.unitName}</span>
                  </div>
                  <div className="text-[12px] text-[#677484] truncate">
                    {p.productCode}
                    {p.availableQty !== null && (
                      <>
                        <span className="mx-1">•</span>
                        Tồn:{' '}
                        <span className={p.availableQty > 0 ? 'text-[#00b63e] font-semibold' : ''}>{fmtQty(p.availableQty)}</span>
                      </>
                    )}
                    {p.hasActiveBom && (
                      <>
                        <span className="mx-1">•</span>
                        <span>Đã có định mức</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            items.map((p) => (
              <button
                type="button"
                key={p.productId}
                onClick={() => pick(p)}
                className="w-full text-left p-2.5 hover:bg-[#eff6ff] flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-[#0070f4] group-hover:underline shrink-0">{p.productCode}</span>
                  <span className="text-[12px] truncate">{p.productName}</span>
                  <span className="text-[10px] px-1.5 rounded-[4px] bg-[#f7f8f9] text-[#677484] shrink-0">{p.unitName}</span>
                  <span
                    className={`text-[10px] px-1.5 rounded-[4px] shrink-0 ${
                      p.productType === 'RAW_MATERIAL' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-[#0070f4]'
                    }`}
                  >
                    {p.productType === 'RAW_MATERIAL' ? 'NVL' : p.productType === 'SEMI_FINISHED' ? 'Bán TP' : 'Thành phẩm'}
                  </span>
                </div>
                {p.availableQty !== null ? (
                  <span className={`text-[11px] font-semibold shrink-0 ${p.availableQty > 0 ? 'text-[#00b63e]' : 'text-[#fb2c36]'}`}>
                    Tồn: {fmtQty(p.availableQty)}
                  </span>
                ) : (
                  p.hasActiveBom && <span className="text-[10px] text-[#16a34a] shrink-0">Có định mức</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
