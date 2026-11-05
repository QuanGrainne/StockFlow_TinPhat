// src/app/(dashboard)/orders/OrdersClient.tsx
// Màn hình Hóa đơn (theo mẫu KiotViet):
// - Cột trái: bộ lọc Chi nhánh, Thời gian, Trạng thái, Trạng thái trả hàng, Phương thức thanh toán, Bảng giá.
// - Bên phải: tìm theo mã hóa đơn, nút "+ Hóa đơn" mở màn Bán hàng POS, Xuất file.
// - Bảng hóa đơn có dòng tổng ở đầu bảng; bấm 1 dòng để mở chi tiết (Thông tin / Lịch sử thanh toán).

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Pagination, Select, Table, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, CloudDownloadOutlined, ImportOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { Star } from 'lucide-react';

import { orderService } from '@/features/orders/services/orderService';
import type { OrderListFilter, OrderListItem } from '@/features/orders/types';
import { KiotVietOrderDetail } from '@/features/orders/components/KiotVietOrderDetail';
import {
  PAYMENT_METHOD_OPTIONS,
  exportInvoicesToXLSX,
  formatDateTime,
  toDateKey,
} from '@/features/orders/utils/invoiceUtils';
import { priceBookService } from '@/features/price-books/services/priceBookService';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';

const money = new Intl.NumberFormat('vi-VN');

type TimePreset = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL';

const TIME_PRESETS: { value: TimePreset; label: string }[] = [
  { value: 'TODAY', label: 'Hôm nay' },
  { value: 'YESTERDAY', label: 'Hôm qua' },
  { value: 'LAST_7_DAYS', label: '7 ngày qua' },
  { value: 'THIS_MONTH', label: 'Tháng này' },
  { value: 'LAST_MONTH', label: 'Tháng trước' },
  { value: 'ALL', label: 'Toàn thời gian' },
];

const STAR_KEY = 'stockflow_invoice_stars';

