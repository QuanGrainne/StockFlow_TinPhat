// src/features/products/components/GoodsImportModal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { X, Info, Lightbulb, ChevronDown, Check, Loader2 } from 'lucide-react';
import { productService } from '../services/goodsCatalogService';
import { buildProductImport, type ImportCell } from '../utils/productImportGrouping';
import * as XLSX from 'xlsx';
import { GoodsItem } from '../screens/GoodsCatalogScreen';
import type { WarehouseFacility } from '@/features/admin/types';

interface GoodsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingGoods: GoodsItem[];
  /** serverMessage: thông báo từ API (gồm số ảnh không tải được về máy chủ, nếu có) */
  onImportSuccess: (importedCount: number, fileName: string, newGoods: GoodsItem[], serverMessage?: string) => void;
  /** Danh sách kho thật (lấy từ DB, theo phân quyền) để chọn chi nhánh áp dụng */
  warehouses: WarehouseFacility[];
  /** Kho làm việc hiện tại: kho nhận tồn / giá vốn khi chọn "Toàn hệ thống" */
  defaultWarehouse: string;
}

/**
 * Mẫu dữ liệu chuẩn khớp ảnh 3 để tải về file mẫu 'MauFileSanPham.xlsx'
 */
export function downloadSampleProductExcel() {
  const headers = [
    'Loại hàng',
    'Nhóm hàng(3 Cấp)',
    'Mã hàng',
    'Tên hàng',
    'Tên hàng trên hóa đơn điện tử',
    'Thương hiệu',
    'Giá bán',
    'Giá vốn',
    'Tồn kho',
    'Tồn nhỏ nhất',
    'Tồn lớn nhất',
    'ĐVT',
    'Mã ĐVT Cơ bản',
    'Quy đổi',
    'Thuộc tính',
    'Mã HH Liên quan',
    'Hình ảnh (url1,url2...)',
    'Trọng lượng',
    'Đang kinh doanh',
    'Được bán trực tiếp',
    'Mô tả',
    'Mẫu ghi chú',
    'Vị trí',
    'Hàng thành phần',
  ];

  const sampleRows = [
    [
      'Hàng hóa',
      'Cục hình',
      'HH000036',
      'Cục hình hình tròn',
      '',
      'Cục hình',
      10000,
      5000,
      1,
      0,
      50,
      'Hộp',
      '',
      1,
      '',
      '',
      '',
      1,
      1,
      1,
      '',
      '',
      'Kệ 1',
      '',
    ],
    [
      'Hàng hóa',
      'Cục hình',
      'HH000035',
      'Cục cục hình vuông',
      '',
      '',
      10000,
      5000,
      10,
      0,
      50,
      'Hộp',
      '',
      1,
      '',
      '',
      '',
      1,
      1,
      1,
      '',
      '',
      'Hộp 1/Kệ 2',
      '',
    ],
    [
      'Hàng hóa',
      'Mỹ phẩm',
      'HH000018',
      'Sữa tắm Palmolive xanh lá',
      '',
      'Colgate',
      10000,
      5000,
      10,
      0,
      50,
      'Lọ',
      '',
      1,
      '',
      '',
      '',
      1,
      1,
      1,
      '',
      '',
      'Hộp 1/Kệ 2',
      '',
    ],
    [
      'Hàng hóa',
      'Mỹ phẩm',
      'HH000016',
      "Kem dưỡng da Johnson's babi",
      '',
      'Johnson & Johnson',
      5000,
      1000,
      5,
      0,
      50,
      'Lọ',
      '',
      1,
      'Màu: xanh',
      '',
      '',
      1,
      1,
      1,
      '',
      '',
      '',
      '',
    ],
    [
      'Hàng hóa',
      'Mỹ phẩm',
      'HH000015',
      "Kem dưỡng da Johnson's babi",
      '',
      'Johnson & Johnson',
      50000,
      10000,
      5,
      0,
      50,
      'Thùng',
      'HH000016',
      10,
      'Màu: xanh',
      'HH000016',
      '',
      1,
      1,
      1,
      '',
      '',
      '',
      '',
    ],
    [
      'Hàng hóa',
      'Thực phẩm',
      'HH000011',
      'Phở bò gói cùi',
      '',
      '',
      35000,
      25000,
      15,
      0,
      50,
      'Gói',
      '',
      1,
      '',
      '',
      'https://stockflow.tinphat.vn/uploads/sample-123.jpg',
      1,
      1,
      1,
      '',
      '',
      '',
      '',
    ],
    [
      'Hàng hóa',
      'Thực phẩm',
      'HH000006',
      'Thịt bò Mỹ 500g',
      '',
      '',
      50000,
      40000,
      0,
      0,
      50,
      'Gói',
      '',
      1,
      '',
      '',
      '',
      1,
      1,
      1,
      '',
      '',
      '',
      '',
    ],
    [
      'Dịch vụ',
      'Dịch vụ/Gói cước',
      'HH000009',
      'Gói cước',
      '',
      '',
      150000,
      100000,
      0,
      0,
      0,
      '',
      '',
      1,
      '',
      '',
      '',
      1,
      1,
      1,
      '',
      '',
      '',
      '',
    ],
    [
      'Dịch vụ',
      'Dịch vụ/Relax',
      'HH000008',
      'Relax',
      '',
      '',
      250000,
      150000,
      0,
      0,
      100,
      '',
      '',
      1,
      '',
      '',
      '',
      1,
      1,
      1,
      '',
      '',
      '',
      '',
    ],
    [
      'Combo',
      'Mỹ phẩm',
      'HH000010',
      'Set mỹ phẩm tổng hợp',
      '',
      '',
      500000,
      180000,
      5,
      0,
      50,
      'Set',
      '',
      1,
      '',
      '',
      '',
      1,
      1,
      1,
      '',
      '',
      '',
      'HH000023:1:500000',
    ],
  ];

  const sheetData = [headers, ...sampleRows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  worksheet['!cols'] = [
    { wch: 14 }, // Loại hàng
    { wch: 20 }, // Nhóm hàng
    { wch: 15 }, // Mã hàng
    { wch: 30 }, // Tên hàng
    { wch: 28 }, // Tên hàng trên HĐĐT
    { wch: 20 }, // Thương hiệu
    { wch: 14 }, // Giá bán
    { wch: 14 }, // Giá vốn
    { wch: 12 }, // Tồn kho
    { wch: 14 }, // Tồn nhỏ nhất
    { wch: 14 }, // Tồn lớn nhất
    { wch: 12 }, // ĐVT
    { wch: 16 }, // Mã ĐVT Cơ bản
    { wch: 10 }, // Quy đổi
    { wch: 20 }, // Thuộc tính
    { wch: 16 }, // Mã HH Liên quan
    { wch: 30 }, // Hình ảnh
    { wch: 14 }, // Trọng lượng
    { wch: 16 }, // Đang kinh doanh
    { wch: 18 }, // Được bán trực tiếp
    { wch: 25 }, // Mô tả
    { wch: 16 }, // Mẫu ghi chú
    { wch: 16 }, // Vị trí
    { wch: 22 }, // Hàng thành phần
  ];

  worksheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: sampleRows.length, c: headers.length - 1 },
    }),
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'HangHoa');
  XLSX.writeFile(workbook, 'MauFileSanPham.xlsx');
}

