'use client';

// Lập / sửa lệnh sản xuất (UC-59, A58.1) — bố cục giống form Kiểm kho / Chuyển hàng:
// thanh tiêu đề (tìm thành phẩm có BOM đang áp dụng, kho làm việc, avatar),
// bảng nhu cầu NVL dự kiến bên trái (BR-31, tồn và thiếu hụt tại kho làm việc), khung thông tin lệnh + Lưu bên phải.
// ?edit=<id>: sửa lệnh còn Chưa bắt đầu (giữ định mức đã chụp / đã điều chỉnh nếu không đổi thành phẩm).

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { message } from 'antd';
import { AlertTriangle, ArrowLeft, Factory, Inbox, RefreshCcw, X } from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { FormHeaderUserBar } from '@/components/layout/FormHeaderUserBar';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import { productionService } from '../services/productionService';
import type { ProductionOrderDetail, ProductionProductLookup, RequirementPreview } from '../types';
import { errorText, fmtNorm, fmtPercent, fmtQty, parseQty, todayIso } from '../utils/productionFormat';
import { ProductSearchInput } from '../components/ProductSearchInput';
import { inputCls, labelCls } from '../components/ProductionDialog';

interface SelectedProduct {
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
}

interface PreviewRow {
  key: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  normPerUnit: number;
  wastageRate: number;
  requiredQty: number;
  availableQty: number | null;
  adjusted: boolean;
}

const round2 = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;

