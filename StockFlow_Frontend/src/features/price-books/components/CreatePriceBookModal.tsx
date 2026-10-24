'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Info, Calendar, Check } from 'lucide-react';
import { PriceBook, CreatePriceBookPayload, UpdatePriceBookPayload } from '../types';
import { priceBookService } from '../services/priceBookService';
import { apiClient } from '@/lib/api/client';

interface WarehouseOption {
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
}

interface UserOption {
  userId: number;
  username: string;
  fullName: string;
}

const CUSTOMER_GROUPS = [
  { code: 'WHOLESALE', name: 'Khách buôn / Đại lý sỉ' },
  { code: 'VIP', name: 'Khách hàng thân thiết / VIP' },
  { code: 'RETAIL', name: 'Khách hàng bán lẻ' },
  { code: 'PROJECT', name: 'Khách hàng công trình / dự án' },
  { code: 'DEALER_L1', name: 'Đại lý Cấp 1 phân phối' },
];

interface CreatePriceBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (saved: PriceBook) => void;
  editingPriceBook?: PriceBook | null;
  existingPriceBooks?: PriceBook[];
}

export default function CreatePriceBookModal({
  isOpen,
  onClose,
  onSuccess,
  editingPriceBook,
  existingPriceBooks = [],
}: CreatePriceBookModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'scope'>('info');

  // Accordion toggles
  const [expandValidity, setExpandValidity] = useState(true);
  const [expandFormula, setExpandFormula] = useState(true);
  const [expandOrderRule, setExpandOrderRule] = useState(true);

  // Form states - Tab 1
  const [priceBookName, setPriceBookName] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [formulaBaseType, setFormulaBaseType] = useState<string>('');
  const [formulaBasePriceBookId, setFormulaBasePriceBookId] = useState<number | null>(null);
  const [formulaOperator, setFormulaOperator] = useState<'+' | '-'>('+');
  const [formulaValue, setFormulaValue] = useState<number | ''>('');
  const [formulaUnit, setFormulaUnit] = useState<'VND' | 'PERCENT'>('VND');

  const [allowUnlistedProducts, setAllowUnlistedProducts] = useState(true);
  const [warnUnlistedProducts, setWarnUnlistedProducts] = useState(false);

  // Form states - Tab 2 (Phạm vi áp dụng)
  const [scopeBranchType, setScopeBranchType] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<number[]>([]);

  const [scopeCustomerType, setScopeCustomerType] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedCustomerGroupCodes, setSelectedCustomerGroupCodes] = useState<string[]>([]);

  const [scopeUserType, setScopeUserType] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // Lookup options
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch warehouses and users for Scope tab
  useEffect(() => {
    if (!isOpen) return;

    apiClient.get<WarehouseOption[]>('/api/warehouses')
      .then(res => setWarehouses(Array.isArray(res) ? res : []))
      .catch(() => {});

    apiClient.get<UserOption[]>('/api/admin/users')
      .then(res => setUsers(Array.isArray(res) ? res : []))
      .catch(() => {});
  }, [isOpen]);

  // Sync state on open or edit
  useEffect(() => {
    if (!isOpen) return;

    if (editingPriceBook) {
      setPriceBookName(editingPriceBook.priceBookName || '');
      setEffectiveFrom(editingPriceBook.effectiveFrom ? editingPriceBook.effectiveFrom.slice(0, 16) : '');
      setEffectiveTo(editingPriceBook.effectiveTo ? editingPriceBook.effectiveTo.slice(0, 16) : '');
      setIsActive(editingPriceBook.isActive);

      setFormulaBaseType(editingPriceBook.formulaBaseType || '');
      setFormulaBasePriceBookId(editingPriceBook.formulaBasePriceBookId);
      setFormulaOperator(editingPriceBook.formulaOperator || '+');
      setFormulaValue(editingPriceBook.formulaValue ?? '');
      setFormulaUnit(editingPriceBook.formulaUnit || 'VND');

      setAllowUnlistedProducts(editingPriceBook.allowUnlistedProducts);
      setWarnUnlistedProducts(editingPriceBook.warnUnlistedProducts);

      setScopeBranchType(editingPriceBook.scopeBranchType || 'ALL');
      setSelectedWarehouseIds(editingPriceBook.scopeWarehouseIds || []);

      setScopeCustomerType(editingPriceBook.scopeCustomerType || 'ALL');
      setSelectedCustomerGroupCodes(editingPriceBook.scopeCustomerGroupCodes || []);

      setScopeUserType(editingPriceBook.scopeUserType || 'ALL');
      setSelectedUserIds(editingPriceBook.scopeUserIds || []);
    } else {
      // Default new price book
      setPriceBookName('');
      const now = new Date();
      const inOneYear = new Date();
      inOneYear.setFullYear(now.getFullYear() + 1);

      setEffectiveFrom(now.toISOString().slice(0, 16));
      setEffectiveTo(inOneYear.toISOString().slice(0, 16));
      setIsActive(true);

      setFormulaBaseType('');
      setFormulaBasePriceBookId(null);
      setFormulaOperator('+');
      setFormulaValue('');
      setFormulaUnit('VND');

      setAllowUnlistedProducts(true);
      setWarnUnlistedProducts(false);

      setScopeBranchType('ALL');
      setSelectedWarehouseIds([]);

      setScopeCustomerType('ALL');
      setSelectedCustomerGroupCodes([]);

      setScopeUserType('ALL');
      setSelectedUserIds([]);
    }

    setActiveTab('info');
    setErrorMsg(null);
  }, [isOpen, editingPriceBook]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceBookName.trim()) {
      setErrorMsg('Vui lòng nhập tên bảng giá.');
      setActiveTab('info');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const payload: CreatePriceBookPayload = {
        priceBookName: priceBookName.trim(),
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : null,
        effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
        isActive,
        formulaBaseType: formulaBaseType || null,
        formulaBasePriceBookId: formulaBaseType === 'PRICE_BOOK' ? formulaBasePriceBookId : null,
        formulaOperator: formulaValue !== '' ? formulaOperator : null,
        formulaValue: formulaValue !== '' ? Number(formulaValue) : null,
        formulaUnit: formulaValue !== '' ? formulaUnit : null,
        allowUnlistedProducts,
        warnUnlistedProducts: allowUnlistedProducts ? warnUnlistedProducts : false,
        scopeBranchType,
        scopeWarehouseIds: scopeBranchType === 'SPECIFIC' ? selectedWarehouseIds : [],
        scopeCustomerType,
        scopeCustomerGroupCodes: scopeCustomerType === 'SPECIFIC' ? selectedCustomerGroupCodes : [],
        scopeUserType,
        scopeUserIds: scopeUserType === 'SPECIFIC' ? selectedUserIds : [],
        autoApplyFormula: true,
      };

      let result: PriceBook;
      if (editingPriceBook) {
        const updatePayload: UpdatePriceBookPayload = {
          ...payload,
          priceBookId: editingPriceBook.priceBookId,
          recalculateFormula: true,
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

  const toggleWarehouse = (id: number) => {
    setSelectedWarehouseIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleCustomerGroup = (code: string) => {
    setSelectedCustomerGroupCodes(prev =>
      prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]
    );
  };

  const toggleUser = (id: number) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-slate-800">
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
                  className="flex w-full items-center justify-between px-4 py-3 bg-slate-50/80 hover:bg-slate-100/70 transition text-left"
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
                          className="accent-[#0071BA]"
                        />
                        <span className="font-medium text-slate-800">Chưa áp dụng</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion: Công thức giá */}
              <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-700">Giá mới =</span>

                      {/* Dropdown chọn nguồn giá */}
                      <select
                        value={formulaBaseType === 'PRICE_BOOK' ? `PB_${formulaBasePriceBookId}` : formulaBaseType}
                        onChange={e => {
                          const val = e.target.value;
                          if (val.startsWith('PB_')) {
                            setFormulaBaseType('PRICE_BOOK');
                            setFormulaBasePriceBookId(Number(val.replace('PB_', '')));
                          } else {
                            setFormulaBaseType(val);
                            setFormulaBasePriceBookId(null);
                          }
                        }}
                        className="h-8 rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-[#0071BA] min-w-[170px]"
                      >
                        <option value="">-- Chọn nguồn giá cơ sở --</option>
                        <option value="COST">Giá vốn (theo kho hoặc toàn cty)</option>
                        <option value="LATEST_PURCHASE">Giá nhập cuối (theo kho)</option>
                        <option value="STANDARD">Bảng giá chung</option>
                        {existingPriceBooks
                          .filter(pb => !editingPriceBook || pb.priceBookId !== editingPriceBook.priceBookId)
                          .map(pb => (
                            <option key={pb.priceBookId} value={`PB_${pb.priceBookId}`}>
                              Bảng giá: {pb.priceBookName}
                            </option>
                          ))}
                      </select>

                      {/* Toán tử + / - */}
                      <div className="inline-flex rounded border border-slate-300 overflow-hidden bg-slate-100">
                        <button
                          type="button"
                          onClick={() => setFormulaOperator('+')}
                          className={`px-2.5 py-1 text-xs font-bold transition ${
                            formulaOperator === '+' ? 'bg-[#0071BA] text-white' : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormulaOperator('-')}
                          className={`px-2.5 py-1 text-xs font-bold transition ${
                            formulaOperator === '-' ? 'bg-[#0071BA] text-white' : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          -
                        </button>
                      </div>

                      {/* Giá trị điều chỉnh */}
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formulaValue}
                        onChange={e => setFormulaValue(e.target.value ? Number(e.target.value) : '')}
                        placeholder="0"
                        className="h-8 w-24 rounded border border-slate-300 px-2 text-right text-xs text-slate-800 outline-none focus:border-[#0071BA]"
                      />

                      {/* Đơn vị VND / % */}
                      <div className="inline-flex rounded border border-slate-300 overflow-hidden bg-slate-100">
                        <button
                          type="button"
                          onClick={() => setFormulaUnit('VND')}
                          className={`px-2 py-1 text-xs font-semibold transition ${
                            formulaUnit === 'VND' ? 'bg-[#0071BA] text-white' : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          VND
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormulaUnit('PERCENT')}
                          className={`px-2 py-1 text-xs font-semibold transition ${
                            formulaUnit === 'PERCENT' ? 'bg-[#0071BA] text-white' : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          %
                        </button>
                      </div>
                    </div>

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

          {/* TAB 2: PHẠM VI ÁP DỤNG */}
          {activeTab === 'scope' && (
            <div className="space-y-4">
              {/* Section 1: Chi nhánh / Kho hàng */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-xs">
                <span className="block font-bold text-slate-800 uppercase tracking-wide">
                  Chi nhánh / Kho hàng
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
                    <span className="font-medium text-slate-800">Toàn hệ thống (tất cả kho)</span>
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
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 pl-4 grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {warehouses.map(w => (
                      <label key={w.warehouseId} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedWarehouseIds.includes(w.warehouseId)}
                          onChange={() => toggleWarehouse(w.warehouseId)}
                          className="accent-[#0071BA] rounded"
                        />
                        <span className="truncate">{w.warehouseName}</span>
                      </label>
                    ))}
                    {warehouses.length === 0 && (
                      <span className="text-slate-400 italic">Chưa tải được danh sách kho</span>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Nhóm khách hàng */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-xs">
                <span className="block font-bold text-slate-800 uppercase tracking-wide">
                  Nhóm khách hàng
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
                    <span className="font-medium text-slate-800">Nhóm khách hàng cụ thể</span>
                  </label>
                </div>

                {scopeCustomerType === 'SPECIFIC' && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 pl-4 grid grid-cols-2 gap-2">
                    {CUSTOMER_GROUPS.map(g => (
                      <label key={g.code} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedCustomerGroupCodes.includes(g.code)}
                          onChange={() => toggleCustomerGroup(g.code)}
                          className="accent-[#0071BA] rounded"
                        />
                        <span>{g.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: Người tạo giao dịch */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-xs">
                <span className="block font-bold text-slate-800 uppercase tracking-wide">
                  Người tạo giao dịch
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope_user_radio"
                      checked={scopeUserType === 'ALL'}
                      onChange={() => setScopeUserType('ALL')}
                      className="accent-[#0071BA]"
                    />
                    <span className="font-medium text-slate-800">Tất cả nhân viên / thu ngân</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope_user_radio"
                      checked={scopeUserType === 'SPECIFIC'}
                      onChange={() => setScopeUserType('SPECIFIC')}
                      className="accent-[#0071BA]"
                    />
                    <span className="font-medium text-slate-800">Người tạo giao dịch cụ thể</span>
                  </label>
                </div>

                {scopeUserType === 'SPECIFIC' && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 pl-4 grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {users.map(u => (
                      <label key={u.userId} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.userId)}
                          onChange={() => toggleUser(u.userId)}
                          className="accent-[#0071BA] rounded"
                        />
                        <span className="truncate">{u.fullName || u.username}</span>
                      </label>
                    ))}
                    {users.length === 0 && (
                      <span className="text-slate-400 italic">Chưa tải được danh sách nhân viên</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            >
              Bỏ qua
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-5 rounded-lg bg-[#0071BA] hover:bg-[#005f9d] text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
