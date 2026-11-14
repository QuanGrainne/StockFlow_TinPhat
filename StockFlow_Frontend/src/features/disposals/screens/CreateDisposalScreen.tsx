'use client';

// Xuất hủy — bố cục giống form Kiểm kho / Chuyển hàng: thanh tiêu đề (tìm hàng F3 + thêm theo nhóm hàng, kho làm việc, avatar),
// bảng hàng hủy bên trái (SL hủy × giá vốn = giá trị hủy), khung thông tin + Lưu tạm / Hoàn thành bên phải.
// Lưu tạm = Phiếu tạm (chưa trừ tồn kho) · Hoàn thành = trừ tồn kho theo giá vốn hiện tại, ghi thẻ kho "Xuất hủy".
// ?edit=<id>: mở lại phiếu tạm · ?copy=<id>: tạo phiếu mới từ phiếu cũ (nút "Sao chép" ở chi tiết phiếu).

import { tabSession } from '@/lib/auth/tabSession';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, CircleUserRound, Search, Trash2, X } from 'lucide-react';
import { useActiveWarehouse, type WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import { FormHeaderUserBar } from '@/components/layout/FormHeaderUserBar';
import { ProductThumb } from '@/components/ProductThumb';
import { AddFromCategoryPopover } from '@/features/purchases';
import type { BackendProduct } from '@/features/products/services/productService';
import { transferService } from '@/features/transfers/services/transferService';
import type { ProductForTransfer } from '@/features/transfers/types';
import { disposalService } from '@/features/disposals/services/disposalService';
import type { SaveDisposalPayload } from '@/features/disposals/types';

/** Trạng thái gửi khi lưu phiếu: Lưu tạm hoặc Hoàn thành */
type SaveStatus = SaveDisposalPayload['status'];

interface Row {
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  /** Tồn kho hiện tại tại kho hủy */
  stock: number;
  /** Giá vốn hiện tại tại kho hủy */
  unitCost: number;
  /** null = chưa nhập SL hủy */
  quantity: number | null;
}

// Xóa | STT | Mã hàng | Tên hàng | ĐVT | Tồn kho | SL hủy | Giá vốn | Giá trị hủy
const GRID = '36px 44px 120px minmax(200px,1fr) 80px 100px 120px 110px 130px';
const MIN_WIDTH = 36 + 44 + 120 + 200 + 80 + 100 + 120 + 110 + 130 + 24;
const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const qtyFmt = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

function readUserName(): string {
  try {
    const raw = tabSession.get('stockflow_user');
    if (!raw) return '';
    const u = JSON.parse(raw) as { fullName?: string; username?: string; phone?: string };
    const name = u.fullName || u.username || '';
    return u.phone ? `${name} - ${u.phone}` : name;
  } catch {
    return '';
  }
}

/** Giá trị ô datetime-local (giờ máy) của một thời điểm */
function toInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Tiền tố mã khi sao chép phiếu (giống phiếu kiểm kho); backend bỏ qua và tự sinh mã mới */
const COPY_CODE_PREFIX = 'Copy_';

/** Tồn kho + giá vốn hiện tại của 1 hàng tại kho (theo mã hàng) */
async function freshStock(warehouseId: number, code: string, productId: number): Promise<ProductForTransfer | undefined> {
  try {
    const list = await transferService.getProductsForTransfer(warehouseId, undefined, code);
    return list.find((p) => p.productId === productId);
  } catch {
    return undefined;
  }
}

export default function CreateDisposalScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('edit');
  const copyId = params.get('copy');
  const { activeWarehouse } = useActiveWarehouse();

  const [rows, setRows] = useState<Row[]>([]);
  const [code, setCode] = useState('');
  const [reason, setReason] = useState('');
  const [lockedWarehouse, setLockedWarehouse] = useState<{ id: number; name: string } | null>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<{ key: string; items: ProductForTransfer[] }>({ key: '', items: [] });
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [userName] = useState(readUserName);
  /** Ngày xuất hủy (mặc định bây giờ, không chọn được thời gian tương lai) */
  const [dateValue, setDateValue] = useState(() => toInputValue(new Date()));

  // Kho hủy: phiếu đang mở thì theo phiếu, tạo mới thì theo Kho làm việc
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
          return f ? { ...r, stock: f.sourceStock, unitCost: f.costPrice } : { ...r, stock: 0 };
        })
      );
    });
  };

  // Mở lại phiếu tạm / sao chép phiếu
  useEffect(() => {
    const sourceId = editId ?? copyId;
    if (!sourceId) return;
    let alive = true;
    disposalService
      .getById(sourceId)
      .then((d) => {
        if (!alive) return;
        if (editId) {
          if (d.summary.status !== 'DRAFT') {
            showToast('Chỉ mở được phiếu xuất hủy ở trạng thái Phiếu tạm.', 'error');
            router.replace('/disposals');
            return;
          }
          setCode(d.summary.disposalCode);
          setLockedWarehouse({ id: d.summary.warehouseId, name: d.summary.warehouseName });
          if (d.summary.disposalDate) setDateValue(toInputValue(new Date(d.summary.disposalDate)));
        } else {
          // Sao chép: phiếu mới ở Kho làm việc, ngày = bây giờ, mã tự sinh khi lưu
          setCode(`${COPY_CODE_PREFIX}${d.summary.disposalCode}`);
        }
        setReason(d.summary.reason ?? '');
        const loaded: Row[] = d.items.map((it) => ({
          productId: it.productId,
          productCode: it.productCode,
          productName: it.productName,
          unit: it.unit,
          stock: 0,
          unitCost: it.unitCost,
          quantity: it.quantity,
        }));
        setRows(loaded);
        const whId = editId ? d.summary.warehouseId : activeWarehouse?.warehouseId;
        if (whId) refreshRows(whId, loaded);
      })
      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Không tải được phiếu xuất hủy', 'error'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, copyId]);

  // Tìm hàng hóa theo kho hủy (kèm tồn kho + giá vốn)
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

  // Đóng gợi ý khi bấm ra ngoài; F3 = tới ô tìm hàng (như màn Bán hàng)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  /** Thêm hàng vào phiếu; hàng đã có thì cộng thêm 1 vào SL hủy */
  const addRows = (incoming: Row[]) => {
    setRows((prev) => {
      const map = new Map(prev.map((r) => [r.productId, r]));
      const added: Row[] = [];
      for (const r of incoming) {
        const existing = map.get(r.productId);
        if (existing) map.set(r.productId, { ...existing, quantity: (existing.quantity ?? 0) + 1 });
        else {
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
        stock: p.sourceStock,
        unitCost: p.costPrice,
        quantity: 1,
      },
    ]);
    setSearch('');
    setSearchOpen(false);
    searchInputRef.current?.focus();
  };

  // Thêm cả nhóm hàng; tồn kho / giá vốn lấy lại theo kho hủy cho chính xác
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
      stock: p.stockQuantity || 0,
      unitCost: p.costPrice || 0,
      quantity: null,
    }));
    setRows((prev) => [...newRows, ...prev]);
    if (warehouseId) refreshRows(warehouseId, newRows);
    showToast(`Đã thêm ${newRows.length} hàng hóa từ nhóm ${categoryNames.join(', ')}`);
  };

  // Đổi kho làm việc khi đang lập phiếu mới → tồn kho / giá vốn tính lại theo kho mới
  const handleWarehouseChange = (w: WarehouseItem) => {
    if (rows.length > 0) refreshRows(w.warehouseId, rows);
  };

  const updateQuantity = (productId: number, raw: string) => {
    const clean = raw.replace(/[^\d.]/g, '');
    setRows((prev) => prev.map((r) => (r.productId === productId ? { ...r, quantity: clean === '' ? null : Number(clean) } : r)));
  };

  const totalQty = rows.reduce((s, r) => s + (r.quantity ?? 0), 0);
  const totalValue = rows.reduce((s, r) => s + Math.round((r.quantity ?? 0) * r.unitCost), 0);

  /** Kiểm tra trước khi gửi (backend kiểm lại: đủ tồn, hàng đang kiểm kho, quyền kho) */
  function validate(status: SaveStatus): boolean {
    if (!warehouseId) {
      showToast('Chưa xác định được kho xuất hủy. Vui lòng chọn Kho làm việc.', 'error');
      return false;
    }
    if (rows.length === 0) {
      showToast('Vui lòng thêm ít nhất 1 hàng hóa cần xuất hủy.', 'error');
      return false;
    }
    const noQty = rows.find((r) => !r.quantity || r.quantity <= 0);
    if (noQty) {
      showToast(`Hàng ${noQty.productCode} chưa nhập số lượng hủy.`, 'error');
      return false;
    }
    if (dateValue && dateValue > toInputValue(new Date())) {
      showToast('Ngày xuất hủy không được ở tương lai.', 'error');
      return false;
    }
    if (status === 'COMPLETED') {
      const over = rows.find((r) => (r.quantity ?? 0) > r.stock);
      if (over) {
        showToast(`Hàng ${over.productCode} chỉ còn ${qtyFmt(over.stock)} trong kho, không thể hủy ${qtyFmt(over.quantity ?? 0)}.`, 'error');
        return false;
      }
      if (!reason.trim()) {
        showToast('Vui lòng nhập lý do xuất hủy trước khi hoàn thành phiếu.', 'error');
        return false;
      }
    }
    return true;
  }

  async function save(status: SaveStatus) {
    if (!validate(status) || !warehouseId) return;
    const payload: SaveDisposalPayload = {
      warehouseId,
      // Mã "Copy_..." chỉ để nhận biết phiếu sao chép → để trống cho hệ thống tự sinh XH mới
      disposalCode: code.trim() && !code.trim().toLowerCase().startsWith(COPY_CODE_PREFIX.toLowerCase()) ? code.trim() : null,
      reason: reason.trim() || null,
      status,
      items: rows.map((r) => ({ productId: r.productId, quantity: r.quantity ?? 0, reason: null })),
      disposalDate: dateValue ? new Date(dateValue).toISOString() : null,
    };
    setSaving(true);
    try {
      const saved = editId ? await disposalService.update(editId, payload) : await disposalService.create(payload);
      showToast(
        status === 'COMPLETED'
          ? `Đã hoàn thành phiếu xuất hủy ${saved.summary.disposalCode}`
          : `Đã lưu tạm phiếu xuất hủy ${saved.summary.disposalCode}`
      );
      setTimeout(() => router.push('/disposals'), 700);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không lưu được phiếu xuất hủy', 'error');
    } finally {
      setSaving(false);
    }
  }

  const searching = search.trim() !== '' && searchResult.key !== searchKey;

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
              <h3 className="text-[15px] font-bold">Hoàn thành phiếu xuất hủy</h3>
              <button type="button" onClick={() => setConfirmOpen(false)} className="text-[#677484] hover:text-[#15171a] cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <p className="px-5 py-4 text-[13px] leading-relaxed">
              Hệ thống sẽ trừ <strong>{qtyFmt(totalQty)}</strong> sản phẩm (giá trị <strong>{money.format(totalValue)} đ</strong>) khỏi tồn kho
              tại <strong>{warehouseName}</strong>. Phiếu đã hoàn thành không sửa được. Bạn có chắc chắn muốn hoàn thành?
            </p>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="px-4 h-8 text-xs rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] cursor-pointer">
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  void save('COMPLETED');
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
            href="/disposals"
            className="p-1 rounded-[8px] text-[#677484] hover:text-[#15171a] hover:bg-[#f7f8f9] transition"
            title="Quay lại danh sách phiếu xuất hủy"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </Link>
          <span className="text-[20px] font-semibold tracking-tight whitespace-nowrap leading-[36px]">Xuất hủy</span>
        </div>

        <div className="flex-1 max-w-xl ml-4 mr-auto relative" ref={searchRef}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => search.trim() && setSearchOpen(true)}
            onKeyDown={(e) => {
              // Enter: thêm hàng đầu tiên trong danh sách gợi ý
              if (e.key === 'Enter' && !searching && searchResult.items[0]) {
                e.preventDefault();
                addProduct(searchResult.items[0]);
              } else if (e.key === 'Escape') setSearchOpen(false);
            }}
            placeholder="Tìm hàng hóa theo mã hoặc tên (F3)"
            className="w-full h-8 pl-8 pr-8 rounded-full bg-[#f7f8f9] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
          />
          {/* Thêm hàng hóa theo nhóm hàng (tồn kho theo kho hủy) */}
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
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProductThumb src={p.imageUrl} alt={p.productName} />
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-[#0070f4] group-hover:underline">{p.productCode}</span>
                        <span className="text-[11px] font-medium truncate">{p.productName}</span>
                        <span className="text-[10px] px-1.5 rounded-[4px] bg-[#f7f8f9] text-[#677484] shrink-0">{p.unitName}</span>
                      </div>
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

        <FormHeaderUserBar lockedWarehouseName={lockedWarehouse?.name} onWarehouseChange={handleWarehouseChange} />
      </header>

      {/* ─── 2. Bảng hàng hủy + khung thông tin ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col bg-white/65 overflow-hidden">
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
                <span className="text-right">SL hủy</span>
                <span className="text-right">Giá vốn</span>
                <span className="text-right">Giá trị hủy</span>
              </div>

              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                    <Search size={24} />
                  </div>
                  <div className="font-semibold text-[14px] mb-1">Chưa có hàng hóa cần xuất hủy</div>
                  <div className="text-xs text-[#677484]">
                    Tìm hàng theo mã hoặc tên ở ô phía trên (phím tắt <b>F3</b>), hoặc chọn theo nhóm hàng
                  </div>
                </div>
              ) : (
                rows.map((r, i) => {
                  const over = (r.quantity ?? 0) > r.stock;
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
                      <span className="text-right">{qtyFmt(r.stock)}</span>
                      <span className="text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={r.quantity === null ? '' : String(r.quantity)}
                          onChange={(e) => updateQuantity(r.productId, e.target.value)}
                          placeholder="Nhập SL"
                          title={over ? `Vượt tồn kho (${qtyFmt(r.stock)})` : undefined}
                          className={`w-24 h-7 px-2 text-right rounded-[6px] border focus:outline-none ${
                            over ? 'border-[#fb2c36] text-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'
                          }`}
                        />
                      </span>
                      <span className="text-right">{money.format(r.unitCost)}</span>
                      <span className="text-right font-medium">{money.format(Math.round((r.quantity ?? 0) * r.unitCost))}</span>
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
                  Tổng SL hủy: <strong className="text-[#0070f4] text-sm">{qtyFmt(totalQty)}</strong>
                </span>
              </div>
              <div>
                <span className="mr-2">Tổng giá trị hủy:</span>
                <span className="text-sm font-bold text-[#15171a] font-mono">{money.format(totalValue)} đ</span>
              </div>
            </div>
          )}
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
                  <span className="truncate">{userName || 'Người lập'}</span>
                </div>
                <input
                  type="datetime-local"
                  value={dateValue}
                  max={toInputValue(new Date())}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="h-8 px-2 rounded-[8px] border border-slate-300 text-[12px] text-[#677484] bg-white hover:border-[#0070f4] focus:border-[#0070f4] focus:outline-none cursor-pointer transition"
                  title="Ngày xuất hủy"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span>Mã xuất hủy</span>
                <input
                  type="text"
                  value={code}
                  maxLength={30}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Mã phiếu tự động"
                  className="w-44 h-8 px-2.5 rounded-[8px] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4]"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span>Kho xuất hủy</span>
                <span className="text-right truncate">{warehouseName || '—'}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span>Trạng thái</span>
                <span>Phiếu tạm</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  Tổng SL hủy
                  <span
                    className="min-w-[18px] h-[18px] px-1 rounded-full border border-[#677484] text-[11px] leading-none flex items-center justify-center text-[#677484]"
                    title={`${rows.length} mặt hàng`}
                  >
                    {rows.length}
                  </span>
                </span>
                <span>{qtyFmt(totalQty)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">Tổng giá trị hủy</span>
                <span className="font-bold text-[#0070f4]">{money.format(totalValue)}</span>
              </div>

              <div>
                <label className="block mb-1.5">
                  Lý do xuất hủy <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Hàng lỗi sản xuất, hỏng do vận chuyển, hết hạn sử dụng..."
                  rows={4}
                  className="w-full p-2.5 rounded-[8px] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] resize-none"
                />
                <span className="text-[11px] text-[#677484]">Bắt buộc khi Hoàn thành phiếu</span>
              </div>
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
                onClick={() => validate('COMPLETED') && setConfirmOpen(true)}
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
