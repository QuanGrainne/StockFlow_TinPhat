// src/features/products/components/GoodsImportModal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { X, Info, Lightbulb, ChevronDown, Check, Loader2 } from 'lucide-react';
import { productService, ImportProductItemPayload } from '../services/goodsCatalogService';
import * as XLSX from 'xlsx';
import { GoodsItem } from '../screens/GoodsCatalogScreen';

interface GoodsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingGoods: GoodsItem[];
  onImportSuccess: (importedCount: number, fileName: string, newGoods: GoodsItem[]) => void;
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
}: GoodsImportModalProps) {
  // ─── Tùy chọn Import theo thiết kế chuyên nghiệp ───
  const [duplicateCodeAction, setDuplicateCodeAction] = useState<'ERROR' | 'REPLACE_NAME'>('ERROR');
  const [duplicateBarcodeAction, setDuplicateBarcodeAction] = useState<'ERROR' | 'REPLACE_CODE'>('ERROR');
  const [updateStock, setUpdateStock] = useState<boolean>(false);
  const [updateCostPrice, setUpdateCostPrice] = useState<boolean>(false);
  const [costPriceScope, setCostPriceScope] = useState<'ALL' | 'BRANCH'>('ALL');
  const [selectedCostBranch, setSelectedCostBranch] = useState<string>('Kho Tổng Gia Lâm');
  const [businessStatusScope, setBusinessStatusScope] = useState<'ALL' | 'BRANCH'>('ALL');
  const [selectedStatusBranch, setSelectedStatusBranch] = useState<string>('Kho Tổng Gia Lâm');
  const [updateDescription, setUpdateDescription] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

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

      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      if (rows.length < 2) {
        setErrorMessage('File dữ liệu không có dòng sản phẩm nào.');
        return;
      }

      const headerRow: string[] = (rows[0] as string[]).map((h) => String(h || '').trim());
      
      const getColIdx = (name: string): number => {
        return headerRow.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));
      };

      const idxLoaiHang = getColIdx('loại hàng');
      const idxNhomHang = getColIdx('nhóm hàng');
      const idxMaHang = getColIdx('mã hàng');
      const idxTenHang = getColIdx('tên hàng');
      const idxThuongHieu = getColIdx('thương hiệu');
      const idxGiaBan = getColIdx('giá bán');
      const idxGiaVon = getColIdx('giá vốn');
      const idxTonKho = getColIdx('tồn kho');
      const idxTonNhoNhat = getColIdx('tồn nhỏ nhất');
      const idxTonLonNhat = getColIdx('tồn lớn nhất');
      const idxDVT = getColIdx('đvt');
      const idxHinhAnh = getColIdx('hình ảnh');
      const idxTrongLuong = getColIdx('trọng lượng');
      const idxViTri = getColIdx('vị trí');
      const idxMoTa = getColIdx('mô tả');
      const idxDangKinhDoanh = getColIdx('đang kinh doanh');
      const idxBanTrucTiep = getColIdx('bán trực tiếp');
      const idxThuocTinh = getColIdx('thuộc tính');

      if (idxMaHang === -1 && idxTenHang === -1) {
        setErrorMessage('File Excel thiếu cột "Mã hàng" hoặc "Tên hàng". Vui lòng kiểm tra lại cấu trúc file mẫu.');
        return;
      }

      const currentGoods = [...existingGoods];
      const goodsByCode = new Map<string, GoodsItem>();
      currentGoods.forEach((g) => goodsByCode.set(g.code.toUpperCase(), g));

      let importedCount = 0;
      const updatedGoodsList = [...currentGoods];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const code = String(row[idxMaHang] || '').trim();
        const name = String(row[idxTenHang] || '').trim();
        if (!code && !name) continue;

        const productCode = code || `SP${Date.now() + i}`;
        const productName = name || code;

        const existing = goodsByCode.get(productCode.toUpperCase());

        if (existing) {
          // Trùng mã hàng
          if (existing.name !== productName && duplicateCodeAction === 'ERROR') {
            setErrorMessage(`Dòng ${i + 1}: Trùng mã hàng "${productCode}" nhưng khác tên hàng hóa ("${existing.name}" vs "${productName}").`);
            return;
          }

          // Cập nhật sản phẩm hiện có theo tùy chọn
          const itemIdx = updatedGoodsList.findIndex((g) => g.id === existing.id);
          if (itemIdx !== -1) {
            const target = { ...updatedGoodsList[itemIdx] };
            if (duplicateCodeAction === 'REPLACE_NAME' && productName) {
              target.name = productName;
            }
            if (updateStock && idxTonKho !== -1) {
              target.stockQuantity = Number(row[idxTonKho] || 0);
              target.availableQuantity = target.stockQuantity;
            }
            if (updateCostPrice && idxGiaVon !== -1) {
              target.costPrice = Number(row[idxGiaVon] || 0);
            }
            if (updateDescription && idxMoTa !== -1) {
              target.description = String(row[idxMoTa] || target.description || '');
            }
            if (idxGiaBan !== -1 && row[idxGiaBan] !== undefined) {
              target.standardPrice = Number(row[idxGiaBan] || target.standardPrice);
            }
            if (idxViTri !== -1 && row[idxViTri]) {
              target.locationName = String(row[idxViTri]);
            }
            updatedGoodsList[itemIdx] = target;
            importedCount++;
          }
        } else {
          // Thêm mới sản phẩm từ dòng Excel
          const newCategory = (idxNhomHang !== -1 && row[idxNhomHang] ? String(row[idxNhomHang]) : 'Hàng hóa') as any;
          const newBrand = idxThuongHieu !== -1 && row[idxThuongHieu] ? String(row[idxThuongHieu]) : '';
          const newUom = idxDVT !== -1 && row[idxDVT] ? String(row[idxDVT]) : 'Cái';
          const newSalePrice = idxGiaBan !== -1 ? Number(row[idxGiaBan] || 0) : 0;
          const newCostPrice = idxGiaVon !== -1 ? Number(row[idxGiaVon] || 0) : 0;
          const newStock = idxTonKho !== -1 ? Number(row[idxTonKho] || 0) : 0;
          const newMinStock = idxTonNhoNhat !== -1 ? Number(row[idxTonNhoNhat] || 0) : 0;
          const newMaxStock = idxTonLonNhat !== -1 ? Number(row[idxTonLonNhat] || 999999999) : 999999999;
          const newWeight = idxTrongLuong !== -1 ? Number(row[idxTrongLuong] || 0) : 0;
          const newLocation = idxViTri !== -1 ? String(row[idxViTri] || '') : '';
          const newDesc = idxMoTa !== -1 ? String(row[idxMoTa] || '') : '';
          const newImage = idxHinhAnh !== -1 ? String(row[idxHinhAnh] || '') : '';
          const newIsActive = idxDangKinhDoanh !== -1 ? (Number(row[idxDangKinhDoanh]) === 1 ? 'ACTIVE' : 'DISCONTINUED') : 'ACTIVE';
          const newIsDirectSale = idxBanTrucTiep !== -1 ? Number(row[idxBanTrucTiep]) === 1 : true;
          const rawAttr = idxThuocTinh !== -1 ? String(row[idxThuocTinh] || '') : '';

          const newItem: GoodsItem = {
            id: `G-IMP-${Date.now()}-${i}`,
            code: productCode,
            name: productName,
            category: newCategory.includes('Nguyên vật liệu') ? 'Nguyên vật liệu' : 'Thành phẩm',
            subCategory: newCategory,
            brand: newBrand,
            uom: newUom,
            specification: rawAttr,
            warehouse: 'Kho Tổng Gia Lâm',
            stockQuantity: newStock,
            reservedQuantity: 0,
            availableQuantity: newStock,
            minSafeStock: newMinStock,
            maxSafeStock: newMaxStock,
            standardPrice: newSalePrice,
            costPrice: newCostPrice,
            barcode: productCode,
            status: newIsActive,
            weight: newWeight,
            locationName: newLocation,
            imageUrl: newImage,
            description: newDesc,
            isDirectSale: newIsDirectSale,
            createdAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            stockByWarehouse: [
              {
                warehouseName: 'Kho Tổng Gia Lâm',
                actualStock: newStock,
                availableStock: newStock,
                standardPrice: newSalePrice,
                costPrice: newCostPrice,
              },
            ],
            stockCardRecent: [],
          };

          updatedGoodsList.push(newItem);
          goodsByCode.set(productCode.toUpperCase(), newItem);
          importedCount++;
        }
      }

      // Lưu trực tiếp vào CSDL SQL Server thông qua API backend
      const payloadProducts: ImportProductItemPayload[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const code = String(row[idxMaHang] || '').trim();
        const name = String(row[idxTenHang] || '').trim();
        if (!code && !name) continue;

        const productCode = code || `SP${Date.now() + i}`;
        const productName = name || code;
        const newCategory = (idxNhomHang !== -1 && row[idxNhomHang] ? String(row[idxNhomHang]) : 'Hàng hóa');
        const newBrand = idxThuongHieu !== -1 && row[idxThuongHieu] ? String(row[idxThuongHieu]) : '';
        const newUom = idxDVT !== -1 && row[idxDVT] ? String(row[idxDVT]) : 'Cái';
        const newSalePrice = idxGiaBan !== -1 ? Number(row[idxGiaBan] || 0) : 0;
        const newCostPrice = idxGiaVon !== -1 ? Number(row[idxGiaVon] || 0) : 0;
        const newStock = idxTonKho !== -1 ? Number(row[idxTonKho] || 0) : 0;
        const newMinStock = idxTonNhoNhat !== -1 ? Number(row[idxTonNhoNhat] || 0) : 0;
        const newMaxStock = idxTonLonNhat !== -1 ? Number(row[idxTonLonNhat] || 999999999) : 999999999;
        const newWeight = idxTrongLuong !== -1 ? Number(row[idxTrongLuong] || 0) : 0;
        const newLocation = idxViTri !== -1 ? String(row[idxViTri] || '') : '';
        const newDesc = idxMoTa !== -1 ? String(row[idxMoTa] || '') : '';
        const newImage = idxHinhAnh !== -1 ? String(row[idxHinhAnh] || '') : '';
        const newIsActive = idxDangKinhDoanh !== -1 ? (Number(row[idxDangKinhDoanh]) === 1) : true;
        const newIsDirectSale = idxBanTrucTiep !== -1 ? Number(row[idxBanTrucTiep]) === 1 : true;

        payloadProducts.push({
          code: productCode,
          name: productName,
          categoryName: newCategory,
          brand: newBrand,
          uom: newUom,
          standardPrice: newSalePrice,
          costPrice: newCostPrice,
          stockQuantity: newStock,
          minSafeStock: newMinStock,
          maxSafeStock: newMaxStock,
          barcode: productCode,
          description: newDesc,
          weight: newWeight,
          locationName: newLocation,
          imageUrl: newImage,
          isActive: newIsActive,
          isDirectSale: newIsDirectSale,
          warehouseName: costPriceScope === 'BRANCH' ? selectedCostBranch : 'Kho Tổng Gia Lâm',
        });
      }

      setIsImporting(true);
      try {
        const importRes = await productService.importProducts({
          products: payloadProducts,
          duplicateCodeAction,
          updateStock,
          updateCostPrice,
          updateDescription,
          targetWarehouse: costPriceScope === 'BRANCH' ? selectedCostBranch : 'Kho Tổng Gia Lâm',
        });
        onImportSuccess(importRes.totalCount || importRes.importedCount || importedCount, file.name, updatedGoodsList);
        onClose();
      } catch (apiErr: any) {
        console.error('Lỗi API import vào CSDL:', apiErr);
        setErrorMessage(`Lỗi khi lưu vào cơ sở dữ liệu: ${apiErr?.message || 'Không thể kết nối máy chủ'}`);
      } finally {
        setIsImporting(false);
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
                      value={selectedCostBranch}
                      onChange={(e) => setSelectedCostBranch(e.target.value)}
                      disabled={costPriceScope !== 'BRANCH'}
                      className="flex-1 h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-400 outline-none focus:border-blue-500"
                    >
                      <option value="Kho Tổng Gia Lâm">Kho Tổng Gia Lâm</option>
                      <option value="Kho Đông Anh">Kho Đông Anh</option>
                      <option value="Kho Sài Gòn">Kho Sài Gòn</option>
                    </select>
                  </div>
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
                      value={selectedStatusBranch}
                      onChange={(e) => setSelectedStatusBranch(e.target.value)}
                      disabled={businessStatusScope !== 'BRANCH'}
                      className="flex-1 h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-400 outline-none focus:border-blue-500"
                    >
                      <option value="Kho Tổng Gia Lâm">Kho Tổng Gia Lâm</option>
                      <option value="Kho Đông Anh">Kho Đông Anh</option>
                      <option value="Kho Sài Gòn">Kho Sài Gòn</option>
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
            <span>{isImporting ? 'Đang lưu vào CSDL...' : 'Chọn file dữ liệu'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

