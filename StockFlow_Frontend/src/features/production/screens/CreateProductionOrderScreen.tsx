'use client';

// Lập / sửa lệnh sản xuất (UC-59, A58.1) — bố cục giống form Kiểm kho / Chuyển hàng:
// thanh tiêu đề (tìm thành phẩm có BOM đang áp dụng, kho làm việc, avatar),
// bảng nhu cầu NVL dự kiến bên trái (BR-31, tồn và thiếu hụt tại kho làm việc), khung thông tin lệnh + Lưu bên phải.
// ?edit=<id>: sửa lệnh còn Chưa bắt đầu (giữ định mức đã chụp / đã điều chỉnh nếu không đổi thành phẩm).

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { message } from 'antd';
import { AlertTriangle, ArrowLeft, Factory, Inbox, RefreshCcw, RotateCcw, Trash2 } from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { FormHeaderUserBar } from '@/components/layout/FormHeaderUserBar';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import { productionService } from '../services/productionService';
import type { ProductionOrderDetail, ProductionProductLookup } from '../types';
import { errorText, fmtQty, parseQty, todayIso } from '../utils/productionFormat';
import { ProductSearchInput } from '../components/ProductSearchInput';
import { inputCls, labelCls } from '../components/ProductionDialog';

interface MaterialDraft {
  key: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  origNorm: number | null;
  origRate: number | null;
  norm: string;
  rate: string;
  required: string;
  availableQty: number | null;
  fromBom: boolean;
}

interface ProductDraft {
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  planned: string;
  notes: string;
  bomCode: string;
  bomVersion: string;
  loadingBom: boolean;
  bomError?: string;
  materials: MaterialDraft[];
  origMaterials: MaterialDraft[];
  keepAdjustedFromOrder?: boolean;
}

const round2 = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;
const round4 = (n: number) => Math.round(n * 10000 + Number.EPSILON) / 10000;

const calcRequired = (planned: number, norm: number, rate: number) =>
  round2(planned * norm * (1 + rate / 100));

const calcNormFromRequired = (planned: number, required: number, rate: number) => {
  const denom = planned * (1 + rate / 100);
  return denom > 0 ? round4(required / denom) : 0;
};

const maxDecimals = (value: string, digits: number) => {
  const parts = value.trim().replace(',', '.').split('.');
  return parts.length < 2 || parts[1].length <= digits;
};

function isItemCustomized(item: ProductDraft): boolean {
  if (item.keepAdjustedFromOrder) return true;
  if (item.materials.length !== item.origMaterials.length) return true;
  return item.materials.some((m, idx) => {
    const orig = item.origMaterials[idx];
    if (!orig || orig.materialId !== m.materialId) return true;
    const norm = parseQty(m.norm);
    const rate = m.rate.trim() === '' ? 0 : parseQty(m.rate);
    return norm !== orig.origNorm || rate !== orig.origRate;
  });
}

