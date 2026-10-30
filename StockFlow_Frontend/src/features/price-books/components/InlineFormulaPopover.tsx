'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check, Search } from 'lucide-react';
import { PriceBook, PriceBookMatrixItem } from '../types';

interface InlineFormulaPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  product: PriceBookMatrixItem;
  priceBook: PriceBook;
  existingPriceBooks: PriceBook[];
  totalCount: number;
  onApplySingle: (newPrice: number) => void;
  onApplyAll: (formula: {
    formulaBaseType: string;
    formulaBasePriceBookId: number | null;
    formulaOperator: '+' | '-';
    formulaValue: number;
    formulaUnit: 'VND' | 'PERCENT';
  }) => Promise<void>;
}

export default function InlineFormulaPopover({
  isOpen,
  onClose,
  product,
  priceBook,
  existingPriceBooks,
  totalCount,
  onApplySingle,
  onApplyAll,
}: InlineFormulaPopoverProps) {
  const [baseType, setBaseType] = useState<string>(priceBook.formulaBaseType || 'STANDARD');
  const [basePriceBookId, setBasePriceBookId] = useState<number | null>(priceBook.formulaBasePriceBookId || null);
  const [operator, setOperator] = useState<'+' | '-'>(priceBook.formulaOperator || '+');
  const [value, setValue] = useState<number | ''>(priceBook.formulaValue ?? 10);
  const [unit, setUnit] = useState<'VND' | 'PERCENT'>(priceBook.formulaUnit || 'PERCENT');
  const [applyToAll, setApplyToAll] = useState(false);
  const [loading, setLoading] = useState(false);

  // Searchable base selector state
  const [isBaseDropdownOpen, setIsBaseDropdownOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen, onClose]);

  const baseNameDisplay = useMemo(() => {
    if (baseType === 'COST') return 'Giá vốn';
    if (baseType === 'STANDARD') return 'Bảng giá chung';
    if (baseType === 'PRICE_BOOK' && basePriceBookId) {
      const b = existingPriceBooks.find(x => x.priceBookId === basePriceBookId);
      return b ? b.priceBookName : 'Bảng giá đã chọn';
    }
    return 'Chọn bảng giá';
  }, [baseType, basePriceBookId, existingPriceBooks]);

  // Compute preview price for the current product
  const calculatedPrice = useMemo(() => {
    let base = 0;
    if (baseType === 'COST') {
      base = product.costPrice || 0;
    } else if (baseType === 'PRICE_BOOK' && basePriceBookId) {
      base = product.prices[basePriceBookId] ?? 0;
    } else {
      // STANDARD: Price from default price book
      const defaultPb = existingPriceBooks.find(b => b.isDefault);
      base = defaultPb ? (product.prices[defaultPb.priceBookId] ?? 0) : 0;
    }

    const numVal = typeof value === 'number' ? value : 0;
    let delta = 0;
    if (unit === 'PERCENT') {
      delta = base * (numVal / 100);
    } else {
      delta = numVal;
    }

    const res = operator === '-' ? base - delta : base + delta;
    return Math.max(0, Math.round(res));
  }, [baseType, basePriceBookId, operator, value, unit, product, existingPriceBooks]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const numVal = typeof value === 'number' ? value : 0;
    if (applyToAll) {
      setLoading(true);
      try {
        await onApplyAll({
          formulaBaseType: baseType || 'STANDARD',
          formulaBasePriceBookId: baseType === 'PRICE_BOOK' ? basePriceBookId : null,
          formulaOperator: operator,
          formulaValue: numVal,
          formulaUnit: unit,
        });
        onClose();
      } finally {
        setLoading(false);
      }
    } else {
      onApplySingle(calculatedPrice);
      onClose();
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-1.5 z-50 w-[380px] rounded-lg border border-slate-200 bg-white p-4 shadow-2xl text-xs text-slate-800 animate-in fade-in duration-150"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <span className="font-bold text-slate-900 text-sm tracking-tight">
          Đặt giá theo công thức
        </span>
      </div>

      {/* Giá mới preview */}
      <div className="mt-3 flex items-center justify-between">
        <span className="font-medium text-slate-700">Giá mới</span>
        <span className="text-sm font-bold text-[#0071BA]">
          [{calculatedPrice.toLocaleString('vi-VN')}]
        </span>
      </div>

      {/* Formula Input Row on 1 Line */}
      <div className="mt-3 flex items-center gap-2 flex-nowrap w-full">
        <span className="font-medium text-slate-600 shrink-0">Giá mới =</span>

        {/* Nguồn giá Dropdown */}
        <div className="relative shrink-0 w-[140px]" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsBaseDropdownOpen(!isBaseDropdownOpen)}
            className="h-8 w-full rounded border border-slate-300 bg-white px-2 flex items-center justify-between text-xs outline-none focus:border-[#0071BA] cursor-pointer hover:border-[#0071BA]"
          >
            <span className="truncate">{baseNameDisplay}</span>
            {isBaseDropdownOpen ? <ChevronUp size={12} className="shrink-0 ml-1" /> : <ChevronDown size={12} className="shrink-0 ml-1" />}
          </button>

          {isBaseDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 w-full min-w-[170px] rounded-md border border-slate-200 bg-white shadow-xl py-1.5 px-1 text-xs space-y-1">
              <div className="px-1 pb-1 border-b border-slate-100">
                <div className="relative">
                  <Search size={12} className="absolute left-2 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    placeholder="Tìm kiếm"
                    className="h-6 w-full rounded border border-slate-300 pl-6 pr-2 text-xs outline-none focus:border-[#0071BA]"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {[
                  { key: 'COST', label: 'Giá vốn' },
                  { key: 'STANDARD', label: 'Bảng giá chung' },
                  ...existingPriceBooks
                    .filter(pb => pb.priceBookId !== priceBook.priceBookId && !pb.isDefault)
                    .map(pb => ({ key: `PB_${pb.priceBookId}`, label: pb.priceBookName })),
                ]
                  .filter(opt => !searchKeyword.trim() || opt.label.toLowerCase().includes(searchKeyword.toLowerCase().trim()))
                  .map(opt => {
                    const isSelected =
                      opt.key === 'COST'
                        ? baseType === 'COST'
                        : opt.key === 'STANDARD'
                        ? baseType === 'STANDARD'
                        : opt.key.startsWith('PB_') && `PB_${basePriceBookId}` === opt.key;

                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          if (opt.key.startsWith('PB_')) {
                            setBaseType('PRICE_BOOK');
                            setBasePriceBookId(Number(opt.key.replace('PB_', '')));
                          } else {
                            setBaseType(opt.key);
                            setBasePriceBookId(null);
                          }
                          setIsBaseDropdownOpen(false);
                          setSearchKeyword('');
                        }}
                        className={`flex w-full items-center justify-between px-2 py-1.5 rounded text-left transition cursor-pointer ${
                          isSelected ? 'bg-blue-50 font-bold text-[#0071BA]' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <Check size={13} className="text-[#0071BA] shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Operator + / - */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setOperator('+')}
            className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs transition cursor-pointer ${
              operator === '+' ? 'border-[#0071BA] bg-[#0071BA] text-white shadow-2xs' : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setOperator('-')}
            className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs transition cursor-pointer ${
              operator === '-' ? 'border-[#0071BA] bg-[#0071BA] text-white shadow-2xs' : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            –
          </button>
        </div>

        {/* Value and Unit */}
        <div className="flex items-center rounded bg-[#f0f2f5] px-2 h-8 border border-transparent focus-within:border-[#0071BA] focus-within:bg-white flex-1 min-w-[100px]">
          <input
            type="text"
            inputMode="numeric"
            value={value === '' ? '' : value.toLocaleString('vi-VN')}
            onChange={e => {
              const raw = e.target.value.replace(/[^0-9]/g, '');
              setValue(raw === '' ? '' : Number(raw));
            }}
            placeholder="0"
            className="w-full bg-transparent text-right text-xs font-semibold text-slate-800 outline-none pr-1.5"
          />
          <div className="flex items-center gap-0.5 border-l border-slate-300 pl-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setUnit('VND')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                unit === 'VND' ? 'bg-[#0071BA] text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              VND
            </button>
            <button
              type="button"
              onClick={() => setUnit('PERCENT')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                unit === 'PERCENT' ? 'bg-[#0071BA] text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              %
            </button>
          </div>
        </div>
      </div>

      {/* Checkbox: Áp dụng công thức này cho tất cả {count} hàng hóa */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <label className="flex items-start gap-2 cursor-pointer select-none text-slate-700">
          <input
            type="checkbox"
            checked={applyToAll}
            onChange={e => setApplyToAll(e.target.checked)}
            className="mt-0.5 rounded accent-[#0071BA] w-3.5 h-3.5 cursor-pointer"
          />
          <span>
            Áp dụng công thức này cho tất cả <strong>{totalCount}</strong> hàng hóa trong{' '}
            <strong>{priceBook.priceBookName}</strong>
          </span>
        </label>
      </div>

      {/* Footer Buttons */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="h-8 px-3 rounded border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
        >
          Bỏ qua
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="h-8 px-4 rounded bg-[#0071BA] hover:bg-[#005f9d] text-xs font-semibold text-white shadow-2xs transition cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Đang áp dụng...' : 'Xong'}
        </button>
      </div>
    </div>
  );
}