function presetRange(preset: TimePreset): { from?: string; to?: string } {
  const now = new Date();
  const day = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  switch (preset) {
    case 'TODAY':
      return { from: toDateKey(now), to: toDateKey(now) };
    case 'YESTERDAY':
      return { from: toDateKey(day(-1)), to: toDateKey(day(-1)) };
    case 'LAST_7_DAYS':
      return { from: toDateKey(day(-6)), to: toDateKey(now) };
    case 'THIS_MONTH':
      return {
        from: toDateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case 'LAST_MONTH':
      return {
        from: toDateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDateKey(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    default:
      return {};
  }
}

function readStars(): number[] {
  try {
    const raw = localStorage.getItem(STAR_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === 'number') : [];
  } catch {
    return [];
  }
}

interface OrdersClientProps {
  onNavigate?: (screenId: string) => void;
}

/** Khung 1 nhóm bộ lọc ở cột trái */
function FilterCard({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-white px-3.5 py-3 shadow-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-800">{title}</span>
        {extra}
      </div>
      {children}
    </section>
  );
}

function CheckRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-[13px] text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#0071BA]" />
      <span>{label}</span>
    </label>
  );
}

export default function OrdersClient({ onNavigate }: OrdersClientProps) {
  const router = useRouter();
  const { activeWarehouse, warehouses } = useActiveWarehouse();

  // ─── Bộ lọc ────────────────────────────────────────────────────────────────
  const [warehouseIds, setWarehouseIds] = useState<number[]>(() => [activeWarehouse.warehouseId]);
  const [timeMode, setTimeMode] = useState<'PRESET' | 'CUSTOM'>('PRESET');
  const [timePreset, setTimePreset] = useState<TimePreset>('THIS_MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [statusCompleted, setStatusCompleted] = useState(true);
  const [statusCancelled, setStatusCancelled] = useState(false);
  const [noReturn, setNoReturn] = useState(true);
  const [hasReturn, setHasReturn] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>(undefined);
  const [priceBookName, setPriceBookName] = useState<string | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // ─── Dữ liệu ───────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<OrderListItem[]>([]);
  /** Khóa của lần tải gần nhất đã xong → so với khóa hiện tại để biết đang tải */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [priceBookOptions, setPriceBookOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [stars, setStars] = useState<number[]>(() => (typeof window === 'undefined' ? [] : readStars()));
  const [pageSize, setPageSize] = useState(15);
  // Trang và dòng đang mở gắn với bộ lọc: đổi bộ lọc thì tự về trang 1, đóng chi tiết
  const [pageState, setPageState] = useState<{ key: string; page: number }>({ key: '', page: 1 });
  const [expandState, setExpandState] = useState<{ key: string; id: number | null }>({ key: '', id: null });

  useEffect(() => {
    priceBookService
      .getPriceBooks()
      .then((list) => setPriceBookOptions(list.map((p) => ({ value: p.priceBookName, label: p.priceBookName }))))
      .catch(() => setPriceBookOptions([]));
  }, []);

  // Tìm kiếm: chờ người dùng ngừng gõ 300ms rồi mới gọi API
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const customRangeInvalid = timeMode === 'CUSTOM' && !!customFrom && !!customTo && customFrom > customTo;

  const serverFilter = useMemo<OrderListFilter>(() => {
    const range = timeMode === 'CUSTOM' ? { from: customFrom || undefined, to: customTo || undefined } : presetRange(timePreset);
    const statuses = [statusCompleted && 'COMPLETED', statusCancelled && 'CANCELLED'].filter(Boolean).join(',');
    const returnStatus = noReturn === hasReturn ? 'ALL' : noReturn ? 'NO_RETURN' : 'HAS_RETURN';
    return {
      search: search || undefined,
      // API chỉ nhận 1 kho; chọn nhiều kho thì lọc tiếp ở client
      warehouseId: warehouseIds.length === 1 ? warehouseIds[0] : undefined,
      fromDate: range.from,
      toDate: range.to,
      status: statuses || undefined,
      returnStatus,
      paymentMethod,
      priceBookName,
    };
  }, [search, warehouseIds, timeMode, timePreset, customFrom, customTo, statusCompleted, statusCancelled, noReturn, hasReturn, paymentMethod, priceBookName]);

  const filterKey = useMemo(() => `${JSON.stringify(serverFilter)}|${warehouseIds.join(',')}`, [serverFilter, warehouseIds]);
  const requestKey = `${filterKey}#${reloadTick}`;
  const loading = !customRangeInvalid && loadedKey !== requestKey;

  useEffect(() => {
    if (customRangeInvalid) return;
    let alive = true;
    orderService
      .getOrders(serverFilter)
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setRows([]);
        message.error(err instanceof Error ? err.message : 'Không thể tải danh sách hóa đơn.');
      })
      .finally(() => {
        if (alive) setLoadedKey(requestKey);
      });
    return () => {
      alive = false;
    };
  }, [serverFilter, customRangeInvalid, requestKey]);

  const loadOrders = useCallback(() => setReloadTick((t) => t + 1), []);

  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key: filterKey, page: p });
  const expandedId = expandState.key === filterKey ? expandState.id : null;
  const setExpandedId = (id: number | null) => setExpandState({ key: filterKey, id });

  const filteredRows = useMemo(() => {
    if (warehouseIds.length <= 1) return rows;
    const set = new Set(warehouseIds);
    return rows.filter((r) => r.warehouseId != null && set.has(r.warehouseId));
  }, [rows, warehouseIds]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => ({
          subTotal: acc.subTotal + (r.subTotal || 0),
          discount: acc.discount + (r.discountAmount || 0),
          paid: acc.paid + (r.paidAmount || 0),
        }),
        { subTotal: 0, discount: 0, paid: 0 }
      ),
    [filteredRows]
  );

  const pageRows = useMemo(() => filteredRows.slice((page - 1) * pageSize, page * pageSize), [filteredRows, page, pageSize]);

  const toggleStar = (orderId: number) => {
    setStars((prev) => {
      const next = prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId];
      try {
        localStorage.setItem(STAR_KEY, JSON.stringify(next));
      } catch {
        // trình duyệt chặn localStorage: chỉ giữ trong phiên
      }
      return next;
    });
  };

  const openPos = () => {
    if (onNavigate) onNavigate('pos');
    else router.push('/pos');
  };

  const handleExport = () => {
    const source = selectedKeys.length > 0 ? filteredRows.filter((r) => selectedKeys.includes(r.orderId)) : filteredRows;
    if (source.length === 0) {
      message.warning('Không có hóa đơn nào để xuất file.');
      return;
    }
    exportInvoicesToXLSX(source);
    message.success(`Đã xuất ${source.length} hóa đơn ra file Excel.`);
  };

  // Phím tắt: F1 mở màn bán hàng, F3 tìm hóa đơn
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        openPos();
      } else if (e.key === 'F3') {
        e.preventDefault();
        document.getElementById('invoice-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNavigate]);

  const columns: ColumnsType<OrderListItem> = [
    {
      key: 'star',
      width: 42,
      align: 'center',
      title: <Star size={14} className="mx-auto text-slate-400" />,
      render: (_, r) => (
        <button
          type="button"
          aria-label="Đánh dấu hóa đơn"
          onClick={(e) => {
            e.stopPropagation();
            toggleStar(r.orderId);
          }}
          className="cursor-pointer"
        >
          <Star size={14} className={stars.includes(r.orderId) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-slate-400'} />
        </button>
      ),
    },
    {
      key: 'code',
      title: 'Mã hóa đơn',
      width: 140,
      render: (_, r) => <span className="text-[13px] text-[#262626]">{r.orderCode}</span>,
    },
    {
      key: 'time',
      title: 'Thời gian',
      width: 160,
      render: (_, r) => <span className="text-[13px] text-[#262626]">{formatDateTime(r.orderDate)}</span>,
    },
    {
      key: 'returnCode',
      title: 'Mã trả hàng',
      width: 130,
      render: (_, r) => <span className="text-[13px] text-[#595959]">{r.returnCode || ''}</span>,
    },
    {
      key: 'partnerCode',
      title: 'Mã KH',
      width: 120,
      render: (_, r) => <span className="text-[13px] text-[#595959]">{r.partnerCode || ''}</span>,
    },
    {
      key: 'partner',
      title: 'Khách hàng',
      render: (_, r) => <span className="text-[13px] text-[#262626]">{r.partnerCode ? r.partnerName : 'Khách lẻ'}</span>,
    },
    {
      key: 'subTotal',
      title: 'Tổng tiền hàng',
      align: 'right',
      width: 150,
      render: (_, r) => <span className="text-[13px]">{money.format(r.subTotal || 0)}</span>,
    },
    {
      key: 'discount',
      title: 'Giảm giá',
      align: 'right',
      width: 120,
      render: (_, r) => <span className="text-[13px]">{money.format(r.discountAmount || 0)}</span>,
    },
    {
      key: 'paid',
      title: 'Khách đã trả',
      align: 'right',
      width: 140,
      render: (_, r) => <span className="text-[13px]">{money.format(r.paidAmount || 0)}</span>,
    },
  ];

  const warehouseOptions = warehouses.map((w) => ({ value: w.warehouseId, label: w.name }));

  return (
    <div className="flex h-full min-h-[calc(100vh-56px)] gap-4 bg-[#f0f2f5] p-4 text-[#262626]">
      {/* ─── CỘT TRÁI: BỘ LỌC ─── */}
      <aside className="hidden w-[260px] shrink-0 flex-col gap-3 lg:flex">
        <h1 className="px-1 text-[20px] font-bold tracking-tight text-slate-900">Hóa đơn</h1>

        <FilterCard title="Chi nhánh">
          <Select
            mode="multiple"
            allowClear
            value={warehouseIds}
            onChange={(v: number[]) => setWarehouseIds(v)}
            options={warehouseOptions}
            placeholder="Tất cả chi nhánh"
            className="w-full"
            maxTagCount="responsive"
          />
        </FilterCard>

        <FilterCard title="Thời gian">
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="radio" checked={timeMode === 'PRESET'} onChange={() => setTimeMode('PRESET')} className="h-4 w-4 accent-[#0071BA]" />
              <Select<TimePreset>
                value={timePreset}
                onChange={(v) => {
                  setTimePreset(v);
                  setTimeMode('PRESET');
                }}
                options={TIME_PRESETS}
                className="flex-1"
                size="middle"
              />
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                checked={timeMode === 'CUSTOM'}
                onChange={() => setTimeMode('CUSTOM')}
                className="mt-2.5 h-4 w-4 accent-[#0071BA]"
              />
              <div className="flex-1 space-y-1.5">
                {timeMode !== 'CUSTOM' ? (
                  <button
                    type="button"
                    onClick={() => setTimeMode('CUSTOM')}
                    className="h-8 w-full rounded-[6px] border border-slate-300 px-3 text-left text-[13px] text-slate-700 hover:border-slate-400"
                  >
                    Tùy chỉnh
                  </button>
                ) : (
                  <>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      aria-label="Từ ngày"
                      className="h-8 w-full rounded-[6px] border border-slate-300 px-2 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      aria-label="Đến ngày"
                      className="h-8 w-full rounded-[6px] border border-slate-300 px-2 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {customRangeInvalid && <p className="text-[11px] text-rose-600">Từ ngày phải nhỏ hơn hoặc bằng Đến ngày.</p>}
                  </>
                )}
              </div>
            </label>
          </div>
        </FilterCard>

        <FilterCard title="Trạng thái">
          <CheckRow checked={statusCompleted} label="Hoàn thành" onChange={setStatusCompleted} />
          <CheckRow checked={statusCancelled} label="Đã hủy" onChange={setStatusCancelled} />
        </FilterCard>

        <FilterCard title="Trạng thái trả hàng">
          <CheckRow checked={noReturn} label="Không trả hàng" onChange={setNoReturn} />
          <CheckRow checked={hasReturn} label="Có trả hàng" onChange={setHasReturn} />
        </FilterCard>

        <FilterCard title="Phương thức thanh toán">
          <Select
            allowClear
            value={paymentMethod}
            onChange={(v: string | undefined) => setPaymentMethod(v)}
            options={PAYMENT_METHOD_OPTIONS}
            placeholder="Chọn phương thức thanh toán..."
            className="w-full"
          />
        </FilterCard>

        <FilterCard title="Bảng giá">
          <Select
            allowClear
            showSearch
            value={priceBookName}
            onChange={(v: string | undefined) => setPriceBookName(v)}
            options={priceBookOptions}
            placeholder="Chọn bảng giá"
            className="w-full"
          />
        </FilterCard>
      </aside>

      {/* ─── BÊN PHẢI: THANH CÔNG CỤ + BẢNG ─── */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Input
            id="invoice-search"
            allowClear
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            prefix={<SearchOutlined className="text-[#8c8c8c]" />}
            placeholder="Theo mã hóa đơn, tên hoặc SĐT khách hàng (F3)"
            className="h-[36px] w-full rounded-[6px] sm:w-[420px]"
          />
          <div className="flex items-center gap-2">
            <Tooltip title="Mở màn hình bán hàng (F1)">
              <Button icon={<PlusOutlined />} onClick={openPos} className="!border-[#0071BA] font-medium !text-[#0071BA]">
                Hóa đơn
              </Button>
            </Tooltip>
            <Tooltip title="Chưa hỗ trợ nhập hóa đơn từ file">
              <Button icon={<ImportOutlined />} disabled>
                Import file
              </Button>
            </Tooltip>
            <Button icon={<CloudDownloadOutlined />} onClick={handleExport}>
              Xuất file
            </Button>
            <Tooltip title="Tải lại">
              <Button icon={<ReloadOutlined spin={loading} />} onClick={loadOrders} aria-label="Tải lại danh sách" />
            </Tooltip>
            <Tooltip title="Thiết lập đơn hàng">
              <Button
                icon={<SettingOutlined />}
                aria-label="Thiết lập đơn hàng"
                onClick={() => (onNavigate ? onNavigate('/settings/orders') : router.push('/settings/orders'))}
              />
            </Tooltip>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-xs">
          <Table<OrderListItem>
            className="stockflow-invoices-table"
            rowKey="orderId"
            size="middle"
            loading={loading}
            columns={columns}
            dataSource={pageRows}
            pagination={false}
            scroll={{ x: 1100, y: 'calc(100vh - 260px)' }}
            rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys, columnWidth: 44 }}
            rowClassName={(r) =>
              r.orderId === expandedId
                ? 'stockflow-invoice-row-expanded'
                : r.status === 'CANCELLED'
                ? 'bg-rose-50/40 hover:bg-rose-50/70'
                : ''
            }
            onRow={(r) => ({
              onClick: () => setExpandedId(expandedId === r.orderId ? null : r.orderId),
              className: 'cursor-pointer',
            })}
            expandable={{
              showExpandColumn: false,
              expandedRowKeys: expandedId != null ? [expandedId] : [],
              expandedRowClassName: () => 'stockflow-invoice-expanded',
              expandedRowRender: (r) => (
                <KiotVietOrderDetail
                  orderId={r.orderId}
                  onClose={() => setExpandedId(null)}
                  onReloadList={loadOrders}
                  onOpenPos={openPos}
                />
              ),
            }}
            locale={{ emptyText: 'Không tìm thấy hóa đơn nào phù hợp với bộ lọc.' }}
            summary={() =>
              filteredRows.length > 0 ? (
                <Table.Summary fixed="top">
                  <Table.Summary.Row className="stockflow-invoice-summary">
                    <Table.Summary.Cell index={0} colSpan={7} />
                    <Table.Summary.Cell index={7} align="right">
                      <strong>{money.format(totals.subTotal)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="right">
                      <strong>{money.format(totals.discount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={9} align="right">
                      <strong>{money.format(totals.paid)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 px-1 py-3">
          <div className="text-xs text-slate-500">
            {selectedKeys.length > 0 ? `Đã chọn ${selectedKeys.length} hóa đơn` : 'Chọn hóa đơn để xuất file hàng loạt'}
          </div>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={filteredRows.length}
            showSizeChanger
            pageSizeOptions={[15, 30, 50, 100]}
            onChange={(p, ps) => {
              setPage(ps !== pageSize ? 1 : p);
              setPageSize(ps);
              setExpandedId(null);
            }}
            showTotal={(total, range) => `${range[0]}-${range[1]} trên ${total} hóa đơn`}
          />
        </div>
      </section>
    </div>
  );
}
