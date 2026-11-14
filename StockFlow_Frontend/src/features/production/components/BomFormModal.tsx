'use client';

// Thêm / sửa BOM (màn 3.2.2.7–3.2.2.8, UC-57 A51.6): chọn thành phẩm, phiên bản, ghi chú kỹ thuật,
// các dòng NVL với định mức cho 1 đơn vị thành phẩm (đơn vị cơ sở của NVL) và tỷ lệ hao hụt %.

import React, { useMemo, useState } from 'react';
import { message } from 'antd';
import { Trash2 } from 'lucide-react';
import { productionService } from '../services/productionService';
import type { BomDetail, ProductionProductLookup } from '../types';
import { errorText, fmtNorm, parseQty } from '../utils/productionFormat';
import { ProductionDialog, btnPrimary, btnSecondary, inputCls, labelCls } from './ProductionDialog';
import { ProductSearchInput } from './ProductSearchInput';

interface BomFormModalProps {
  /** Sửa BOM / tạo phiên bản mới từ BOM có sẵn; null = tạo mới */
  source: BomDetail | null;
  /** true: tạo phiên bản mới từ source (không sửa source) */
  asNewVersion: boolean;
  onClose: () => void;
  onDone: (detail: BomDetail) => void;
}

interface Line {
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  quantity: string;
  wastageRate: string;
}

const maxDecimals = (value: string, digits: number) => {
  const parts = value.trim().replace(',', '.').split('.');
  return parts.length < 2 || parts[1].length <= digits;
};

