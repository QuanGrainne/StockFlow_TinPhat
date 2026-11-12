// src/features/products/components/catalog/CustomCombobox.tsx
// T19 lát 2: chuyển nguyên văn từ screens/GoodsCatalogScreen.tsx.
import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

// ─── Component Combobox Đa Năng (Vừa Tự Nhập Vừa Tự Chọn) ──────────────────────
interface CustomComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export const CustomCombobox: React.FC<CustomComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Nhập hoặc chọn...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full h-9 pl-3 pr-8 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium bg-white transition ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
        >
          <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl py-1 text-xs animate-in fade-in">
          {filtered.length > 0 ? (
            filtered.map((opt, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition flex items-center justify-between ${
                  value === opt ? 'bg-blue-50/70 text-blue-700 font-bold' : 'text-slate-700'
                }`}
              >
                <span>{opt}</span>
                {value === opt && <Check size={13} className="text-blue-600" />}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-slate-400 italic text-[11px]">
              Gõ tự do để sử dụng: &ldquo;{value}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
};
