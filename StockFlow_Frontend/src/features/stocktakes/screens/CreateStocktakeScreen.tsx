'use client';

// Kiểm kho — bố cục giống form Chuyển hàng: thanh tiêu đề (tìm hàng + thêm theo nhóm hàng, kho làm việc, avatar),
// bảng hàng kiểm bên trái (thêm từ file Excel khi chưa có hàng), khung thông tin + Lưu tạm / Hoàn thành bên phải.
// Lưu tạm = phiếu tạm (chưa đổi tồn kho) · Hoàn thành = cân bằng kho (tồn kho = SL thực tế).
// ?edit=<id>: mở lại phiếu tạm · ?copy=<id>: tạo phiếu mới từ phiếu cũ.

import { tabSession } from '@/lib/auth/tabSession';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  FileSpreadsheet,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useActiveWarehouse, type WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import { FormHeaderUserBar } from '@/components/FormHeaderUserBar';
import { AddFromCategoryPopover } from '@/features/purchases/components/AddFromCategoryPopover';
import type { BackendProduct } from '@/features/products/services/productService';
import { transferService } from '@/features/transfers/services/transferService';
import { stocktakeService } from '@/features/stocktakes/services/stocktakeService';
import type { ProductForTransfer } from '@/features/transfers/types';
import type { SaveStocktakePayload } from '@/features/stocktakes/types';

interface Row {
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  systemQty: number;
  unitCost: number;
  /** null = chưa kiểm */
  actualQty: number | null;
}

type Tab = 'all' | 'match' | 'diff' | 'unchecked';

/** Tiền tố mã khi sao chép phiếu (giống phiếu nhập) */
const COPY_CODE_PREFIX = 'Copy_';

const GRID ='36px 44px 120px minmax(200px,1fr) 80px 100px 120px 100px 120px';
const MIN_WIDTH = 36 + 44 + 120 + 200 + 80 + 100 + 120 + 100 + 120 + 24;
const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const qtyFmt = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 3 });

function readUserName(): string {
  try {
    const raw = tabSession.get('stockflow_user');
    if (!raw) return '';
    const u = JSON.parse(raw) as { fullName?: string; username?: string };
    return u.fullName || u.username || '';
  } catch {
    return '';
  }
}