export function BomFormModal({ source, asNewVersion, onClose, onDone }: BomFormModalProps) {
  const isEdit = !!source && !asNewVersion;
  const [product, setProduct] = useState<{ productId: number; productCode: string; productName: string } | null>(() =>
    source ? { productId: source.summary.productId, productCode: source.summary.productCode, productName: source.summary.productName } : null
  );
  const [bomCode, setBomCode] = useState(isEdit ? source!.summary.bomCode : '');
  const [version, setVersion] = useState(isEdit ? source!.summary.version : '');
  const [description, setDescription] = useState(source?.summary.description ?? '');
  const [activate, setActivate] = useState(!isEdit);
  const [lines, setLines] = useState<Line[]>(() =>
    (source?.items ?? []).map((i) => ({
      materialId: i.materialId,
      materialCode: i.materialCode,
      materialName: i.materialName,
      unitName: i.unitName,
      quantity: String(i.quantity),
      wastageRate: String(i.wastageRate),
    }))
  );
  const [busy, setBusy] = useState(false);

  const checked = useMemo(
    () =>
      lines.map((l) => {
        const q = parseQty(l.quantity);
        const w = l.wastageRate.trim() === '' ? 0 : parseQty(l.wastageRate);
        const qtyOk = !Number.isNaN(q) && q > 0 && maxDecimals(l.quantity, 4);
        const rateOk = !Number.isNaN(w) && w >= 0 && w <= 100 && maxDecimals(l.wastageRate, 2);
        return { l, q, w, qtyOk, rateOk, total: qtyOk && rateOk ? q * (1 + w / 100) : null };
      }),
    [lines]
  );

  function addMaterial(p: ProductionProductLookup) {
    if (product && p.productId === product.productId) {
      message.warning('Thành phẩm không được là nguyên vật liệu trong BOM của chính nó.');
      return;
    }
    setLines((prev) => [
      ...prev,
      { materialId: p.productId, materialCode: p.productCode, materialName: p.productName, unitName: p.unitName, quantity: '', wastageRate: '0' },
    ]);
  }

  async function submit() {
    if (!product) {
      message.error('Vui lòng chọn thành phẩm.');
      return;
    }
    if (lines.length === 0) {
      message.error('BOM phải có ít nhất một nguyên vật liệu.');
      return;
    }
    const bad = checked.find((c) => !c.qtyOk || !c.rateOk);
    if (bad) {
      message.error(
        !bad.qtyOk
          ? `Định mức của ${bad.l.materialCode} phải lớn hơn 0 và có tối đa 4 chữ số thập phân.`
          : `Tỷ lệ hao hụt của ${bad.l.materialCode} phải từ 0 đến 100% và có tối đa 2 chữ số thập phân.`
      );
      return;
    }
    const payload = {
      productId: product.productId,
      bomCode: bomCode.trim() || null,
      version: version.trim() || null,
      description: description.trim() || null,
      items: checked.map((c) => ({ materialId: c.l.materialId, quantity: c.q, wastageRate: c.w })),
      activate,
    };
    setBusy(true);
    try {
      const saved = isEdit ? await productionService.updateBom(source!.summary.bomId, payload) : await productionService.createBom(payload);
      message.success(`Đã lưu BOM ${saved.summary.bomCode}${saved.summary.isActive ? ' (đang áp dụng)' : ''}.`);
      onDone(saved);
    } catch (err) {
      message.error(errorText(err, 'Không lưu được BOM'));
    } finally {
      setBusy(false);
    }
  }

  const cellInput = (bad: boolean) =>
    `w-full h-7 px-2 text-right text-xs border rounded-[6px] focus:outline-none ${
      bad ? 'border-[#fb2c36] bg-[#fef2f2]' : 'border-slate-300 focus:border-[#0070f4]'
    }`;

  return (
    <ProductionDialog
      title={isEdit ? `Sửa BOM ${source!.summary.bomCode}` : asNewVersion ? 'Tạo phiên bản BOM mới' : 'Thêm BOM'}
      onClose={onClose}
      widthClass="max-w-4xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Bỏ qua
          </button>
          <button type="button" disabled={busy} onClick={submit} className={btnPrimary}>
            {busy ? 'Đang lưu...' : 'Lưu BOM'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="md:col-span-3">
          <label className={labelCls}>Thành phẩm *</label>
          {product ? (
            <div className="flex items-center gap-2 h-8 px-2.5 border border-slate-300 rounded-[6px] bg-slate-50">
              <span className="font-mono font-semibold text-[#0070f4]">{product.productCode}</span>
              <span className="truncate">{product.productName}</span>
              {!isEdit && (
                <button type="button" onClick={() => setProduct(null)} className="ml-auto text-xs text-[#677484] hover:text-[#fb2c36] cursor-pointer">
                  Đổi
                </button>
              )}
            </div>
          ) : (
            <ProductSearchInput
              placeholder="Tìm thành phẩm theo mã hoặc tên"
              productType="FINISHED"
              onSelect={(p) => setProduct({ productId: p.productId, productCode: p.productCode, productName: p.productName })}
              excludeIds={lines.map((l) => l.materialId)}
            />
          )}
        </div>
        <div>
          <label className={labelCls}>Mã BOM</label>
          <input value={bomCode} onChange={(e) => setBomCode(e.target.value)} maxLength={100} placeholder="Tự sinh nếu để trống" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Phiên bản</label>
          <input value={version} onChange={(e) => setVersion(e.target.value)} maxLength={20} placeholder="Tự tăng nếu để trống" className={inputCls} />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs h-8 cursor-pointer">
            <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} className="w-4 h-4 rounded border-slate-300 cursor-pointer" />
            <span>Áp dụng ngay (bản đang áp dụng cũ sẽ ngừng)</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-xs font-semibold">Nguyên vật liệu</div>
        <div className="w-80">
          <ProductSearchInput
            placeholder="Thêm nguyên vật liệu (mã hoặc tên)"
            productType="RAW_MATERIAL"
            onSelect={addMaterial}
            excludeIds={[...(product ? [product.productId] : []), ...lines.map((l) => l.materialId)]}
          />
        </div>
      </div>
      <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-3">
        <table className="w-full text-left border-collapse text-xs min-w-[720px]">
          <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
            <tr>
              <th className="py-2 px-3 w-10 text-center">STT</th>
              <th className="py-2 px-3 w-32">Mã NVL</th>
              <th className="py-2 px-3">Tên NVL</th>
              <th className="py-2 px-3 w-16 text-center">ĐVT</th>
              <th className="py-2 px-3 w-32 text-right">Định mức / 1 đv</th>
              <th className="py-2 px-3 w-24 text-right">Hao hụt %</th>
              <th className="py-2 px-3 w-28 text-right">Sau hao hụt</th>
              <th className="py-2 px-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {checked.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-400">
                  Chưa có nguyên vật liệu. Tìm và thêm NVL ở ô phía trên.
                </td>
              </tr>
            ) : (
              checked.map(({ l, qtyOk, rateOk, total }, i) => (
                <tr key={l.materialId}>
                  <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                  <td className="py-2 px-3 font-mono font-semibold">{l.materialCode}</td>
                  <td className="py-2 px-3">{l.materialName}</td>
                  <td className="py-2 px-3 text-center text-slate-500">{l.unitName}</td>
                  <td className="py-1.5 px-3">
                    <input
                      inputMode="decimal"
                      value={l.quantity}
                      onChange={(e) => setLines((prev) => prev.map((x) => (x.materialId === l.materialId ? { ...x, quantity: e.target.value } : x)))}
                      placeholder="0,0000"
                      className={cellInput(l.quantity.trim() !== '' && !qtyOk)}
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <input
                      inputMode="decimal"
                      value={l.wastageRate}
                      onChange={(e) => setLines((prev) => prev.map((x) => (x.materialId === l.materialId ? { ...x, wastageRate: e.target.value } : x)))}
                      className={cellInput(!rateOk)}
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-semibold">{total === null ? '—' : fmtNorm(total)}</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((x) => x.materialId !== l.materialId))}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Bỏ NVL"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <label className={labelCls}>Ghi chú kỹ thuật / hướng dẫn sản xuất</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={500}
        rows={3}
        className="w-full px-2.5 py-1.5 text-[13px] border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
      />
      <p className="mt-2 text-[11px] text-[#677484]">
        Định mức tính theo đơn vị cơ sở của NVL cho 1 đơn vị thành phẩm. Lệnh sản xuất đã lập giữ định mức tại thời điểm lập, sửa BOM sau đó không
        ảnh hưởng lệnh cũ.
      </p>
    </ProductionDialog>
  );
}