export default function CreateProductionOrderScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = Number(searchParams.get('edit')) || null;
  const { activeWarehouse } = useActiveWarehouse();
  const warehouseId = activeWarehouse.warehouseId;

  const [items, setItems] = useState<ProductDraft[]>([]);
  const [activeProductId, setActiveProductId] = useState<number | null>(null);
  const [deadline, setDeadline] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [notes, setNotes] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [allowAllMaterialTypes, setAllowAllMaterialTypes] = useState(false);
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
      .getOrder(editId, warehouseId)
      .then((d) => {
        if (stale) return;
        if (d.summary.status !== 'NOT_STARTED') {
          setEditing({ loaded: true, detail: null, error: `Lệnh ${d.summary.code} không còn ở trạng thái Chưa bắt đầu nên không sửa được.` });
          return;
        }
        setEditing({ loaded: true, detail: d });
        const orderItems = d.summary.items && d.summary.items.length > 0
          ? d.summary.items
          : [
              {
                productionOrderItemId: 0,
                productId: d.summary.productId,
                productCode: d.summary.productCode,
                productName: d.summary.productName,
                unitName: d.summary.unitName,
                bomId: d.summary.bomId,
                bomCode: d.summary.bomCode,
                bomVersion: d.summary.bomVersion,
                plannedQuantity: d.summary.plannedQuantity,
                receivedQuantity: d.summary.receivedQuantity,
                remainingQuantity: Math.max(0, d.summary.plannedQuantity - d.summary.receivedQuantity),
                progressPercent: d.summary.progressPercent,
                notes: null,
              },
            ];

        const loadedDrafts: ProductDraft[] = orderItems.map((oi) => {
          const itemMats = d.materials.filter(
            (m) =>
              (oi.productionOrderItemId > 0 && m.productionOrderItemId === oi.productionOrderItemId) ||
              (!m.productionOrderItemId && oi.productId === d.summary.productId)
          );
          const draftMats: MaterialDraft[] = itemMats.map((m) => ({
            key: `r${m.requirementId}`,
            materialId: m.materialId,
            materialCode: m.materialCode,
            materialName: m.materialName,
            unitName: m.unitName,
            origNorm: m.normPerUnit,
            origRate: m.wastageRate,
            norm: String(m.normPerUnit),
            rate: String(m.wastageRate),
            required: String(m.requiredQty),
            availableQty: m.availableQty,
            fromBom: m.fromBom,
          }));
          return {
            productId: oi.productId,
            productCode: oi.productCode,
            productName: oi.productName,
            unitName: oi.unitName,
            planned: String(oi.plannedQuantity),
            notes: oi.notes ?? '',
            bomCode: oi.bomCode,
            bomVersion: oi.bomVersion,
            loadingBom: false,
            materials: draftMats,
            origMaterials: draftMats.map((x) => ({ ...x })),
            keepAdjustedFromOrder: itemMats.some((m) => m.isAdjusted),
          };
        });

        setItems(loadedDrafts);
        setActiveProductId(loadedDrafts[0]?.productId ?? null);
        setDeadline(d.summary.deadline ? d.summary.deadline.slice(0, 10) : '');
        setWorkshop(d.summary.workshop ?? '');
        setNotes(d.notes ?? '');
        const existingReason = d.materials.find((m) => m.adjustReason)?.adjustReason ?? '';
        setAdjustReason(existingReason);
      })
      .catch((err: unknown) => {
        if (!stale) setEditing({ loaded: true, detail: null, error: errorText(err, 'Không tải được lệnh sản xuất') });
      });
    return () => {
      stale = true;
    };
  }, [editId, warehouseId]);

  function loadBomForProduct(productId: number, plannedQty: number) {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, loadingBom: true, bomError: undefined } : it))
    );
    productionService
      .getRequirementPreview(productId, plannedQty > 0 ? plannedQty : 1, warehouseId)
      .then((preview) => {
        setItems((prev) =>
          prev.map((it) => {
            if (it.productId !== productId) return it;
            const currentPlanned = parseQty(it.planned);
            const effPlanned = !Number.isNaN(currentPlanned) && currentPlanned > 0 ? currentPlanned : 1;
            const mats: MaterialDraft[] = preview.materials.map((m) => {
              const reqQty = calcRequired(effPlanned, m.normPerUnit, m.wastageRate);
              return {
                key: `m${m.materialId}`,
                materialId: m.materialId,
                materialCode: m.materialCode,
                materialName: m.materialName,
                unitName: m.unitName,
                origNorm: m.normPerUnit,
                origRate: m.wastageRate,
                norm: String(m.normPerUnit),
                rate: String(m.wastageRate),
                required: String(reqQty),
                availableQty: m.availableQty,
                fromBom: true,
              };
            });
            return {
              ...it,
              bomCode: preview.bomCode,
              bomVersion: preview.bomVersion,
              loadingBom: false,
              bomError: undefined,
              materials: mats,
              origMaterials: mats.map((x) => ({ ...x })),
              keepAdjustedFromOrder: false,
            };
          })
        );
      })
      .catch((err: unknown) => {
        setItems((prev) =>
          prev.map((it) =>
            it.productId === productId
              ? { ...it, loadingBom: false, bomError: errorText(err, 'Không tải được định mức BOM') }
              : it
          )
        );
      });
  }

  function pickProduct(p: ProductionProductLookup) {
    const existing = items.find((it) => it.productId === p.productId);
    if (existing) {
      setActiveProductId(p.productId);
      message.info(`Thành phẩm ${p.productCode} đã có trong danh sách.`);
      return;
    }
    const newItem: ProductDraft = {
      productId: p.productId,
      productCode: p.productCode,
      productName: p.productName,
      unitName: p.unitName,
      planned: '1',
      notes: '',
      bomCode: '',
      bomVersion: '',
      loadingBom: true,
      materials: [],
      origMaterials: [],
    };
    setItems((prev) => [...prev, newItem]);
    setActiveProductId(p.productId);
    loadBomForProduct(p.productId, 1);
  }

  function removeProduct(productId: number) {
    setItems((prev) => {
      const next = prev.filter((it) => it.productId !== productId);
      if (activeProductId === productId) {
        setActiveProductId(next[0]?.productId ?? null);
      }
      return next;
    });
  }

  function updateProductPlanned(productId: number, value: string) {
    const q = parseQty(value);
    const qValid = !Number.isNaN(q) && q > 0;
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId !== productId) return it;
        const nextMats = it.materials.map((m) => {
          const norm = parseQty(m.norm);
          const rate = m.rate.trim() === '' ? 0 : parseQty(m.rate);
          if (qValid && !Number.isNaN(norm) && norm > 0 && !Number.isNaN(rate) && rate >= 0) {
            return { ...m, required: String(calcRequired(q, norm, rate)) };
          }
          return m;
        });
        return { ...it, planned: value, materials: nextMats };
      })
    );
  }

  function updateProductNotes(productId: number, value: string) {
    setItems((prev) => prev.map((it) => (it.productId === productId ? { ...it, notes: value } : it)));
  }

  const activeItem = items.find((it) => it.productId === activeProductId) ?? items[0] ?? null;

  // ─── Chỉnh sửa định mức 2 chiều trên bảng dưới ───
  function updateMaterialNorm(materialKey: string, newNormStr: string) {
    if (!activeItem) return;
    const q = parseQty(activeItem.planned);
    const qValid = !Number.isNaN(q) && q > 0;
    const norm = parseQty(newNormStr);
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId !== activeItem.productId) return it;
        return {
          ...it,
          materials: it.materials.map((m) => {
            if (m.key !== materialKey) return m;
            const rate = m.rate.trim() === '' ? 0 : parseQty(m.rate);
            const nextReq =
              qValid && !Number.isNaN(norm) && norm > 0 && !Number.isNaN(rate) && rate >= 0
                ? String(calcRequired(q, norm, rate))
                : m.required;
            return { ...m, norm: newNormStr, required: nextReq };
          }),
        };
      })
    );
  }

  function updateMaterialRate(materialKey: string, newRateStr: string) {
    if (!activeItem) return;
    const q = parseQty(activeItem.planned);
    const qValid = !Number.isNaN(q) && q > 0;
    const rate = newRateStr.trim() === '' ? 0 : parseQty(newRateStr);
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId !== activeItem.productId) return it;
        return {
          ...it,
          materials: it.materials.map((m) => {
            if (m.key !== materialKey) return m;
            const norm = parseQty(m.norm);
            const nextReq =
              qValid && !Number.isNaN(norm) && norm > 0 && !Number.isNaN(rate) && rate >= 0
                ? String(calcRequired(q, norm, rate))
                : m.required;
            return { ...m, rate: newRateStr, required: nextReq };
          }),
        };
      })
    );
  }

  function updateMaterialRequired(materialKey: string, newReqStr: string) {
    if (!activeItem) return;
    const q = parseQty(activeItem.planned);
    const qValid = !Number.isNaN(q) && q > 0;
    const reqQty = parseQty(newReqStr);
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId !== activeItem.productId) return it;
        return {
          ...it,
          materials: it.materials.map((m) => {
            if (m.key !== materialKey) return m;
            const rate = m.rate.trim() === '' ? 0 : parseQty(m.rate);
            const nextNorm =
              qValid && !Number.isNaN(reqQty) && reqQty > 0 && !Number.isNaN(rate) && rate >= 0
                ? String(calcNormFromRequired(q, reqQty, rate))
                : m.norm;
            return { ...m, required: newReqStr, norm: nextNorm };
          }),
        };
      })
    );
  }

  function addMaterialToActive(p: ProductionProductLookup) {
    if (!activeItem) return;
    if (p.productId === activeItem.productId) {
      message.warning('Thành phẩm không được là nguyên vật liệu của chính nó.');
      return;
    }
    if (activeItem.materials.some((m) => m.materialId === p.productId)) {
      message.warning(`Nguyên vật liệu ${p.productCode} đã có trong định mức của thành phẩm này.`);
      return;
    }
    const q = parseQty(activeItem.planned);
    const effPlanned = !Number.isNaN(q) && q > 0 ? q : 1;
    const newMat: MaterialDraft = {
      key: `add_${p.productId}_${Date.now()}`,
      materialId: p.productId,
      materialCode: p.productCode,
      materialName: p.productName,
      unitName: p.unitName,
      origNorm: null,
      origRate: null,
      norm: '1',
      rate: '0',
      required: String(calcRequired(effPlanned, 1, 0)),
      availableQty: p.availableQty,
      fromBom: false,
    };
    setItems((prev) =>
      prev.map((it) =>
        it.productId === activeItem.productId ? { ...it, materials: [...it.materials, newMat] } : it
      )
    );
  }

  function removeMaterialFromActive(materialKey: string) {
    if (!activeItem) return;
    setItems((prev) =>
      prev.map((it) =>
        it.productId === activeItem.productId
          ? { ...it, materials: it.materials.filter((m) => m.key !== materialKey) }
          : it
      )
    );
  }

  function restoreOriginalBom(productId: number) {
    loadBomForProduct(productId, parseQty(items.find((x) => x.productId === productId)?.planned ?? '1') || 1);
  }

  const deadlineError = deadline && deadline < todayIso() ? 'Hạn hoàn thành không được trước ngày hôm nay.' : null;
  const anyCustomized = items.some(isItemCustomized);

  const activeShortageCount = activeItem
    ? activeItem.materials.filter((m) => {
        const reqNum = parseQty(m.required);
        return m.availableQty !== null && !Number.isNaN(reqNum) && m.availableQty < reqNum;
      }).length
    : 0;

  async function save() {
    if (items.length === 0) {
      message.error('Vui lòng chọn ít nhất một thành phẩm cần sản xuất.');
      return;
    }
    for (const it of items) {
      const q = parseQty(it.planned);
      if (Number.isNaN(q) || q <= 0) {
        message.error(`Số lượng kế hoạch của thành phẩm ${it.productCode} phải lớn hơn 0.`);
        setActiveProductId(it.productId);
        return;
      }
      if (it.bomError) {
        message.error(it.bomError);
        setActiveProductId(it.productId);
        return;
      }
      if (it.materials.length === 0) {
        message.error(`Thành phẩm ${it.productCode} phải có ít nhất một nguyên vật liệu.`);
        setActiveProductId(it.productId);
        return;
      }
      for (const m of it.materials) {
        const norm = parseQty(m.norm);
        const rate = m.rate.trim() === '' ? 0 : parseQty(m.rate);
        const reqQty = parseQty(m.required);
        if (Number.isNaN(norm) || norm <= 0 || !maxDecimals(m.norm, 4)) {
          message.error(`Định mức / 1 đv của NVL ${m.materialCode} (${it.productCode}) phải > 0 và tối đa 4 chữ số thập phân.`);
          setActiveProductId(it.productId);
          return;
        }
        if (Number.isNaN(rate) || rate < 0 || rate > 100 || !maxDecimals(m.rate, 2)) {
          message.error(`Tỷ lệ hao hụt của NVL ${m.materialCode} (${it.productCode}) phải từ 0–100%.`);
          setActiveProductId(it.productId);
          return;
        }
        if (Number.isNaN(reqQty) || reqQty <= 0) {
          message.error(`Tổng SL cần của NVL ${m.materialCode} (${it.productCode}) phải lớn hơn 0.`);
          setActiveProductId(it.productId);
          return;
        }
      }
    }
    if (deadlineError) {
      message.error(deadlineError);
      return;
    }
    if (anyCustomized && !adjustReason.trim()) {
      message.error('Bạn đã điều chỉnh định mức NVL so với BOM gốc. Vui lòng nhập Lý do điều chỉnh định mức (BR-51).');
      return;
    }

    const first = items[0];
    const payload = {
      productId: first.productId,
      plannedQuantity: round2(parseQty(first.planned)),
      deadline: deadline || null,
      workshop: workshop.trim() || null,
      notes: notes.trim() || null,
      adjustReason: anyCustomized ? adjustReason.trim() : null,
      items: items.map((it) => {
        const customized = isItemCustomized(it);
        return {
          productId: it.productId,
          plannedQuantity: round2(parseQty(it.planned)),
          notes: it.notes.trim() || null,
          customMaterials: customized
            ? it.materials.map((m) => ({
                materialId: m.materialId,
                normPerUnit: round4(parseQty(m.norm)),
                wastageRate: round2(m.rate.trim() === '' ? 0 : parseQty(m.rate)),
                requiredQty: round2(parseQty(m.required)),
              }))
            : null,
        };
      }),
    };

    setSaving(true);
    try {
      const saved = editId
        ? await productionService.updateOrder(editId, payload)
        : await productionService.createOrder(payload);
      message.success(`Đã lưu lệnh sản xuất ${saved.summary.code}.`);
      router.push('/production');
    } catch (err) {
      message.error(errorText(err, 'Không lưu được lệnh sản xuất'));
    } finally {
      setSaving(false);
    }
  }

  const title = editId ? 'Sửa lệnh sản xuất' : 'Lập lệnh sản xuất';
  const cellInput = (bad: boolean) =>
    `w-full h-7 px-2 text-right text-xs border rounded-[6px] focus:outline-none ${
      bad ? 'border-[#fb2c36] bg-[#fef2f2]' : 'border-slate-300 focus:border-[#0070f4]'
    }`;

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
            placeholder="Thêm thành phẩm cần sản xuất vào lệnh (mã hoặc tên)"
            activeBomOnly
            productType="FINISHED"
            excludeIds={items.map((it) => it.productId)}
            onSelect={pickProduct}
            disabled={!editing.loaded || !!editing.error}
          />
        </div>
        <FormHeaderUserBar />
      </header>

      {/* ─── 2. Khu vực Master-Detail (Trên: Thành phẩm / Dưới: Định mức NVL) + Khung thông tin phải ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white/62 border-r border-slate-200">
          {!editing.loaded ? (
            <div className="flex-1 flex items-center justify-center text-[#677484]">
              <RefreshCcw size={18} className="animate-spin mr-2 text-[#0070f4]" /> Đang tải lệnh sản xuất...
            </div>
          ) : editing.error ? (
            <div className="flex-1 flex items-center justify-center text-[#fb2c36]">{editing.error}</div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#677484] text-center px-6">
              <div className="w-16 h-16 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                <Factory size={30} className="stroke-[1.5]" />
              </div>
              <div className="font-bold text-[#15171a] text-sm mb-1">Chọn thành phẩm cần sản xuất</div>
              <p className="text-xs max-w-md">
                Một lệnh sản xuất có thể chứa một hoặc nhiều thành phẩm (VD: TP00102 + TP00004). Bấm vào từng dòng thành phẩm ở bảng trên để xem và điều chỉnh định mức nguyên vật liệu ở bảng dưới.
              </p>
            </div>
          ) : (
            <>
              {/* ─── BẢNG TRÊN: DANH SÁCH THÀNH PHẨM TRONG LỆNH ─── */}
              <div className="border-b border-slate-200 bg-white/90 shrink-0 max-h-[38%] flex flex-col">
                <div className="px-4 py-2 bg-[#f7f8f9] border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#15171a]">
                    1. Danh sách thành phẩm sản xuất ({items.length} thành phẩm)
                  </span>
                  <span className="text-[11px] text-[#677484]">
                    Bấm chọn dòng thành phẩm để xem / chỉnh định mức NVL bên dưới
                  </span>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead className="text-[11px] font-semibold text-[#677484] bg-[#f7f8f9] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">STT</th>
                        <th className="py-2 px-3 w-36">Mã thành phẩm</th>
                        <th className="py-2 px-3">Tên thành phẩm</th>
                        <th className="py-2 px-3 w-16 text-center">ĐVT</th>
                        <th className="py-2 px-3 w-36 text-right">Số lượng KH *</th>
                        <th className="py-2 px-3 w-40">Định mức BOM</th>
                        <th className="py-2 px-3 w-48">Diễn giải dòng</th>
                        <th className="py-2 px-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it, idx) => {
                        const isSelected = activeItem?.productId === it.productId;
                        const q = parseQty(it.planned);
                        const qBad = Number.isNaN(q) || q <= 0;
                        const customized = isItemCustomized(it);
                        return (
                          <tr
                            key={it.productId}
                            onClick={() => setActiveProductId(it.productId)}
                            className={`text-xs cursor-pointer transition ${
                              isSelected ? 'bg-[#e6f1fe]/75 font-medium' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-[#0070f4]">{it.productCode}</td>
                            <td className="py-2 px-3">
                              {it.productName}
                              {customized && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                  Đã chỉnh ĐM
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-500">{it.unitName}</td>
                            <td className="py-1.5 px-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                inputMode="decimal"
                                value={it.planned}
                                onChange={(e) => updateProductPlanned(it.productId, e.target.value)}
                                placeholder="0"
                                className={cellInput(qBad)}
                              />
                            </td>
                            <td className="py-2 px-3 text-[11px] text-[#677484]">
                              {it.loadingBom ? (
                                'Đang tải BOM...'
                              ) : it.bomError ? (
                                <span className="text-[#fb2c36]">{it.bomError}</span>
                              ) : (
                                `${it.bomCode} (v${it.bomVersion})`
                              )}
                            </td>
                            <td className="py-1.5 px-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                value={it.notes}
                                onChange={(e) => updateProductNotes(it.productId, e.target.value)}
                                placeholder="Ghi chú thành phẩm..."
                                className="w-full h-7 px-2 text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4] bg-white"
                              />
                            </td>
                            <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => removeProduct(it.productId)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Xóa thành phẩm khỏi lệnh"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ─── BẢNG DƯỚI: ĐỊNH MỨC NGUYÊN VẬT LIỆU CỦA THÀNH PHẨM ĐANG CHỌN ─── */}
              {activeItem && (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-200 bg-white/85 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#0070f4]">
                        2. Định mức NVL của: {activeItem.productCode} — {activeItem.productName}
                      </span>
                      <span className="text-xs text-[#677484]">
                        Tồn tại kho: <b className="text-[#15171a]">{activeWarehouse.name}</b>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isItemCustomized(activeItem) && (
                        <button
                          type="button"
                          onClick={() => restoreOriginalBom(activeItem.productId)}
                          className="h-7 px-2.5 rounded-[6px] border border-slate-300 bg-white hover:bg-slate-50 text-xs flex items-center gap-1 text-[#677484] hover:text-[#15171a] cursor-pointer"
                          title="Khôi phục lại đúng định mức BOM gốc"
                        >
                          <RotateCcw size={12} /> Khôi phục BOM gốc
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Thanh thêm nhanh NVL vào định mức của thành phẩm đang chọn */}
                  <div className="px-4 py-2 border-b border-slate-100 bg-white/70 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1 max-w-md">
                      <ProductSearchInput
                        placeholder={`Thêm NVL cho ${activeItem.productCode} (mã hoặc tên)...`}
                        productType={allowAllMaterialTypes ? undefined : 'RAW_MATERIAL'}
                        excludeIds={[activeItem.productId, ...activeItem.materials.map((m) => m.materialId)]}
                        onSelect={addMaterialToActive}
                      />
                    </div>
                    <label className="inline-flex items-center gap-1.5 text-xs text-[#677484] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allowAllMaterialTypes}
                        onChange={(e) => setAllowAllMaterialTypes(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      Hiện cả Bán thành phẩm / Thành phẩm khi tìm NVL
                    </label>
                  </div>

                  <div className="flex-1 min-h-0 overflow-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead className="text-[12px] font-semibold text-[#677484]">
                        <tr>
                          {[
                            'STT',
                            'Mã NVL',
                            'Tên nguyên vật liệu',
                            'ĐVT',
                            'Định mức / 1 đv',
                            'Hao hụt %',
                            'Tổng SL cần',
                            'Tồn kho',
                            'Thiếu',
                            '',
                          ].map((h, i) => (
                            <th
                              key={h || 'act'}
                              className={`sticky top-0 z-20 bg-[#f7f8f9] py-2 px-3 border-b border-slate-200 whitespace-nowrap ${
                                i === 0
                                  ? 'w-10 text-center'
                                  : i === 3
                                    ? 'w-14 text-center'
                                    : i >= 4 && i <= 8
                                      ? 'text-right w-28'
                                      : i === 9
                                        ? 'w-10'
                                        : ''
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeItem.loadingBom ? (
                          <tr>
                            <td colSpan={10} className="py-14 text-center text-[#677484]">
                              <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                              Đang tính nhu cầu nguyên vật liệu...
                            </td>
                          </tr>
                        ) : activeItem.bomError ? (
                          <tr>
                            <td colSpan={10} className="py-14 text-center text-[#fb2c36]">
                              <AlertTriangle size={20} className="mx-auto mb-2" />
                              {activeItem.bomError}
                            </td>
                          </tr>
                        ) : activeItem.materials.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-14 text-center text-[#677484]">
                              <Inbox size={24} className="mx-auto mb-2 text-[#0070f4]" />
                              Chưa có nguyên vật liệu
                            </td>
                          </tr>
                        ) : (
                          activeItem.materials.map((m, i) => {
                            const normNum = parseQty(m.norm);
                            const rateNum = m.rate.trim() === '' ? 0 : parseQty(m.rate);
                            const reqNum = parseQty(m.required);
                            const normBad = Number.isNaN(normNum) || normNum <= 0 || !maxDecimals(m.norm, 4);
                            const rateBad = Number.isNaN(rateNum) || rateNum < 0 || rateNum > 100 || !maxDecimals(m.rate, 2);
                            const reqBad = Number.isNaN(reqNum) || reqNum <= 0;
                            const short =
                              m.availableQty === null || reqBad
                                ? null
                                : Math.max(0, round2(reqNum - Math.max(0, m.availableQty)));
                            const rowChanged =
                              !m.fromBom || normNum !== m.origNorm || rateNum !== m.origRate;

                            return (
                              <tr key={m.key} className={`text-[13px] ${rowChanged ? 'bg-[#fffbeb]/60' : ''}`}>
                                <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                                <td className="py-2 px-3 font-mono font-semibold">
                                  <ProductCodeLink code={m.materialCode} productId={m.materialId} />
                                  {!m.fromBom && (
                                    <span className="ml-1 text-[10px] text-[#0070f4] font-sans">mới</span>
                                  )}
                                </td>
                                <td className="py-2 px-3">{m.materialName}</td>
                                <td className="py-2 px-3 text-center text-slate-500">{m.unitName}</td>
                                <td className="py-1.5 px-3">
                                  <input
                                    inputMode="decimal"
                                    value={m.norm}
                                    onChange={(e) => updateMaterialNorm(m.key, e.target.value)}
                                    className={cellInput(normBad)}
                                    title="Sửa Định mức / 1 đv sẽ tự nhân ra Tổng SL cần"
                                  />
                                </td>
                                <td className="py-1.5 px-3">
                                  <input
                                    inputMode="decimal"
                                    value={m.rate}
                                    onChange={(e) => updateMaterialRate(m.key, e.target.value)}
                                    className={cellInput(rateBad)}
                                  />
                                </td>
                                <td className="py-1.5 px-3">
                                  <input
                                    inputMode="decimal"
                                    value={m.required}
                                    onChange={(e) => updateMaterialRequired(m.key, e.target.value)}
                                    className={`${cellInput(reqBad)} font-semibold`}
                                    title="Sửa Tổng SL cần sẽ tự chia ngược lại Định mức / 1 đv"
                                  />
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {m.availableQty === null ? '—' : fmtQty(m.availableQty)}
                                </td>
                                <td
                                  className={`py-2 px-3 text-right font-semibold ${
                                    short && short > 0 ? 'text-[#fb2c36]' : 'text-[#16a34a]'
                                  }`}
                                >
                                  {short === null ? '—' : short > 0 ? fmtQty(short) : 'Đủ'}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeMaterialFromActive(m.key)}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Xóa dòng NVL khỏi thành phẩm này"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <footer className="h-9 bg-white/82 border-t border-slate-200 px-4 flex items-center justify-between text-[12px] text-[#677484] shrink-0">
                    <span>
                      Hỗ trợ tính 2 chiều: Sửa <b>Định mức / 1 đv</b> ⇄ tự tính <b>Tổng SL cần</b> (làm tròn 4 chữ số thập phân cho định mức).
                    </span>
                    {activeShortageCount > 0 && (
                      <span className="text-[#fb2c36] font-semibold">
                        {activeShortageCount} NVL chưa đủ tồn tại kho đang chọn
                      </span>
                    )}
                  </footer>
                </div>
              )}
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
              <label className={labelCls}>Diễn giải / Ghi chú lệnh</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="VD: Lệnh sản xuất ngày..."
                className="w-full px-2.5 py-1.5 text-[13px] border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
              />
            </div>

            {anyCustomized && (
              <div className="p-2.5 rounded-[8px] bg-amber-50/90 border border-amber-200 space-y-1.5">
                <label className="block text-xs font-semibold text-amber-900">
                  Lý do điều chỉnh định mức NVL <span className="text-[#fb2c36]">*</span>
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Nhập lý do thay đổi định mức / thêm bớt NVL so với BOM gốc (BR-51)..."
                  className="w-full px-2 py-1.5 text-xs bg-white border border-amber-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
                />
                <p className="text-[11px] text-amber-800">
                  Chỉ áp dụng cho lệnh sản xuất này, định mức BOM gốc không thay đổi.
                </p>
              </div>
            )}

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
