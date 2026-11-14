'use client';

// Chọn khách hàng cụ thể cho phạm vi bảng giá: tìm theo mã / tên / điện thoại trên dữ liệu khách thật
// (GET /api/price-books/customer-options), hiển thị khách đã chọn dạng thẻ, bấm X để bỏ.

import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { priceBookService } from '../services/priceBookService';
import type { PriceBookCustomerRef } from '../types';

interface Props {
  selected: PriceBookCustomerRef[];
  onChange: (customers: PriceBookCustomerRef[]) => void;
}

const label = (c: PriceBookCustomerRef) => `${c.partnerName ?? ''}${c.partnerCode ? ` (${c.partnerCode})` : ''}`;

export default function CustomerScopePicker({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ key: string; items: PriceBookCustomerRef[]; error: string | null }>({
    key: '',
    items: [],
    error: null,
  });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const loading = open && result.key !== query;

  useEffect(() => {
    const t = setTimeout(() => setQuery(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    priceBookService
      .searchCustomers(query)
      .then((items) => alive && setResult({ key: query, items, error: null }))
      .catch((err: unknown) =>
        alive && setResult({ key: query, items: [], error: err instanceof Error ? err.message : 'Không tải được khách hàng.' })
      );
    return () => {
      alive = false;
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const isSelected = (id: number) => selected.some((c) => c.partnerId === id);
  const toggle = (c: PriceBookCustomerRef) =>
    onChange(isSelected(c.partnerId) ? selected.filter((x) => x.partnerId !== c.partnerId) : [...selected, c]);

  return (
    <div className="relative mt-2" ref={wrapperRef}>
      <div
        onClick={() => setOpen(true)}
        className="min-h-[36px] w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 text-xs cursor-pointer hover:border-[#0071BA] transition"
      >
        {selected.length === 0 ? (
          <span className="text-slate-400 select-none">Tìm và chọn khách hàng áp dụng</span>
        ) : (
          selected.map((c) => (
            <span
              key={c.partnerId}
              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-800 border border-slate-200"
            >
              <span>{label(c)}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(selected.filter((x) => x.partnerId !== c.partnerId));
                }}
                className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                aria-label="Bỏ khách hàng"
              >
                <X size={11} />
              </button>
            </span>
          ))
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full rounded-md border border-slate-200 bg-white shadow-xl p-2 text-xs space-y-1">
          <div className="relative mb-1">
            <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Mã, tên hoặc điện thoại khách hàng"
              className="h-7 w-full rounded border border-slate-300 pl-8 pr-2 text-xs outline-none focus:border-[#0071BA]"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {loading ? (
              <p className="text-slate-400 text-center py-2">
                <Loader2 size={13} className="inline animate-spin mr-1" />
                Đang tìm...
              </p>
            ) : result.error ? (
              <p className="text-rose-600 text-center py-2">{result.error}</p>
            ) : result.items.length === 0 ? (
              <p className="text-slate-400 text-center py-2 italic">Không tìm thấy khách hàng</p>
            ) : (
              result.items.map((c) => {
                const checked = isSelected(c.partnerId);
                return (
                  <button
                    key={c.partnerId}
                    type="button"
                    onClick={() => toggle(c)}
                    className={`flex w-full items-center justify-between px-2 py-1.5 rounded text-left transition cursor-pointer ${
                      checked ? 'bg-blue-50/70 font-semibold text-[#0071BA]' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>
                      {label(c)}
                      {c.phone && <span className="text-slate-400 font-normal"> · {c.phone}</span>}
                    </span>
                    {checked && <Check size={13} className="text-[#0071BA]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
