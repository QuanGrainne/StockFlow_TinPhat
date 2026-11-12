// src/features/products/components/catalog/KiotSelectWithSearch.tsx
// T19 lát 2: chuyển nguyên văn từ screens/GoodsCatalogScreen.tsx.
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';

// ─── Component Dropdown Nhóm hàng / Thương hiệu Chuẩn KiotViet (Kính lúp & Tạo mới) ───────────
interface KiotSelectWithSearchProps {
  label: string;
  required?: boolean;
  onCreateNew?: () => void;
  createButtonText?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  allowClear?: boolean;
  onQuickCreate?: (val: string) => void;
  className?: string;
}

export const KiotSelectWithSearch: React.FC<KiotSelectWithSearchProps> = ({
  label,
  required = false,
  onCreateNew,
  createButtonText = 'Tạo mới',
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  allowClear = true,
  onQuickCreate,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, searchQuery]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Header dòng trên: Nhãn & Nút 'Tạo mới' màu xanh chuẩn KiotViet */}
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {onCreateNew && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCreateNew();
            }}
            className="text-xs text-[#0070F3] hover:text-blue-700 font-normal hover:underline cursor-pointer transition select-none"
          >
            {createButtonText}
          </button>
        )}
      </div>

      {/* Hộp chọn Trigger chuẩn KiotViet */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-9 px-3 rounded-lg border text-xs flex items-center justify-between cursor-pointer bg-white transition select-none ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={`truncate ${value ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
        />
      </div>

      {/* Dropdown Menu nổi (Nổi bật - Không bị đè / không bị cắt) */}
      {isOpen && (
        <div className="absolute z-[999] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/10 min-w-[280px]">
          {/* Thanh tìm kiếm bên trong dropdown có icon kính lúp 🔍 */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-3 text-xs bg-white rounded-md border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-slate-800 placeholder-slate-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Danh sách lựa chọn cuộn (Chiều cao thoải mái, hiển thị rõ ràng) */}
          <div className="max-h-60 min-h-[100px] overflow-y-auto divide-y divide-slate-50">
            {/* Lựa chọn xóa / mặc định: Chọn nhóm hàng (Bắt buộc) */}
            {allowClear && (
              <div
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className={`px-3 py-2 cursor-pointer transition flex items-center justify-between ${
                  !value ? 'bg-blue-50/70 text-blue-700 font-medium' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span>{placeholder}</span>
                {!value && <Check size={13} className="text-blue-600" />}
              </div>
            )}

            {/* Các tùy chọn lọc theo từ khóa */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = value === opt;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2 cursor-pointer transition flex items-center justify-between ${
                      isSelected ? 'bg-blue-50/70 text-blue-700 font-bold' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check size={13} className="text-blue-600 flex-shrink-0" />}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-slate-400 text-xs">
                <div className="mb-1 text-slate-500">Không tìm thấy kết quả</div>
                {searchQuery.trim() && onQuickCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      onQuickCreate(searchQuery.trim());
                      setIsOpen(false);
                    }}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium hover:underline mt-1 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Tạo mới &ldquo;{searchQuery.trim()}&rdquo;</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