function nowText(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Lấy tồn kho + giá vốn hiện tại của 1 hàng tại kho (theo mã hàng) */
async function freshStock(warehouseId: number, code: string, productId?: number): Promise<ProductForTransfer | undefined> {
  try {
    const list = await transferService.getProductsForTransfer(warehouseId, undefined, code);
    return list.find((p) => (productId ? p.productId === productId : p.productCode.toUpperCase() === code.toUpperCase()));
  } catch {
    return undefined;
  }
}

export default function CreateStocktakeScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('edit');
  const copyId = params.get('copy');
  const { activeWarehouse } = useActiveWarehouse();

  const [rows, setRows] = useState<Row[]>([]);
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [lockedWarehouse, setLockedWarehouse] = useState<{ id: number; name: string } | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<{ key: string; items: ProductForTransfer[] }>({ key: '', items: [] });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [userName] = useState(readUserName);
  const [createdAt] = useState(nowText);

  // Kho kiểm: phiếu đang mở thì theo phiếu, tạo mới thì theo Kho làm việc
  const warehouseId = lockedWarehouse?.id ?? activeWarehouse?.warehouseId;
  const warehouseName = lockedWarehouse?.name ?? activeWarehouse?.name ?? '';

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  /** Lấy lại tồn kho / giá vốn hiện tại cho danh sách hàng tại 1 kho */
  const refreshRows = (whId: number, list: Row[]) => {
    Promise.all(list.map((r) => freshStock(whId, r.productCode, r.productId))).then((fresh) => {
      setRows((prev) =>
        prev.map((r) => {
          const f = fresh.find((p) => p?.productId === r.productId);
          return f ? { ...r, systemQty: f.sourceStock, unitCost: f.costPrice } : { ...r, systemQty: 0 };
        })
      );
    });
  };

  // Mở phiếu tạm / sao chép
  useEffect(() => {
    const sourceId = editId ?? copyId;
    if (!sourceId) return;
    let alive = true;
    stocktakeService
      .getById(sourceId)
      .then((d) => {
        if (!alive) return;
        if (editId) {
          if (d.summary.status !== 'DRAFT') {
            showToast('Chỉ mở được phiếu kiểm ở trạng thái Phiếu tạm.', 'error');
            router.replace('/stocktakes');
            return;
          }
          setCode(d.summary.stocktakeCode);
          setLockedWarehouse({ id: d.summary.warehouseId, name: d.summary.warehouseName });
        } else {
          // Sao chép: hiện mã "Copy_KK..." như phiếu nhập; khi lưu hệ thống tự sinh mã mới
          setCode(`${COPY_CODE_PREFIX}${d.summary.stocktakeCode}`);
        }
        setNotes(d.summary.notes ?? '');
        const loaded: Row[] = d.items.map((it) => ({
          productId: it.productId,
          productCode: it.productCode,
          productName: it.productName,
          unit: it.unit,
          systemQty: it.systemQty,
          unitCost: it.unitCost,
          actualQty: it.actualQty,
        }));
        setRows(loaded);
        const whId = editId ? d.summary.warehouseId : activeWarehouse?.warehouseId;
        if (whId) refreshRows(whId, loaded);
      })
      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Không tải được phiếu kiểm', 'error'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, copyId]);

  // Tìm hàng hóa theo kho kiểm
  const searchKey = `${warehouseId ?? ''}|${search.trim()}`;
  useEffect(() => {
    if (!warehouseId || !search.trim()) return;
    let alive = true;
    const timer = setTimeout(() => {
      transferService
        .getProductsForTransfer(warehouseId, undefined, search.trim())
        .then((items) => alive && setSearchResult({ key: searchKey, items }))
        .catch(() => alive && setSearchResult({ key: searchKey, items: [] }));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [searchKey, warehouseId, search]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const addRows = (incoming: Row[]) => {
    setRows((prev) => {
      const map = new Map(prev.map((r) => [r.productId, r]));
      const added: Row[] = [];
      for (const r of incoming) {
        const existing = map.get(r.productId);
        if (existing) {
          // Đã có trong phiếu: chỉ cập nhật SL thực tế nếu dòng mới có
          if (r.actualQty !== null) map.set(r.productId, { ...existing, actualQty: r.actualQty });
        } else {
          map.set(r.productId, r);
          added.push(r);
        }
      }
      return [...added, ...prev.map((r) => map.get(r.productId) ?? r)];
    });
  };

  const addProduct = (p: ProductForTransfer) => {
    addRows([
      {
        productId: p.productId,
        productCode: p.productCode,
        productName: p.productName,
        unit: p.unitName,
        systemQty: p.sourceStock,
        unitCost: p.costPrice,
        actualQty: null,
      },
    ]);
    setSearch('');
    setSearchOpen(false);
  };

  // Thêm cả nhóm hàng (tồn kho theo kho kiểm), giá vốn lấy lại theo kho cho chính xác
  const handleAddFromCategories = (products: BackendProduct[], categoryNames: string[]) => {
    const existing = new Set(rows.map((r) => r.productId));
    const toAdd = products.filter((p) => !existing.has(p.productId));
    if (toAdd.length === 0) {
      showToast(products.length === 0 ? `Nhóm ${categoryNames.join(', ')} chưa có hàng hóa` : 'Tất cả hàng của nhóm đã có trong phiếu');
      return;
    }
    const newRows: Row[] = toAdd.map((p) => ({
      productId: p.productId,
      productCode: p.code,
      productName: p.name,
      unit: p.uom || 'Cái',
      systemQty: p.stockQuantity || 0,
      unitCost: p.costPrice || 0,
      actualQty: null,
    }));
    addRows(newRows);
    if (warehouseId) refreshRows(warehouseId, newRows);
    showToast(`Đã thêm ${newRows.length} hàng hóa từ nhóm ${categoryNames.join(', ')}`);
  };

  // Đổi kho làm việc khi đang tạo phiếu mới → tồn kho / giá vốn tính lại theo kho mới
  const handleWarehouseChange = (w: WarehouseItem) => {
    if (rows.length > 0) refreshRows(w.warehouseId, rows);
  };

  // ─── Excel: tải file mẫu, đọc file (cột "Mã hàng", "Thực tế") ───────────────
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Mã hàng', 'Thực tế'],
      ['SP000001', 10],
    ]);
    ws['!cols'] = [{ wch: 18 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KiemKho');
    XLSX.writeFile(wb, 'MauKiemKho.xlsx');
  };

  const handleImport = async (file: File) => {
    if (!warehouseId) {
      showToast('Chưa chọn kho làm việc.', 'error');
      return;
    }
    setImporting(true);
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const lines = data
        .map((r) => ({
          code: String(r['Mã hàng'] ?? r['Ma hang'] ?? r['code'] ?? '').trim(),
          actual: Number(String(r['Thực tế'] ?? r['Thuc te'] ?? r['actual'] ?? '').replace(/,/g, '')),
        }))
        .filter((l) => l.code);
      if (lines.length === 0) {
        showToast('File không có dữ liệu. Cần 2 cột "Mã hàng" và "Thực tế".', 'error');
        return;
      }
      const found = await Promise.all(lines.map((l) => freshStock(warehouseId, l.code)));
      const missing: string[] = [];
      const newRows: Row[] = [];
      lines.forEach((l, i) => {
        const p = found[i];
        if (!p) {
          missing.push(l.code);
          return;
        }
        newRows.push({
          productId: p.productId,
          productCode: p.productCode,
          productName: p.productName,
          unit: p.unitName,
          systemQty: p.sourceStock,
          unitCost: p.costPrice,
          actualQty: Number.isFinite(l.actual) && l.actual >= 0 ? l.actual : null,
        });
      });
      addRows(newRows);
      showToast(
        missing.length > 0
          ? `Đã thêm ${newRows.length} hàng. Không tìm thấy: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`
          : `Đã thêm ${newRows.length} hàng từ file ${file.name}`,
        missing.length > 0 ? 'error' : 'success'
      );
    } catch {
      showToast('Không đọc được file Excel.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const updateActual = (productId: number, raw: string) => {
    const clean = raw.replace(/[^\d.]/g, '');
    setRows((prev) => prev.map((r) => (r.productId === productId ? { ...r, actualQty: clean === '' ? null : Number(clean) } : r)));
  };

  const diffOf = (r: Row) => (r.actualQty === null ? 0 : r.actualQty - r.systemQty);
  const counts = useMemo(
    () => ({
      all: rows.length,
      match: rows.filter((r) => r.actualQty !== null && r.actualQty === r.systemQty).length,
      diff: rows.filter((r) => r.actualQty !== null && r.actualQty !== r.systemQty).length,
      unchecked: rows.filter((r) => r.actualQty === null).length,
    }),
    [rows]
  );
  const visibleRows = rows.filter((r) =>
    tab === 'all'
      ? true
      : tab === 'unchecked'
        ? r.actualQty === null
        : tab === 'match'
          ? r.actualQty !== null && diffOf(r) === 0
          : r.actualQty !== null && diffOf(r) !== 0
  );
  const totalActual = rows.reduce((s, r) => s + (r.actualQty ?? 0), 0);
  const totalDiff = rows.reduce((s, r) => s + diffOf(r), 0);
  const totalDiffValue = rows.reduce((s, r) => s + diffOf(r) * r.unitCost, 0);

  async function save(status: 'DRAFT' | 'BALANCED') {
    if (!warehouseId) {
      showToast('Chưa xác định được kho kiểm. Vui lòng chọn Kho làm việc.', 'error');
      return;
    }
    if (rows.length === 0) {
      showToast('Vui lòng thêm ít nhất 1 hàng hóa để kiểm kho.', 'error');
      return;
    }
    if (counts.unchecked > 0) {
      showToast(`Còn ${counts.unchecked} hàng chưa nhập số lượng thực tế.`, 'error');
      setTab('unchecked');
      return;
    }
    const payload: SaveStocktakePayload = {
      warehouseId,
      // Mã "Copy_..." chỉ để nhận biết phiếu sao chép → để trống cho hệ thống tự sinh KK mới
      stocktakeCode: code.trim() && !code.trim().toLowerCase().startsWith(COPY_CODE_PREFIX.toLowerCase()) ? code.trim() : null,
      notes: notes.trim() || null,
      status,
      items: rows.map((r) => ({ productId: r.productId, actualQty: r.actualQty ?? 0 })),
    };
    setSaving(true);
    try {
      const saved = editId ? await stocktakeService.update(editId, payload) : await stocktakeService.create(payload);
      showToast(
        status === 'BALANCED'
          ? `Đã cân bằng kho phiếu ${saved.summary.stocktakeCode}`
          : `Đã lưu tạm phiếu ${saved.summary.stocktakeCode}`
      );
      setTimeout(() => router.push('/stocktakes'), 700);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không lưu được phiếu kiểm kho', 'error');
    } finally {
      setSaving(false);
    }
  }

  const searching = search.trim() !== '' && searchResult.key !== searchKey;
  const tabs: [Tab, string][] = [
    ['all', `Tất cả (${counts.all})`],
    ['match', `Khớp (${counts.match})`],
    ['diff', `Lệch (${counts.diff})`],
    ['unchecked', `Chưa kiểm (${counts.unchecked})`],
  ];

  return (
    <div className="flex flex-col h-screen stockflow-brand-bg text-[13px] text-[#15171a] select-none overflow-hidden font-sans">
      {toast && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded-[8px] shadow-lg text-white font-medium flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-[#fb2c36]' : 'bg-[#00b63e]'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] shadow-lg max-w-md w-full border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[15px] font-bold">Cân bằng kho</h3>
              <button type="button" onClick={() => setConfirmOpen(false)} className="text-[#677484] hover:text-[#15171a] cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <p className="px-5 py-4 text-[13px] leading-relaxed">
              Cân bằng kho sẽ thay đổi tồn kho hiện tại của hàng hóa trong phiếu kiểm kho tại <strong>{warehouseName}</strong>.
              Bạn có chắc chắn muốn Cân bằng kho?
            </p>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="px-4 h-8 text-xs rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] cursor-pointer">
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  void save('BALANCED');
                }}
                className="px-4 h-8 text-xs rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold cursor-pointer"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 1. Thanh tiêu đề ─── */}
      <header className="h-12 bg-white/85 backdrop-blur-[2px] border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/stocktakes"
            className="p-1 rounded-[8px] text-[#677484] hover:text-[#15171a] hover:bg-[#f7f8f9] transition"
            title="Quay lại danh sách phiếu kiểm kho"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </Link>
          <span className="text-[20px] font-semibold tracking-tight whitespace-nowrap leading-[36px]">Kiểm kho</span>
        </div>

        <div className="flex-1 max-w-xl ml-4 mr-auto relative" ref={searchRef}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => search.trim() && setSearchOpen(true)}
            placeholder="Tìm hàng hóa theo mã hoặc tên"
            className="w-full h-8 pl-8 pr-8 rounded-full bg-[#f7f8f9] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
          />
          {/* Thêm hàng hóa theo nhóm hàng (tồn kho theo kho kiểm) */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <AddFromCategoryPopover
              warehouseId={warehouseId}
              onAddProducts={handleAddFromCategories}
              onError={(msg) => showToast(msg, 'error')}
            />
          </div>
          {searchOpen && search.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] z-50 max-h-80 overflow-y-auto divide-y divide-slate-100">
              {searching ? (
                <div className="p-4 text-center text-[#677484] italic">Đang tìm hàng hóa...</div>
              ) : searchResult.items.length === 0 ? (
                <div className="p-4 text-center text-[#677484]">Không tìm thấy hàng hóa nào phù hợp với từ khóa &quot;{search}&quot;</div>
              ) : (
                searchResult.items.map((p) => (
                  <div
                    key={p.productId}
                    onClick={() => addProduct(p)}
                    className="p-2.5 hover:bg-[#eff6ff] flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0070f4] group-hover:underline">{p.productCode}</span>
                      <span className="text-[11px] font-medium">{p.productName}</span>
                      <span className="text-[10px] px-1.5 rounded-[4px] bg-[#f7f8f9] text-[#677484]">{p.unitName}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-[#677484]">Tồn kho:</span>
                      <span className={`font-bold ${p.sourceStock > 0 ? 'text-[#00b63e]' : 'text-[#fb2c36]'}`}>
                        {qtyFmt(p.sourceStock)} {p.unitName}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <FormHeaderUserBar
          lockedWarehouseName={lockedWarehouse?.name}
          onWarehouseChange={handleWarehouseChange}
        />
      </header>

      {/* ─── 2. Bảng hàng kiểm + khung thông tin ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col bg-white/65 overflow-hidden">
          <div className="flex items-center gap-1 border-b border-slate-200 px-4 shrink-0">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-3 py-2 text-[13px] border-b-2 -mb-px cursor-pointer ${
                  tab === key ? 'border-[#0070f4] text-[#0070f4] font-semibold' : 'border-transparent text-[#677484] hover:text-[#15171a]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            <div style={{ minWidth: MIN_WIDTH }}>
              <div
                className="h-10 bg-[#e8f2ff] border-b border-slate-200 grid items-center px-3 font-semibold text-[13px] sticky top-0 z-10"
                style={{ gridTemplateColumns: GRID }}
              >
                <span />
                <span>STT</span>
                <span>Mã hàng</span>
                <span>Tên hàng</span>
                <span>ĐVT</span>
                <span className="text-right">Tồn kho</span>
                <span className="text-right">Thực tế</span>
                <span className="text-right">SL lệch</span>
                <span className="text-right">Giá trị lệch</span>
              </div>

              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="font-semibold text-[14px] mb-1">Thêm sản phẩm từ file excel</div>
                  <div className="text-xs text-[#677484] mb-4">
                    (Tải về file mẫu:{' '}
                    <button type="button" onClick={downloadTemplate} className="text-[#0070f4] hover:underline cursor-pointer">
                      Excel file
                    </button>
                    )
                  </div>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 h-9 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold cursor-pointer disabled:opacity-60"
                  >
                    <FileSpreadsheet size={15} />
                    {importing ? 'Đang đọc file...' : 'Chọn file dữ liệu'}
                  </button>
                  <div className="text-[11px] text-[#677484] mt-3">Hoặc tìm hàng / chọn nhóm hàng ở ô tìm kiếm phía trên</div>
                </div>
              ) : visibleRows.length === 0 ? (
                <div className="py-16 text-center text-[#677484]">Không có hàng hóa nào</div>
              ) : (
                visibleRows.map((r, i) => {
                  const diff = diffOf(r);
                  return (
                    <div
                      key={r.productId}
                      className="grid items-center px-3 py-2 border-b border-slate-100 hover:bg-[#f7f8f9]/60"
                      style={{ gridTemplateColumns: GRID }}
                    >
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((x) => x.productId !== r.productId))}
                        className="text-[#677484] hover:text-rose-600 cursor-pointer"
                        title="Xóa dòng"
                      >
                        <Trash2 size={14} />
                      </button>
                      <span className="text-slate-400">{i + 1}</span>
                      <span className="font-mono text-[#0070f4] font-medium truncate">{r.productCode}</span>
                      <span className="truncate pr-2" title={r.productName}>{r.productName}</span>
                      <span className="text-[#0070f4]">{r.unit}</span>
                      <span className="text-right">{qtyFmt(r.systemQty)}</span>
                      <span className="text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={r.actualQty === null ? '' : String(r.actualQty)}
                          onChange={(e) => updateActual(r.productId, e.target.value)}
                          placeholder="Nhập SL"
                          className="w-24 h-7 px-2 text-right rounded-[6px] border border-slate-300 focus:outline-none focus:border-[#0070f4]"
                        />
                      </span>
                      <span className={`text-right ${diff < 0 ? 'text-[#fb2c36]' : diff > 0 ? 'text-[#16a34a]' : ''}`}>
                        {r.actualQty === null ? '—' : diff > 0 ? `+${qtyFmt(diff)}` : qtyFmt(diff)}
                      </span>
                      <span className="text-right">{r.actualQty === null ? '—' : money.format(diff * r.unitCost)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <div className="min-h-10 bg-[#f7f8f9] border-t border-slate-200 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-[#677484] shrink-0">
              <div className="flex items-center gap-4">
                <span>
                  Số mặt hàng: <strong className="text-[#15171a]">{rows.length}</strong>
                </span>
                <span>
                  Tổng SL lệch: <strong className="text-[#0070f4] text-sm">{totalDiff > 0 ? `+${qtyFmt(totalDiff)}` : qtyFmt(totalDiff)}</strong>
                </span>
              </div>
              <div>
                <span className="mr-2">Tổng giá trị lệch:</span>
                <span className="text-sm font-bold text-[#15171a] font-mono">{money.format(totalDiffValue)} đ</span>
              </div>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImport(f);
              e.target.value = '';
            }}
          />
        </div>

        {/* Thu gọn / mở khung thông tin */}
        <div className="relative z-10 w-0 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-[#0070f4] hover:bg-[#eff6ff] cursor-pointer"
            title={sidebarCollapsed ? 'Mở rộng khung thông tin' : 'Thu gọn khung thông tin'}
          >
            {sidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <aside className="w-[380px] bg-white/80 backdrop-blur-[2px] border-l border-slate-200 flex flex-col shrink-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="h-8 px-2.5 rounded-[8px] border border-slate-300 flex items-center gap-2 min-w-0 flex-1">
                  <CircleUserRound size={16} className="shrink-0" />
                  <span className="truncate">{userName || 'Người kiểm'}</span>
                </div>
                <div className="h-8 px-2.5 rounded-[8px] border border-slate-300 flex items-center text-[12px] text-[#677484]" title="Thời gian kiểm">
                  {createdAt}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span>Mã kiểm kho</span>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Mã phiếu tự động"
                  className="w-44 h-8 px-2.5 rounded-[8px] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4]"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span>Kho kiểm</span>
                <span className="text-right truncate">{warehouseName || '—'}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span>Trạng thái</span>
                <span>Phiếu tạm</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  Tổng SL thực tế
                  <span
                    className="min-w-[18px] h-[18px] px-1 rounded-full border border-[#677484] text-[11px] leading-none flex items-center justify-center text-[#677484]"
                    title={`${rows.length} mặt hàng`}
                  >
                    {rows.length}
                  </span>
                </span>
                <span>{qtyFmt(totalActual)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">Tổng giá trị lệch</span>
                <span className={`font-bold ${totalDiffValue < 0 ? 'text-[#fb2c36]' : 'text-[#0070f4]'}`}>{money.format(totalDiffValue)}</span>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú"
                rows={3}
                className="w-full p-2.5 rounded-[8px] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] resize-none"
              />
            </div>

            <div className="p-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save('DRAFT')}
                className="h-11 rounded-[8px] border border-[#0070f4] bg-white hover:bg-[#eff6ff] text-[#0070f4] font-semibold text-[14px] cursor-pointer disabled:opacity-50"
              >
                Lưu tạm
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmOpen(true)}
                className="h-11 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[14px] cursor-pointer disabled:opacity-50"
              >
                Hoàn thành
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
