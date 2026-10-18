// src/components/common/Modal.tsx
// Modal Popup chuẩn Desktop: Đè lên trang, bo góc 8px, có nút 'Lưu' và 'Hủy'

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSave?: () => void;
  saveText?: string;
  cancelText?: string;
  isSaving?: boolean;
  saveDisabled?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  hideFooter?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  onSave,
  saveText = 'Lưu',
  cancelText = 'Hủy',
  isSaving = false,
  saveDisabled = false,
  maxWidth = '2xl',
  hideFooter = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidthClasses} bg-white rounded-[8px] shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#F7FAFC]">
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-[6px] hover:bg-slate-200/60 transition cursor-pointer"
            title="Đóng (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-700 space-y-4">
          {children}
        </div>

        {/* Footer (Nút Lưu và Hủy theo quy tắc UX) */}
        {!hideFooter && (
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-200 bg-[#F7FAFC]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-[8px] hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving || saveDisabled}
                className="px-5 py-2 text-sm font-medium text-white bg-[#2B6CB0] hover:bg-[#23568c] rounded-[8px] transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>{saveText}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