export default function GoodsImportModal({
  isOpen,
  onClose,
  existingGoods,
  onImportSuccess,
  warehouses,
  defaultWarehouse,
}: GoodsImportModalProps) {
  // ─── Tùy chọn Import theo thiết kế chuyên nghiệp ───
  const [duplicateCodeAction, setDuplicateCodeAction] = useState<'ERROR' | 'REPLACE_NAME'>('ERROR');
  const [duplicateBarcodeAction, setDuplicateBarcodeAction] = useState<'ERROR' | 'REPLACE_CODE'>('ERROR');
  const [updateStock, setUpdateStock] = useState<boolean>(false);
  const [updateCostPrice, setUpdateCostPrice] = useState<boolean>(false);
  const [costPriceScope, setCostPriceScope] = useState<'ALL' | 'BRANCH'>('ALL');
  const [selectedCostBranch, setSelectedCostBranch] = useState<string>('');
  const [businessStatusScope, setBusinessStatusScope] = useState<'ALL' | 'BRANCH'>('ALL');
  const [selectedStatusBranch, setSelectedStatusBranch] = useState<string>('');
  // Chưa chọn thì mặc định kho làm việc, không có thì kho đầu tiên trong danh sách kho thật
  const fallbackWarehouse = defaultWarehouse || warehouses[0]?.name || '';
  const costBranch = selectedCostBranch || fallbackWarehouse;
  const statusBranch = selectedStatusBranch || fallbackWarehouse;
  const [updateDescription, setUpdateDescription] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  /** Tiến độ lưu theo lượt (VD "Đang lưu 1.200/5.630 hàng hóa...") */
  const [importProgress, setImportProgress] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectFileClick = () => {
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        setErrorMessage('Tệp Excel không chứa dữ liệu hợp lệ.');
        return;
      }

      const rows = XLSX.utils.sheet_to_json<ImportCell[]>(worksheet, { header: 1 });
      if (rows.length < 2) {
        setErrorMessage('File dữ liệu không có dòng sản phẩm nào.');
        return;
      }

      const headerRow: string[] = (rows[0] ?? []).map((h) => String(h ?? '').trim());
      const lowerHeader = headerRow.map((h) => h.toLowerCase());
      if (!lowerHeader.includes('mã hàng') && !lowerHeader.includes('tên hàng')) {
        setErrorMessage('File Excel thiếu cột "Mã hàng" hoặc "Tên hàng". Vui lòng kiểm tra lại cấu trúc file mẫu.');
        return;
      }

      // Kho áp dụng: "Chi nhánh" = kho đã chọn; "Toàn hệ thống" = kho làm việc (không gán cứng tên kho)
      const targetWarehouse = costPriceScope === 'BRANCH' ? costBranch : fallbackWarehouse;

      // Gộp dòng đơn vị quy đổi vào hàng cơ bản, gắn nhóm hàng cùng loại (xem productImportGrouping.ts)
      const built = buildProductImport(headerRow, rows.slice(1), { targetWarehouse });
      if (built.products.length === 0) {
        setErrorMessage('File dữ liệu không có dòng sản phẩm nào.');
        return;
      }

      // Tên bắt buộc với hàng mới (như form tạo hàng, SYS-MST-03 / SYS-PRD-N02); hàng đã có thì giữ tên cũ.
      // Kiểm tra trước toàn bộ file: có dòng lỗi thì dừng, không lưu dòng nào.
      const existingCodes = new Set(existingGoods.map((g) => g.code.trim().toUpperCase()));
      const unnamedNew = built.unnamedRows.find((r) => !existingCodes.has(r.code.trim().toUpperCase()));
      if (unnamedNew) {
        setErrorMessage(`Dòng ${unnamedNew.line}: Thiếu tên hàng hóa.`);
        return;
      }

      // "Báo lỗi" khi trùng mã khác tên: kiểm tra trước toàn bộ file, tránh lưu dở một phần rồi mới lỗi
      if (duplicateCodeAction === 'ERROR') {
        const existingByCode = new Map(existingGoods.map((g) => [g.code.toUpperCase(), g]));
        const conflict = built.products.find((p) => {
          const ex = existingByCode.get(p.code.trim().toUpperCase());
          return !!ex && ex.name.trim().toLowerCase() !== p.name.trim().toLowerCase();
        });
        if (conflict) {
          const ex = existingByCode.get(conflict.code.trim().toUpperCase());
          setErrorMessage(
            `Trùng mã hàng "${conflict.code}" nhưng khác tên hàng hóa ("${ex?.name}" vs "${conflict.name}"). ` +
              'Chọn "Thay thế tên hàng cũ" nếu muốn cập nhật.'
          );
          return;
        }
      }

      // Lưu theo từng lượt nhỏ: file lớn (hàng nghìn mã) không bị một request quá lâu, có tiến độ
      const BATCH_SIZE = 200;
      const total = built.products.length;
      let imported = 0;
      let updated = 0;
      const serverNotes: string[] = [];
      setIsImporting(true);
      try {
        for (let start = 0; start < total; start += BATCH_SIZE) {
          setImportProgress(`Đang lưu ${start.toLocaleString('vi-VN')}/${total.toLocaleString('vi-VN')} hàng hóa...`);
          const res = await productService.importProducts({
            products: built.products.slice(start, start + BATCH_SIZE),
            duplicateCodeAction,
            updateStock,
            updateCostPrice,
            updateDescription,
            targetWarehouse,
          });
          imported += res.importedCount || 0;
          updated += res.updatedCount || 0;
          // Ghi chú thêm của máy chủ (VD ảnh không tải được), bỏ câu đếm số lượng của từng lượt
          const note = (res.message || '').replace(/^Nhập thành công[^.]*\.\s*/, '').trim();
          if (note) serverNotes.push(note);
        }
        const parts = [
          `Đã nhập ${imported.toLocaleString('vi-VN')} hàng hóa mới, cập nhật ${updated.toLocaleString('vi-VN')} hàng hóa`,
          built.mergedUnitRows > 0 ? `gộp ${built.mergedUnitRows.toLocaleString('vi-VN')} dòng đơn vị quy đổi vào hàng cơ bản` : '',
          built.groupCount > 0 ? `${built.groupCount.toLocaleString('vi-VN')} nhóm hàng cùng loại` : '',
        ].filter(Boolean);
        onImportSuccess(imported + updated, file.name, existingGoods, `${parts.join(', ')}. ${serverNotes.join(' ')}`.trim());
        onClose();
      } catch (apiErr: unknown) {
        console.error('Lỗi API import vào CSDL:', apiErr);
        const saved = imported + updated;
        setErrorMessage(
          `Lỗi khi lưu vào cơ sở dữ liệu: ${apiErr instanceof Error ? apiErr.message : 'Không thể kết nối máy chủ'}` +
            (saved > 0 ? ` (đã lưu ${saved.toLocaleString('vi-VN')}/${total.toLocaleString('vi-VN')} hàng hóa trước khi lỗi).` : '')
        );
        // Đã lưu được một phần: vẫn tải lại danh sách để thấy đúng dữ liệu trong DB
        if (saved > 0) onImportSuccess(saved, file.name, existingGoods, `Đã lưu ${saved} hàng hóa trước khi lỗi.`);
      } finally {
        setIsImporting(false);
        setImportProgress(null);
      }
    } catch (err: any) {
      console.error('Lỗi khi đọc file Excel:', err);
      setErrorMessage(`Đã xảy ra lỗi khi phân tích dữ liệu: ${err.message || 'File không hợp lệ'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header (Khớp ảnh 2) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-800">
              Nhập hàng hóa từ file dữ liệu
            </h3>
            <span className="text-xs text-slate-500 inline-flex items-center gap-1">
              (Tải về file mẫu:{' '}
              <button
                type="button"
                onClick={downloadSampleProductExcel}
                className="text-[#0070F3] hover:underline font-semibold cursor-pointer"
              >
                Excel file
              </button>
              )
            </span>
            <Info size={14} className="text-slate-400" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {/* Thân Modal: 2 Cột thiết lập Import (Khớp chuẩn Ảnh 2) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-xs">
            {/* ─── CỘT TRÁI ─── */}
            <div className="space-y-6">
              {/* 1. Xử lý trùng mã hàng/mã vạch, khác tên hàng hóa */}
              <div>
                <div className="font-bold text-slate-800 mb-2">
                  Xử lý trùng mã hàng/mã vạch, khác tên hàng hóa?
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="radio"
                      name="duplicateCodeAction"
                      checked={duplicateCodeAction === 'ERROR'}
                      onChange={() => setDuplicateCodeAction('ERROR')}
                      className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                    />
                    <span>Báo lỗi và dừng import</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="radio"
                      name="duplicateCodeAction"
                      checked={duplicateCodeAction === 'REPLACE_NAME'}
                      onChange={() => setDuplicateCodeAction('REPLACE_NAME')}
                      className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                    />
                    <span>Thay thế tên hàng cũ bằng tên hàng mới</span>
                  </label>
                </div>
              </div>

              {/* 2. Xử lý trùng mã vạch, khác mã hàng */}
              <div>
                <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <span>Xử lý trùng mã vạch, khác mã hàng?</span>
                  <Info size={13} className="text-slate-400" />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="radio"
                      name="duplicateBarcodeAction"
                      checked={duplicateBarcodeAction === 'ERROR'}
                      onChange={() => setDuplicateBarcodeAction('ERROR')}
                      className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                    />
                    <span>Báo lỗi và dừng import</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="radio"
                      name="duplicateBarcodeAction"
                      checked={duplicateBarcodeAction === 'REPLACE_CODE'}
                      onChange={() => setDuplicateBarcodeAction('REPLACE_CODE')}
                      className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                    />
                    <span>Thay thế mã hàng cũ bằng mã hàng mới</span>
                  </label>
                </div>
              </div>

              {/* 3. Cập nhật tồn kho */}
              <div>
                <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <span>Cập nhật tồn kho?</span>
                  <Info size={13} className="text-slate-400" />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="radio"
                      name="updateStock"
                      checked={!updateStock}
                      onChange={() => setUpdateStock(false)}
                      className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                    />
                    <span>Không</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="radio"
                      name="updateStock"
                      checked={updateStock}
                      onChange={() => setUpdateStock(true)}
                      className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                    />
                    <span>Có</span>
                  </label>
                </div>
              </div>

              {/* 4. Cập nhật giá vốn */}
              <div>
                <div className="font-bold text-slate-800 mb-2">Cập nhật giá vốn?</div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="radio"
                      name="updateCostPrice"
                      checked={!updateCostPrice}
                      onChange={() => setUpdateCostPrice(false)}
                      className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                    />
                    <span>Không</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="radio"
                      name="updateCostPrice"
                      checked={updateCostPrice}
                      onChange={() => setUpdateCostPrice(true)}
                      className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                    />
                    <span>Có</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ─── CỘT PHẢI ─── */}
            <div className="space-y-6">
              {/* 1. Áp dụng giá vốn khi thêm mới, cập nhật sản phẩm */}
              <div>
                <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <span>Áp dụng <span className="text-rose-600 font-semibold">giá vốn</span> khi thêm mới, cập nhật sản phẩm trên:</span>
                  <Info size={13} className="text-slate-400" />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="radio"
                      name="costPriceScope"
                      checked={costPriceScope === 'ALL'}
                      onChange={() => setCostPriceScope('ALL')}
                      className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                    />
                    <span>Toàn hệ thống</span>
                  </label>
                  <div className="flex items-center gap-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700 shrink-0">
                      <input
                        type="radio"
                        name="costPriceScope"
                        checked={costPriceScope === 'BRANCH'}
                        onChange={() => setCostPriceScope('BRANCH')}
                        className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                      />
                      <span>Chi nhánh</span>
                    </label>
                    <select
                      value={costBranch}
                      onChange={(e) => setSelectedCostBranch(e.target.value)}
                      disabled={costPriceScope !== 'BRANCH'}
                      className="flex-1 h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-400 outline-none focus:border-blue-500"
                    >
                      {warehouses.map((w) => (
                        <option key={w.warehouseId ?? w.code} value={w.name}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Ghi rõ kho nhận tồn / giá vốn để không nhầm */}
                  <p className="text-[11px] text-slate-500">
                    Tồn kho và giá vốn nhập vào:{' '}
                    <strong className="text-slate-700">
                      {(costPriceScope === 'BRANCH' ? costBranch : fallbackWarehouse) || 'kho làm việc'}
                    </strong>
                    {costPriceScope === 'ALL' ? ' (kho làm việc trên thanh trên cùng)' : ''}
                  </p>
                </div>
              </div>

              {/* 2. Trạng thái kinh doanh áp dụng trên */}
              <div>
                <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <span>Trạng thái kinh doanh áp dụng trên?</span>
                  <Info size={13} className="text-slate-400" />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="radio"
                      name="businessStatusScope"
                      checked={businessStatusScope === 'ALL'}
                      onChange={() => setBusinessStatusScope('ALL')}
                      className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                    />
                    <span>Toàn hệ thống</span>
                  </label>
                  <div className="flex items-center gap-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700 shrink-0">
                      <input
                        type="radio"
                        name="businessStatusScope"
                        checked={businessStatusScope === 'BRANCH'}
                        onChange={() => setBusinessStatusScope('BRANCH')}
                        className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                      />
                      <span>Chi nhánh</span>
                    </label>
                    <select
                      value={statusBranch}
                      onChange={(e) => setSelectedStatusBranch(e.target.value)}
                      disabled={businessStatusScope !== 'BRANCH'}
                      className="flex-1 h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-400 outline-none focus:border-blue-500"
                    >
                      {warehouses.map((w) => (
                        <option key={w.warehouseId ?? w.code} value={w.name}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Cập nhật mô tả */}
              <div>
                <div className="font-bold text-slate-800 mb-2">Cập nhật mô tả?</div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="radio"
                      name="updateDescription"
                      checked={!updateDescription}
                      onChange={() => setUpdateDescription(false)}
                      className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                    />
                    <span>Không</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="radio"
                      name="updateDescription"
                      checked={updateDescription}
                      onChange={() => setUpdateDescription(true)}
                      className="w-4 h-4 text-[#0070F3] accent-[#0070F3] cursor-pointer"
                    />
                    <span>Có</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Tip Box: Mới: Điền giá riêng cho từng thành phần combo (Khớp Ảnh 2) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Lightbulb size={16} className="text-amber-500 shrink-0" />
              <span>Mới: Điền giá riêng cho từng thành phần combo</span>
            </div>
            <p className="text-slate-600 pl-6 text-[12px] leading-relaxed">
              Trong cột hàng thành phần, Format mỗi thành phần:{' '}
              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {`{Mã hàng : Số lượng : Giá bán}`}
              </span>
              . Ví dụ: <span className="font-mono font-medium">HH000012 : 50 : 500000</span>
            </p>
            <div className="pl-6 pt-0.5">
              <span className="text-[#0070F3] hover:underline font-medium cursor-pointer inline-flex items-center gap-1 text-[11px]">
                Xem các cách thiết lập giá ∨
              </span>
            </div>
          </div>
        </div>

        {/* Footer (Khớp ảnh 2) */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-white">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={isImporting}
            onClick={handleSelectFileClick}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0070F3] hover:bg-[#005fcf] disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition cursor-pointer shadow-xs active:scale-[0.98] flex items-center gap-2"
          >
            {isImporting && <Loader2 size={14} className="animate-spin" />}
            <span>{isImporting ? importProgress || 'Đang lưu vào CSDL...' : 'Chọn file dữ liệu'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

