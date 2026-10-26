'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { Supplier } from '@/features/suppliers/types';

interface PurchaseSupplierSelectProps {
  suppliers: Supplier[];
  loading: boolean;
  selectedSupplier: Supplier | null;
  onSelect: (supplier: Supplier | null) => void;
  onOpenQuickAdd: () => void;
}

export function PurchaseSupplierSelect({
  suppliers,
  loading,
  selectedSupplier,
  onSelect,
  onOpenQuickAdd,
}: PurchaseSupplierSelectProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
        <span>Nhà cung cấp *</span>
        {selectedSupplier && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[11px] text-red-500 hover:underline cursor-pointer"
          >
            Bỏ chọn
          </button>
        )}
      </div>

      <div
        className={`min-h-[34px] px-2.5 bg-white border rounded-[6px] flex items-center gap-1.5 transition ${
          open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <Search size={14} className="text-slate-400 shrink-0" />
        {selectedSupplier ? (
          <div className="flex-1 flex items-center justify-between truncate py-1">
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-800 truncate">{selectedSupplier.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {selectedSupplier.code} {selectedSupplier.phone ? `• ${selectedSupplier.phone}` : ''}
              </div>
            </div>
            {typeof selectedSupplier.currentPayable === 'number' && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-mono shrink-0 ml-1">
                Nợ: {selectedSupplier.currentPayable.toLocaleString('vi-VN')} đ
              </span>
            )}
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Tìm nhà cung cấp theo mã, tên, SĐT"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
            />
            <button
              type="button"
              onClick={onOpenQuickAdd}
              className="text-slate-500 hover:text-[#0071BA] p-0.5 rounded transition shrink-0 cursor-pointer"
              title="Thêm nhà cung cấp mới"
            >
              <Plus size={15} />
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg border border-slate-200 shadow-xl py-1 z-40 max-h-[260px] overflow-y-auto">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
            <span>Nhà cung cấp ({filtered.length})</span>
            {loading && <span className="text-[10px] text-blue-500 font-normal">Đang tải...</span>}
          </div>
          {filtered.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              Không tìm thấy nhà cung cấp.
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenQuickAdd();
                }}
                className="block mx-auto mt-1.5 text-[#0071BA] font-medium hover:underline cursor-pointer"
              >
                + Thêm NCC mới
              </button>
            </div>
          ) : (
            filtered.map((supp) => (
              <div
                key={supp.code}
                onClick={() => {
                  onSelect(supp);
                  setOpen(false);
                }}
                className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-b-0"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-medium text-slate-800 truncate">{supp.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {supp.code} {supp.phone ? ` - ${supp.phone}` : ''}
                  </div>
                </div>
                {typeof supp.currentPayable === 'number' && supp.currentPayable > 0 && (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-mono shrink-0">
                    Nợ: {supp.currentPayable.toLocaleString('vi-VN')} đ
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