export default function CreateProductionOrderScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = Number(searchParams.get('edit')) || null;
  const { activeWarehouse } = useActiveWarehouse();
  const warehouseId = activeWarehouse.warehouseId;

  const [product, setProduct] = useState<SelectedProduct | null>(null);
  const [planned, setPlanned] = useState('');
  const [deadline, setDeadline] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ loaded: boolean; detail: ProductionOrderDetail | null; error?: string }>({
    loaded: !editId,
    detail: null,
  });

  // Mở lệnh để sửa
  useEffect(() => {
    if (!editId) return;
    let stale = false;
    productionService
      .getOrder(editId)
      .then((d) => {
        if (stale) return;
        if (d.summary.status !== 'NOT_STARTED') {
          setEditing({ loaded: true, detail: null, error: `Lệnh ${d.summary.code} không còn ở trạng thái Chưa bắt đầu nên không sửa được.` });
          return;
        }
        setEditing({ loaded: true, detail: d });
        setProduct({
          productId: d.summary.productId,
          productCode: d.summary.productCode,
          productName: d.summary.productName,
          unitName: d.summary.unitName,
        });
        setPlanned(String(d.summary.plannedQuantity));
        setDeadline(d.summary.deadline ? d.summary.deadline.slice(0, 10) : '');
        setWorkshop(d.summary.workshop ?? '');
        setNotes(d.notes ?? '');
      })
      .catch((err: unknown) => {
        if (!stale) setEditing({ loaded: true, detail: null, error: errorText(err, 'Không tải được lệnh sản xuất') });
      });
    return () => {
      stale = true;
    };
  }, [editId]);

  const plannedQty = parseQty(planned);
  const plannedValid = !Number.isNaN(plannedQty) && plannedQty > 0;
  const plannedError = planned.trim() !== '' && !plannedValid ? 'Số lượng kế hoạch phải lớn hơn 0.' : null;
  const deadlineError = deadline && deadline < todayIso() ? 'Hạn hoàn thành không được trước ngày hôm nay.' : null;

  // Sửa lệnh, giữ thành phẩm: nhu cầu tính theo định mức đã chụp trên lệnh; ngược lại theo BOM đang áp dụng
  const keepSnapshot = !!editing.detail && !!product && editing.detail.summary.productId === product.productId;
  const previewKey = product && !keepSnapshot ? JSON.stringify({ p: product.productId, q: plannedValid ? plannedQty : 0, w: warehouseId }) : '';
  const [preview, setPreview] = useState<{ key: string; data: RequirementPreview | null; error?: string }>({ key: '', data: null });
  const [snapshot, setSnapshot] = useState<{ key: string; detail: ProductionOrderDetail | null }>({ key: '', detail: null });
  const snapshotKey = keepSnapshot && editId ? `${editId}:${warehouseId}` : '';

  useEffect(() => {
    if (!previewKey || !product) return;
    let stale = false;
    const timer = setTimeout(() => {
      productionService
        .getRequirementPreview(product.productId, plannedValid ? plannedQty : 0, warehouseId)
        .then((data) => {
          if (!stale) setPreview({ key: previewKey, data });
        })
        .catch((err: unknown) => {
          if (!stale) setPreview({ key: previewKey, data: null, error: errorText(err, 'Không tính được nhu cầu NVL') });
        });
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // previewKey gom đủ tham số
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  useEffect(() => {
    if (!snapshotKey || !editId) return;
    let stale = false;
    productionService
      .getOrder(editId, warehouseId)
      .then((d) => {
        if (!stale) setSnapshot({ key: snapshotKey, detail: d });
      })
      .catch(() => {
        if (!stale) setSnapshot({ key: snapshotKey, detail: null });
      });
    return () => {
      stale = true;
    };
  }, [snapshotKey, editId, warehouseId]);

  const previewLoading = keepSnapshot ? snapshot.key !== snapshotKey : !!previewKey && preview.key !== previewKey;
  const previewError = !keepSnapshot && preview.key === previewKey ? preview.error : undefined;

  const rows: PreviewRow[] = useMemo(() => {
    const q = plannedValid ? plannedQty : 0;
    if (keepSnapshot) {
      return (snapshot.detail?.materials ?? []).map((m) => ({
        key: `r${m.requirementId}`,
        materialId: m.materialId,
        materialCode: m.materialCode,
        materialName: m.materialName,
        unitName: m.unitName,
        normPerUnit: m.normPerUnit,
        wastageRate: m.wastageRate,
        requiredQty: round2(q * m.normPerUnit * (1 + m.wastageRate / 100)),
        availableQty: m.availableQty,
        adjusted: m.isAdjusted,
      }));
    }
    return (preview.key === previewKey ? preview.data?.materials ?? [] : []).map((m) => ({
      key: `m${m.materialId}`,
      materialId: m.materialId,
      materialCode: m.materialCode,
      materialName: m.materialName,
      unitName: m.unitName,
      normPerUnit: m.normPerUnit,
      wastageRate: m.wastageRate,
      requiredQty: m.requiredQty,
      availableQty: m.availableQty,
      adjusted: false,
    }));
  }, [keepSnapshot, snapshot.detail, preview, previewKey, plannedValid, plannedQty]);

  const bomLabel = keepSnapshot
    ? editing.detail
      ? `${editing.detail.summary.bomCode} (v${editing.detail.summary.bomVersion})`
      : ''
    : preview.key === previewKey && preview.data
      ? `${preview.data.bomCode} (v${preview.data.bomVersion})`
      : '';
  const shortageCount = rows.filter((r) => r.availableQty !== null && r.availableQty < r.requiredQty).length;

  async function save() {
    if (!product) {
      message.error('Vui lòng chọn thành phẩm cần sản xuất.');
      return;
    }
    if (!plannedValid) {
      message.error('Số lượng kế hoạch phải lớn hơn 0.');
      return;
    }
    if (deadlineError) {
      message.error(deadlineError);
      return;
    }
    if (!keepSnapshot && previewError) {
      message.error(previewError);
      return;
    }
    const payload = {
      productId: product.productId,
      plannedQuantity: round2(plannedQty),
      deadline: deadline || null,
      workshop: workshop.trim() || null,
      notes: notes.trim() || null,
    };
    setSaving(true);
    try {
      const saved = editId ? await productionService.updateOrder(editId, payload) : await productionService.createOrder(payload);
      message.success(`Đã lưu lệnh sản xuất ${saved.summary.code}.`);
      router.push('/production');
    } catch (err) {
      message.error(errorText(err, 'Không lưu được lệnh sản xuất'));
    } finally {
      setSaving(false);
    }
  }

  function pickProduct(p: ProductionProductLookup) {
    setProduct({ productId: p.productId, productCode: p.productCode, productName: p.productName, unitName: p.unitName });
  }

  const title = editId ? 'Sửa lệnh sản xuất' : 'Lập lệnh sản xuất';

  return (
    <div className="flex flex-col h-screen stockflow-brand-bg text-[13px] text-[#15171a] select-none overflow-hidden font-sans">
      {/* ─── 1. Thanh tiêu đề ─── */}
      <header className="h-12 bg-white/85 backdrop-blur-[2px] border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/production"
            className="p-1 rounded-[8px] text-[#677484] hover:text-[#15171a] hover:bg-[#f7f8f9] transition"
            title="Quay lại danh sách lệnh sản xuất"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </Link>
          <span className="text-[20px] font-semibold tracking-tight whitespace-nowrap leading-[36px]">{title}</span>
        </div>
        <div className="flex-1 max-w-xl ml-4 mr-auto">
          <ProductSearchInput
            placeholder="Tìm thành phẩm có BOM đang áp dụng (mã hoặc tên)"
            activeBomOnly
            onSelect={pickProduct}
            disabled={!editing.loaded || !!editing.error}
          />
        </div>
        <FormHeaderUserBar />
      </header>

      {/* ─── 2. Nhu cầu NVL + khung thông tin ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white/62 border-r border-slate-200">
          {!editing.loaded ? (
            <div className="flex-1 flex items-center justify-center text-[#677484]">
              <RefreshCcw size={18} className="animate-spin mr-2 text-[#0070f4]" /> Đang tải lệnh sản xuất...
            </div>
          ) : editing.error ? (
            <div className="flex-1 flex items-center justify-center text-[#fb2c36]">{editing.error}</div>
          ) : !product ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#677484] text-center px-6">
              <div className="w-16 h-16 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                <Factory size={30} className="stroke-[1.5]" />
              </div>
              <div className="font-bold text-[#15171a] text-sm mb-1">Chọn thành phẩm cần sản xuất</div>
              <p className="text-xs max-w-sm">
                Chỉ thành phẩm đã có BOM đang áp dụng mới lập được lệnh. Nhu cầu nguyên vật liệu do hệ thống tính từ BOM, không nhập tay.
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-200 bg-white/80 flex flex-wrap items-center gap-x-6 gap-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#677484]">Thành phẩm</span>
                  <span className="font-mono font-bold">
                    <ProductCodeLink code={product.productCode} productId={product.productId} />
                  </span>
                  <span className="font-semibold">{product.productName}</span>
                  {!editId && (
                    <button type="button" onClick={() => setProduct(null)} className="text-[#677484] hover:text-[#fb2c36] cursor-pointer" title="Bỏ chọn">
                      <X size={14} />
                    </button>
                  )}
                </div>
                {bomLabel && (
                  <div className="text-xs">
                    <span className="text-[#677484]">BOM áp dụng: </span>
                    <span className="font-semibold">{bomLabel}</span>
                    {keepSnapshot && <span className="text-[#677484]"> (định mức đã chụp trên lệnh)</span>}
                  </div>
                )}
                <div className="text-xs">
                  <span className="text-[#677484]">Tồn theo kho: </span>
                  <span className="font-semibold">{activeWarehouse.name}</span>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-left border-collapse min-w-[860px]">
                  <thead className="text-[12px] font-semibold text-[#677484]">
                    <tr>
                      {['STT', 'Mã NVL', 'Tên NVL', 'ĐVT', 'Định mức/đv', 'Hao hụt', 'Nhu cầu', 'Tồn kho', 'Thiếu'].map((h, i) => (
                        <th
                          key={h}
                          className={`sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap ${
                            i === 0 ? 'w-12 text-center' : i >= 4 ? 'text-right' : i === 3 ? 'text-center w-16' : ''
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewLoading ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-[#677484]">
                          <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                          Đang tính nhu cầu nguyên vật liệu...
                        </td>
                      </tr>
                    ) : previewError ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-[#fb2c36]">
                          <AlertTriangle size={20} className="mx-auto mb-2" />
                          {previewError}
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-[#677484]">
                          <Inbox size={24} className="mx-auto mb-2 text-[#0070f4]" />
                          BOM chưa có nguyên vật liệu
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => {
                        const short = r.availableQty === null ? null : Math.max(0, round2(r.requiredQty - Math.max(0, r.availableQty)));
                        return (
                          <tr key={r.key} className="text-[13px]">
                            <td className="py-2.5 px-3 text-center text-slate-400">{i + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-semibold">
                              <ProductCodeLink code={r.materialCode} productId={r.materialId} />
                            </td>
                            <td className="py-2.5 px-3">
                              {r.materialName}
                              {r.adjusted && <span className="ml-1.5 text-[10px] text-[#d97706]">đã điều chỉnh</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-500">{r.unitName}</td>
                            <td className="py-2.5 px-3 text-right">{fmtNorm(r.normPerUnit)}</td>
                            <td className="py-2.5 px-3 text-right">{fmtPercent(r.wastageRate)}</td>
                            <td className="py-2.5 px-3 text-right font-semibold">{fmtQty(r.requiredQty)}</td>
                            <td className="py-2.5 px-3 text-right">{r.availableQty === null ? '—' : fmtQty(r.availableQty)}</td>
                            <td className={`py-2.5 px-3 text-right font-semibold ${short && short > 0 ? 'text-[#fb2c36]' : 'text-[#16a34a]'}`}>
                              {short === null ? '—' : short > 0 ? fmtQty(short) : 'Đủ'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <footer className="h-10 bg-white/82 border-t border-slate-200 px-4 flex items-center justify-between text-[12px] text-[#677484] shrink-0">
                <span>
                  Nhu cầu = SL kế hoạch × Định mức × (1 + Hao hụt%), làm tròn 2 chữ số thập phân.
                </span>
                {shortageCount > 0 && (
                  <span className="text-[#fb2c36] font-semibold">{shortageCount} NVL chưa đủ tồn tại kho đang chọn</span>
                )}
              </footer>
            </>
          )}
        </div>

        {/* Khung thông tin lệnh */}
        <aside className="w-80 shrink-0 bg-white/90 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div>
              <label className={labelCls}>Mã lệnh</label>
              <input
                value={editing.detail?.summary.code ?? 'Mã lệnh tự động'}
                disabled
                className={`${inputCls} text-[#677484] font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>
                Số lượng kế hoạch * {product && <span className="text-slate-400">({product.unitName})</span>}
              </label>
              <input
                inputMode="decimal"
                value={planned}
                onChange={(e) => setPlanned(e.target.value)}
                placeholder="0"
                className={`${inputCls} text-right ${plannedError ? 'border-[#fb2c36]' : ''}`}
              />
              {plannedError && <p className="mt-1 text-xs text-[#fb2c36]">{plannedError}</p>}
            </div>
            <div>
              <label className={labelCls}>Hạn hoàn thành</label>
              <input
                type="date"
                value={deadline}
                min={todayIso()}
                onChange={(e) => setDeadline(e.target.value)}
                className={`${inputCls} ${deadlineError ? 'border-[#fb2c36]' : ''}`}
              />
              {deadlineError && <p className="mt-1 text-xs text-[#fb2c36]">{deadlineError}</p>}
            </div>
            <div>
              <label className={labelCls}>Xưởng phụ trách</label>
              <input
                value={workshop}
                onChange={(e) => setWorkshop(e.target.value)}
                maxLength={200}
                placeholder="VD: Xưởng ép đùn 1"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Ghi chú</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Yêu cầu kỹ thuật, ưu tiên..."
                className="w-full px-2.5 py-1.5 text-[13px] border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
              />
            </div>
            <p className="text-[11px] text-[#677484] leading-relaxed">
              Lệnh được lưu ở trạng thái <b>Chưa bắt đầu</b>. Lệnh chuyển <b>Đang sản xuất</b> khi kế toán sản xuất ghi nhận phiếu xuất NVL đầu
              tiên.
            </p>
          </div>
          <div className="p-4 border-t border-slate-200 flex gap-2">
            <Link
              href="/production"
              className="flex-1 h-10 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] flex items-center justify-center font-semibold"
            >
              Bỏ qua
            </Link>
            <button
              type="button"
              disabled={saving || !editing.loaded || !!editing.error}
              onClick={save}
              className="flex-1 h-10 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : 'Lưu lệnh'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
