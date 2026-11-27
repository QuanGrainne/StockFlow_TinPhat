'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, Info, Check, Trash2, Search } from 'lucide-react';
import {
  PriceBook,
  CreatePriceBookPayload,
  UpdatePriceBookPayload,
  PriceBookCustomerRef,
  PriceBookWarehouseOption,
} from '../types';
import { priceBookService } from '../services/priceBookService';
import CustomerScopePicker from './CustomerScopePicker';
import { toLocalDatetimeInputString } from '@/lib/utils/date';

interface MultiSelectScopeInputProps<T extends string | number> {
  placeholder: string;
  options: { value: T; label: string }[];
  selectedValues: T[];
  onChange: (vals: T[]) => void;
}

function MultiSelectScopeInput<T extends string | number>({
  placeholder,
  options,
  selectedValues,
  onChange,
}: MultiSelectScopeInputProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const filtered = options.filter(opt =>
    !keyword.trim() || opt.label.toLowerCase().includes(keyword.toLowerCase().trim())
  );

  return (
    <div className="relative mt-2" ref={wrapperRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[36px] w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 text-xs cursor-pointer hover:border-[#0071BA] focus-within:border-[#0071BA] transition"
      >
        {selectedValues.length === 0 ? (
          <span className="text-slate-400 select-none">{placeholder}</span>
        ) : (
          selectedValues.map(val => {
            const item = options.find(o => o.value === val);
            return (
              <span
                key={String(val)}
                className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-800 border border-slate-200 select-none shadow-2xs"
              >
                <span>{item?.label || val}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(selectedValues.filter(v => v !== val));
                  }}
                  className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                >
                  <X size={11} />
                </button>
              </span>
            );
          })
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full rounded-md border border-slate-200 bg-white shadow-xl p-2 text-xs space-y-1 animate-in fade-in duration-100">
          <div className="relative mb-1">
            <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Tìm kiếm..."
              className="h-7 w-full rounded border border-slate-300 pl-8 pr-2 text-xs outline-none focus:border-[#0071BA]"
              autoFocus
            />
          </div>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {filtered.map(opt => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <label
                  key={String(opt.value)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition ${
                    isChecked ? 'bg-blue-50/70 font-semibold text-[#0071BA]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          onChange(selectedValues.filter(v => v !== opt.value));
                        } else {
                          onChange([...selectedValues, opt.value]);
                        }
                      }}
                      className="accent-[#0071BA] rounded"
                    />
                    <span>{opt.label}</span>
                  </div>
                  {isChecked && <Check size={13} className="text-[#0071BA]" />}
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-slate-400 text-center py-2 italic">Không tìm thấy dữ liệu</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CreatePriceBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (saved: PriceBook) => void;
  onDelete?: (id: number) => void;
  editingPriceBook?: PriceBook | null;
  existingPriceBooks?: PriceBook[];
}

export default function CreatePriceBookModal({
  isOpen,
  onClose,
  onSuccess,
  onDelete,
  editingPriceBook,
  existingPriceBooks = [],
}: CreatePriceBookModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'scope'>('info');

  // Accordion toggles
  const [expandValidity, setExpandValidity] = useState(true);
  const [expandFormula, setExpandFormula] = useState(true);
  const [expandOrderRule, setExpandOrderRule] = useState(true);

  // Form states - Tab 1
  // Khởi tạo từ bảng giá đang sửa (màn cha gắn key theo bảng giá nên mỗi lần mở là form mới,
  // không cần useEffect đồng bộ state). Giờ hiệu lực: server lưu giờ Việt Nam → hiển thị nguyên giờ đó;
  // bảng giá mới mặc định từ bây giờ đến 1 năm sau theo giờ địa phương (toISOString().slice là UTC → lệch 7 tiếng).
  const pb = editingPriceBook ?? null;
  const [priceBookName, setPriceBookName] = useState(() => pb?.priceBookName ?? '');
  const [effectiveFrom, setEffectiveFrom] = useState(() =>
    pb ? (pb.effectiveFrom ? toLocalDatetimeInputString(pb.effectiveFrom) : '') : toLocalDatetimeInputString(new Date())
  );
  const [effectiveTo, setEffectiveTo] = useState(() => {
    if (pb) return pb.effectiveTo ? toLocalDatetimeInputString(pb.effectiveTo) : '';
    const inOneYear = new Date();
    inOneYear.setFullYear(inOneYear.getFullYear() + 1);
    return toLocalDatetimeInputString(inOneYear);
  });
  const [isActive, setIsActive] = useState(() => pb?.isActive ?? true);

  const [formulaBaseType, setFormulaBaseType] = useState<string>(() => pb?.formulaBaseType ?? '');
  const [formulaBasePriceBookId, setFormulaBasePriceBookId] = useState<number | null>(() => pb?.formulaBasePriceBookId ?? null);
  const [formulaOperator, setFormulaOperator] = useState<'+' | '-'>(() => pb?.formulaOperator ?? '+');
  const [formulaValue, setFormulaValue] = useState<number | ''>(() => pb?.formulaValue ?? '');
  const [formulaUnit, setFormulaUnit] = useState<'VND' | 'PERCENT'>(() => (pb?.formulaUnit === 'PERCENT' ? 'PERCENT' : 'VND'));

  // Checkboxes mở rộng dưới công thức giá
  const [autoUpdateByBase, setAutoUpdateByBase] = useState(() => (pb ? Boolean(pb.formulaBaseType) : true));
  const [includeProductsFromBase, setIncludeProductsFromBase] = useState(false);

  // Custom searchable dropdown for base price book
  const [isBaseTypeDropdownOpen, setIsBaseTypeDropdownOpen] = useState(false);
  const [baseSearchKeyword, setBaseSearchKeyword] = useState('');
  const baseTypeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (baseTypeDropdownRef.current && !baseTypeDropdownRef.current.contains(e.target as Node)) {
        setIsBaseTypeDropdownOpen(false);
      }
    };
    if (isBaseTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBaseTypeDropdownOpen]);

  const baseNameDisplay = React.useMemo(() => {
    if (formulaBaseType === 'COST') return 'Giá vốn';
    if (formulaBaseType === 'LATEST_PURCHASE') return 'Giá nhập cuối';
    if (formulaBaseType === 'STANDARD') return 'Bảng giá chung';
    if (formulaBaseType === 'PRICE_BOOK' && formulaBasePriceBookId) {
      const b = existingPriceBooks.find(x => x.priceBookId === formulaBasePriceBookId);
      return b ? b.priceBookName : 'Bảng giá đã chọn';
    }
    return 'Chọn bảng giá';
  }, [formulaBaseType, formulaBasePriceBookId, existingPriceBooks]);

  const [allowUnlistedProducts, setAllowUnlistedProducts] = useState(() => pb?.allowUnlistedProducts ?? true);
  const [warnUnlistedProducts, setWarnUnlistedProducts] = useState(() => pb?.warnUnlistedProducts ?? false);

  // Form states - Tab 2 (Phạm vi áp dụng)
  const [scopeBranchType, setScopeBranchType] = useState<'ALL' | 'SPECIFIC'>(() => pb?.scopeBranchType ?? 'ALL');
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<number[]>(() => pb?.scopeWarehouseIds ?? []);

  // Khách hàng cụ thể (dữ liệu khách thật); "Nhóm khách hàng" và "Người tạo giao dịch" đã bỏ
  const [scopeCustomerType, setScopeCustomerType] = useState<'ALL' | 'SPECIFIC'>(() => pb?.scopeCustomerType ?? 'ALL');
  const [selectedCustomers, setSelectedCustomers] = useState<PriceBookCustomerRef[]>(() => pb?.scopeCustomers ?? []);

  // Chi nhánh đang hoạt động từ /api/warehouses
  const [warehouses, setWarehouses] = useState<PriceBookWarehouseOption[]>([]);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    priceBookService
      .getActiveWarehouses()
      .then((res) => {
        if (!alive) return;
        setWarehouses(res);
        setWarehouseError(null);
      })
      .catch((err: unknown) => alive && setWarehouseError(err instanceof Error ? err.message : 'Không tải được danh sách chi nhánh.'));
    return () => {
      alive = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceBookName.trim()) {
      setErrorMsg('Tên bảng giá không được để trống.');
      setActiveTab('info');
      return;
    }
    if (effectiveFrom && effectiveTo && new Date(effectiveFrom) > new Date(effectiveTo)) {
      setErrorMsg('Ngày bắt đầu hiệu lực phải trước ngày kết thúc.');
      setActiveTab('info');
      return;
    }
    if (formulaBaseType === 'PRICE_BOOK' && !formulaBasePriceBookId) {
      setErrorMsg('Vui lòng chọn bảng giá nguồn cho công thức.');
      setActiveTab('info');
      return;
    }
    if (scopeBranchType === 'SPECIFIC' && selectedWarehouseIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một chi nhánh áp dụng.');
      setActiveTab('scope');
      return;
    }
    if (scopeCustomerType === 'SPECIFIC' && selectedCustomers.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một khách hàng áp dụng.');
      setActiveTab('scope');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Có chọn nguồn giá thì luôn gửi công thức để tính giá; "Tự động cập nhật" quyết định có giữ liên kết hay không
      // (trước đây bỏ tick "Tự động cập nhật" thì công thức bị bỏ luôn, nên "Thêm hàng hóa từ nguồn" không tính được giá)
      const hasFormula = Boolean(formulaBaseType);
      const payload: CreatePriceBookPayload = {
        priceBookName: priceBookName.trim(),
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : null,
        effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
        isActive,
        formulaBaseType: hasFormula ? formulaBaseType : null,
        formulaBasePriceBookId: formulaBaseType === 'PRICE_BOOK' ? formulaBasePriceBookId : null,
        formulaOperator: hasFormula ? formulaOperator : null,
        formulaValue: hasFormula ? (formulaValue !== '' ? Number(formulaValue) : 0) : null,
        formulaUnit: hasFormula ? formulaUnit || 'VND' : null,
        allowUnlistedProducts,
        warnUnlistedProducts: allowUnlistedProducts ? warnUnlistedProducts : false,
        scopeBranchType,
        scopeWarehouseIds: scopeBranchType === 'SPECIFIC' ? selectedWarehouseIds : [],
        scopeCustomerType,
        scopeCustomerIds: scopeCustomerType === 'SPECIFIC' ? selectedCustomers.map((c) => c.partnerId) : [],
        autoApplyFormula: includeProductsFromBase,
        linkFormula: autoUpdateByBase,
      };

      let result: PriceBook;
      if (editingPriceBook) {
        const updatePayload: UpdatePriceBookPayload = {
          ...payload,
          priceBookId: editingPriceBook.priceBookId,
          recalculateFormula: hasFormula && autoUpdateByBase,
        };
        result = await priceBookService.updatePriceBook(editingPriceBook.priceBookId, updatePayload);
      } else {
        result = await priceBookService.createPriceBook(payload);
      }

      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu bảng giá.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-[660px] flex-col rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
          <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
            {editingPriceBook ? 'Cập nhật bảng giá' : 'Tạo bảng giá'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 text-sm font-semibold transition border-b-2 mr-6 ${
              activeTab === 'info'
                ? 'border-[#0071BA] text-[#0071BA]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Thông tin
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scope')}
            className={`pb-2.5 text-sm font-semibold transition border-b-2 ${
              activeTab === 'scope'
                ? 'border-[#0071BA] text-[#0071BA]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Phạm vi áp dụng
          </button>
        </div>

        {/* Form Body */}
        <form noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-slate-800">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* TAB 1: THÔNG TIN */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Tên bảng giá */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên bảng giá <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={priceBookName}
                  onChange={e => setPriceBookName(e.target.value)}
                  placeholder="Nhập tên bảng giá (vd: Bảng giá khách VIP, Bảng giá sỉ...)"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0071BA] focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              {/* Accordion: Hiệu lực */}
              <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandValidity(!expandValidity)}
                  className="flex w-full items-center justify-between px-4 py-3 bg-slate-50/80 hover:bg-slate-100/70 transition text-left rounded-t-lg"
                >
                  <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">Hiệu lực</span>
                  {expandValidity ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </button>

                {expandValidity && (
                  <div className="p-4 space-y-3.5 border-t border-slate-100 text-xs text-slate-700">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-16 font-medium text-slate-600">Hiệu lực:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={effectiveFrom}
                          onChange={e => setEffectiveFrom(e.target.value)}
                          className="h-8 rounded border border-slate-300 px-2.5 text-xs text-slate-700 outline-none focus:border-[#0071BA]"
                        />
                        <span className="text-slate-400">đến</span>
                        <input
                          type="datetime-local"
                          value={effectiveTo}
                          onChange={e => setEffectiveTo(e.target.value)}
                          className="h-8 rounded border border-slate-300 px-2.5 text-xs text-slate-700 outline-none focus:border-[#0071BA]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="w-16 font-medium text-slate-600">Trạng thái:</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status_radio"
                          checked={isActive === true}
                          onChange={() => setIsActive(true)}
                          className="accent-[#0071BA]"
                        />
                        <span className="font-medium text-slate-800">Áp dụng</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status_radio"
                          checked={isActive === false}
                          onChange={() => setIsActive(false)}
                          disabled={Boolean(editingPriceBook?.isDefault)}
                          className="accent-[#0071BA]"
                        />
                        <span className="font-medium text-slate-800">Chưa áp dụng</span>
                      </label>
                      {editingPriceBook?.isDefault && (
                        <span className="text-[11px] text-slate-500">Bảng giá chung luôn áp dụng</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion: Công thức giá */}
              <div className="rounded-lg border border-slate-200 bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={() => setExpandFormula(!expandFormula)}
                  className="flex w-full items-center justify-between px-4 py-3 bg-slate-50/80 hover:bg-slate-100/70 transition text-left"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">Công thức giá</span>
                    <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                      Tạo công thức dựa trên giá vốn, giá nhập hoặc giá bán ở các bảng giá khác
                    </p>
                  </div>
                  {expandFormula ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </button>

                {expandFormula && (
                  <div className="p-4 border-t border-slate-100 space-y-3 text-xs">
                    {/* Hiển thị trên 1 HÀNG duy nhất */}
                    <div className="flex items-center gap-2 flex-nowrap w-full">
                      <span className="font-medium text-slate-700 shrink-0 whitespace-nowrap text-xs">Giá mới =</span>

                      {/* Dropdown chọn nguồn giá: Chỉ cần Giá vốn và Bảng giá chung */}
                      <div className="relative shrink-0 w-[170px]" ref={baseTypeDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsBaseTypeDropdownOpen(!isBaseTypeDropdownOpen)}
                          className="h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 flex items-center justify-between text-xs text-slate-700 outline-none focus:border-[#0071BA] cursor-pointer hover:border-[#0071BA] transition"
                        >
                          <span className="truncate font-medium">{baseNameDisplay}</span>
                          {isBaseTypeDropdownOpen ? (
                            <ChevronUp size={13} className="text-slate-500 shrink-0 ml-1" />
                          ) : (
                            <ChevronDown size={13} className="text-slate-500 shrink-0 ml-1" />
                          )}
                        </button>

                        {isBaseTypeDropdownOpen && (
                          <div className="absolute left-0 top-full mt-1 z-[100] w-full min-w-[195px] rounded-md border border-slate-200 bg-white shadow-2xl py-2 px-1 text-xs space-y-1 animate-in fade-in duration-100">
                            {/* Ô tìm kiếm */}
                            <div className="px-1.5 pb-1 border-b border-slate-100">
                              <div className="relative">
                                <Search size={13} className="absolute left-2 top-2 text-slate-400" />
                                <input
                                  type="text"
                                  value={baseSearchKeyword}
                                  onChange={e => setBaseSearchKeyword(e.target.value)}
                                  placeholder="Tìm kiếm"
                                  className="h-7 w-full rounded border border-slate-300 bg-white pl-7 pr-2 text-xs text-slate-700 outline-none focus:border-[#0071BA] placeholder:text-slate-400"
                                  autoFocus
                                />
                              </div>
                            </div>

                            {/* Danh sách tùy chọn: CHỈ CẦN Giá vốn và Bảng giá chung */}
                            <div className="max-h-44 overflow-y-auto space-y-0.5">
                              {[
                                { key: '', label: 'Chọn bảng giá' },
                                { key: 'COST', label: 'Giá vốn' },
                                { key: 'LATEST_PURCHASE', label: 'Giá nhập cuối' },
                                { key: 'STANDARD', label: 'Bảng giá chung' },
                                ...existingPriceBooks
                                  .filter(pb => !pb.isDefault && (!editingPriceBook || pb.priceBookId !== editingPriceBook.priceBookId))
                                  .map(pb => ({ key: `PB_${pb.priceBookId}`, label: pb.priceBookName })),
                              ]
                                .filter(opt => !baseSearchKeyword.trim() || opt.label.toLowerCase().includes(baseSearchKeyword.toLowerCase().trim()))
                                .map(opt => {
                                  const isSelected =
                                    opt.key === ''
                                      ? !formulaBaseType
                                      : opt.key === 'COST'
                                      ? formulaBaseType === 'COST'
                                      : opt.key === 'LATEST_PURCHASE'
                                      ? formulaBaseType === 'LATEST_PURCHASE'
                                      : opt.key === 'STANDARD'
                                      ? formulaBaseType === 'STANDARD'
                                      : formulaBaseType === 'PRICE_BOOK' && `PB_${formulaBasePriceBookId}` === opt.key;

                                  return (
                                    <button
                                      key={opt.key}
                                      type="button"
                                      onClick={() => {
                                        if (opt.key === '') {
                                          setFormulaBaseType('');
                                          setFormulaBasePriceBookId(null);
                                        } else if (opt.key.startsWith('PB_')) {
                                          setFormulaBaseType('PRICE_BOOK');
                                          setFormulaBasePriceBookId(Number(opt.key.replace('PB_', '')));
                                        } else {
                                          setFormulaBaseType(opt.key);
                                          setFormulaBasePriceBookId(null);
                                        }
                                        setIsBaseTypeDropdownOpen(false);
                                        setBaseSearchKeyword('');
                                      }}
                                      className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded text-left transition cursor-pointer ${
                                        isSelected ? 'bg-blue-50/80 font-bold text-[#0071BA]' : 'text-slate-700 hover:bg-slate-100/70'
                                      }`}
                                    >
                                      <span className="truncate">{opt.label}</span>
                                      {isSelected && <Check size={14} className="text-[#0071BA] shrink-0 ml-1.5" />}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Toán tử + / - dạng nút tròn */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setFormulaOperator('+')}
                          className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition cursor-pointer ${
                            formulaOperator === '+'
                              ? 'border-[#0071BA] bg-[#0071BA] text-white shadow-2xs'
                              : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'
                          }`}
                          title="Cộng thêm"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormulaOperator('-')}
                          className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition cursor-pointer ${
                            formulaOperator === '-'
                              ? 'border-[#0071BA] bg-[#0071BA] text-white shadow-2xs'
                              : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'
                          }`}
                          title="Trừ đi"
                        >
                          –
                        </button>
                      </div>

                      {/* Ô nhập giá trị và chọn đơn vị VND / % tích hợp trong 1 ô */}
                      <div className="flex items-center rounded-md bg-[#f0f2f5] px-2.5 h-8 border border-transparent focus-within:border-[#0071BA] focus-within:bg-white transition flex-1 min-w-[150px]">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            formulaValue === ''
                              ? ''
                              : formulaUnit === 'PERCENT'
                                ? formulaValue
                                : typeof formulaValue === 'number'
                                  ? formulaValue.toLocaleString('vi-VN')
                                  : formulaValue
                          }
                          onChange={e => {
                            const val = e.target.value;
                            if (formulaUnit === 'PERCENT') {
                              const normalized = val.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                              if (normalized === '') {
                                setFormulaValue('');
                              } else {
                                const parsed = parseFloat(normalized);
                                setFormulaValue(isNaN(parsed) ? '' : parsed);
                              }
                            } else {
                              const rawDigits = val.replace(/[^0-9]/g, '');
                              setFormulaValue(rawDigits === '' ? '' : Number(rawDigits));
                            }
                          }}
                          placeholder="0"
                          className="w-full bg-transparent text-right text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 pr-2"
                        />

                        {/* Đơn vị VND / % dạng nút */}
                        <div className="flex items-center gap-1 border-l border-slate-300/70 pl-2 text-xs select-none shrink-0">
                          <button
                            type="button"
                            onClick={() => setFormulaUnit('VND')}
                            className={`px-2 py-0.5 rounded text-xs transition cursor-pointer ${
                              formulaUnit === 'VND'
                                ? 'bg-[#0071BA] text-white font-bold shadow-2xs'
                                : 'text-slate-500 hover:text-slate-700 font-medium'
                            }`}
                          >
                            VND
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormulaUnit('PERCENT')}
                            className={`px-2 py-0.5 rounded text-xs transition cursor-pointer ${
                              formulaUnit === 'PERCENT'
                                ? 'bg-[#0071BA] text-white font-bold shadow-2xs'
                                : 'text-slate-500 hover:text-slate-700 font-medium'
                            }`}
                          >
                            %
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 3 Checkboxes mở rộng - Chỉ hiển thị khi ĐÃ CHỌN nguồn giá */}
                    {Boolean(formulaBaseType) && (
                      <div className="space-y-2 pt-2.5 border-t border-slate-100">
                        {/* 1. Tự động cập nhật giá theo nguồn giá đã chọn */}
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={autoUpdateByBase}
                            onChange={e => setAutoUpdateByBase(e.target.checked)}
                            className="rounded accent-[#0071BA] w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>
                            Tự động cập nhật giá theo <strong>{baseNameDisplay}</strong>
                          </span>
                        </label>

                        {/* 2. Thêm hàng hóa từ nguồn giá đã chọn khi tạo bảng giá này */}
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={includeProductsFromBase}
                            onChange={e => setIncludeProductsFromBase(e.target.checked)}
                            className="rounded accent-[#0071BA] w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>
                            Thêm hàng hóa từ <strong>{baseNameDisplay}</strong> khi tạo bảng giá này
                          </span>
                        </label>

                        {/* Làm tròn: hệ thống luôn làm tròn đến đồng (PriceFormulaCalculator); ô chọn đơn vị làm tròn cũ không được lưu nên đã bỏ */}
                        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Info size={12} className="text-slate-400" />
                          Giá tính theo công thức được làm tròn đến đồng.
                          {!autoUpdateByBase && ' Bỏ chọn tự động cập nhật: công thức chỉ dùng để tính giá lúc lưu.'}
                        </p>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 italic">
                      * Ví dụ: Giá mới = Giá vốn + 20 % hoặc Giá mới = Bảng giá chung - 15,000 VND
                    </p>
                  </div>
                )}
              </div>

              {/* Accordion: Khi thu ngân lên đơn với bảng giá này */}
              <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandOrderRule(!expandOrderRule)}
                  className="flex w-full items-center justify-between px-4 py-3 bg-slate-50/80 hover:bg-slate-100/70 transition text-left"
                >
                  <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                    Khi thu ngân lên đơn với bảng giá này
                  </span>
                  {expandOrderRule ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </button>

                {expandOrderRule && (
                  <div className="p-4 border-t border-slate-100 space-y-3 text-xs">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="order_rule_radio"
                        checked={allowUnlistedProducts === true}
                        onChange={() => setAllowUnlistedProducts(true)}
                        className="mt-0.5 accent-[#0071BA]"
                      />
                      <div>
                        <span className="font-medium text-slate-800">
                          Được phép thêm hàng hóa không có trong bảng giá
                        </span>
                        {allowUnlistedProducts && (
                          <div className="mt-2 ml-1">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                              <input
                                type="checkbox"
                                checked={warnUnlistedProducts}
                                onChange={e => setWarnUnlistedProducts(e.target.checked)}
                                className="accent-[#0071BA] rounded"
                              />
                              <span>Gửi cảnh báo khi thêm hàng hóa không có trong bảng giá</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-slate-100">
                      <input
                        type="radio"
                        name="order_rule_radio"
                        checked={allowUnlistedProducts === false}
                        onChange={() => {
                          setAllowUnlistedProducts(false);
                          setWarnUnlistedProducts(false);
                        }}
                        className="mt-0.5 accent-[#0071BA]"
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-800">
                          Chỉ được thêm hàng hóa có trong bảng giá này
                        </span>
                        <Info size={14} className="text-slate-400" />
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PHẠM VI ÁP DỤNG – chi nhánh + khách hàng (dữ liệu thật); POS chỉ hiện bảng giá đúng phạm vi */}
          {activeTab === 'scope' && editingPriceBook?.isDefault && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              Bảng giá chung luôn áp dụng cho toàn hệ thống và mọi khách hàng (là bảng giá mặc định khi bán hàng).
            </div>
          )}
          {activeTab === 'scope' && !editingPriceBook?.isDefault && (
            <div className="space-y-4">
              {/* Section 1: Chi nhánh / Kho áp dụng */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-xs">
                <span className="block font-bold text-slate-800 uppercase tracking-wide">
                  Chi nhánh / Kho áp dụng
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope_branch_radio"
                      checked={scopeBranchType === 'ALL'}
                      onChange={() => setScopeBranchType('ALL')}
                      className="accent-[#0071BA]"
                    />
                    <span className="font-medium text-slate-800">Toàn hệ thống (Tất cả chi nhánh / kho)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope_branch_radio"
                      checked={scopeBranchType === 'SPECIFIC'}
                      onChange={() => setScopeBranchType('SPECIFIC')}
                      className="accent-[#0071BA]"
                    />
                    <span className="font-medium text-slate-800">Chi nhánh / Kho cụ thể</span>
                  </label>
                </div>

                {scopeBranchType === 'SPECIFIC' && (
                  <>
                    <MultiSelectScopeInput
                      placeholder="Chọn chi nhánh / kho áp dụng"
                      options={warehouses.map(w => ({
                        value: w.warehouseId,
                        label: `${w.name}${w.code ? ` (${w.code})` : ''}`,
                      }))}
                      selectedValues={selectedWarehouseIds}
                      onChange={setSelectedWarehouseIds}
                    />
                    {warehouseError && <p className="text-rose-600">{warehouseError}</p>}
                  </>
                )}
              </div>

              {/* Section 2: Khách hàng áp dụng (thay "Nhóm khách hàng": hệ thống không có nhóm khách) */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-xs">
                <span className="block font-bold text-slate-800 uppercase tracking-wide">
                  Khách hàng áp dụng
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope_cust_radio"
                      checked={scopeCustomerType === 'ALL'}
                      onChange={() => setScopeCustomerType('ALL')}
                      className="accent-[#0071BA]"
                    />
                    <span className="font-medium text-slate-800">Tất cả khách hàng</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope_cust_radio"
                      checked={scopeCustomerType === 'SPECIFIC'}
                      onChange={() => setScopeCustomerType('SPECIFIC')}
                      className="accent-[#0071BA]"
                    />
                    <span className="font-medium text-slate-800">Khách hàng cụ thể</span>
                  </label>
                </div>

                {scopeCustomerType === 'SPECIFIC' && (
                  <>
                    <CustomerScopePicker selected={selectedCustomers} onChange={setSelectedCustomers} />
                    <p className="text-[11px] text-slate-500">
                      Khi bán hàng, chọn đúng khách này thì bảng giá được tự động đề xuất; khách khác không thấy bảng giá này.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
            {editingPriceBook && !editingPriceBook.isDefault ? (
              <button
                type="button"
                onClick={() => {
                  if (onDelete && editingPriceBook) {
                    onDelete(editingPriceBook.priceBookId);
                  }
                }}
                disabled={loading}
                className="h-9 px-3.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 size={13} />
                <span>Xóa bảng giá</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="h-9 px-4 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                Bỏ qua
              </button>
              <button
                type="submit"
                disabled={loading}
                className="h-9 px-5 rounded-lg bg-[#0071BA] hover:bg-[#005f9d] text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {loading ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
