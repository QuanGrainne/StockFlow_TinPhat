// src/features/credit-requests/screens/ApprovalInboxScreen.tsx
// Approval Inbox của Manager (màn 3.2.2.2) — yêu cầu vượt hạn mức công nợ (UC-64, BR-13).
// Bố cục giống các màn danh sách Xuất hủy / Chuyển hàng:
//   Header (tiêu đề, tìm kiếm, Làm mới) → [Bộ lọc Trạng thái | Bảng] → chân bảng đếm số yêu cầu.
// Bấm một dòng → xổ chi tiết ngay dưới dòng (Xuất file, In; đang chờ thì Từ chối / Duyệt mở popup duyệt).
// Số cạnh "Chờ duyệt" = số yêu cầu đang chờ (không có chuông thông báo).

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { FileDown, Inbox, RefreshCcw, Search, X } from 'lucide-react';

import CreditRequestDetailModal, { CreditStatusBadge, type CreditDecision } from '../components/CreditRequestDetailModal';
import { CreditRequestDetailPanel } from '../components/CreditRequestDetailPanel';
import { creditRequestService } from '../services/creditRequestService';
import type { CreditRequest, CreditRequestStatus } from '../types';
import { APPROVAL_TYPE_LABEL, formatVnd } from '../utils/creditRequestUtils';
import { exportCreditRequestListExcel } from '../utils/creditRequestDocs';
import { formatDateTimeVN } from '@/lib/utils/date';

/** Bộ lọc trạng thái dạng checkbox (chọn nhiều), giống bộ lọc ở Nhập hàng / Xuất hủy */
const STATUS_FILTERS: { value: CreditRequestStatus; label: string }[] = [
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
];

type Align = 'right' | 'center' | undefined;

/** Các cột của bảng (cột Mã yêu cầu luôn ở đầu) */
const COLUMNS: { key: string; label: string; align?: Align; cell: (r: CreditRequest) => React.ReactNode }[] = [
  {
    key: 'partner',
    label: 'Khách hàng',
    cell: (r) => (
      <span className="block max-w-[260px] truncate" title={`${r.partnerCode ?? ''} - ${r.partnerName ?? ''}`}>
        {r.partnerName ?? '—'}
        {r.partnerCode && <span className="block text-[12px] text-[#677484]">{r.partnerCode}</span>}
      </span>
    ),
  },
  { key: 'debt', label: 'Dư nợ hiện tại', align: 'right', cell: (r) => formatVnd(r.currentDebt) },
  { key: 'limit', label: 'Hạn mức hiện tại', align: 'right', cell: (r) => formatVnd(r.currentCreditLimit) },
  {
    key: 'requested',
    label: 'Hạn mức đề xuất',
    align: 'right',
    cell: (r) => <span className="font-semibold">{formatVnd(r.requestedLimit)}</span>,
  },
  { key: 'approved', label: 'Mức duyệt', align: 'right', cell: (r) => (r.approvedLimit == null ? '—' : formatVnd(r.approvedLimit)) },
  { key: 'by', label: 'Người gửi', cell: (r) => <span className="whitespace-nowrap">{r.requestedByName ?? '—'}</span> },
  { key: 'time', label: 'Thời gian gửi', cell: (r) => <span className="whitespace-nowrap">{formatDateTimeVN(r.requestDate)}</span> },
  {
    key: 'status',
    label: 'Trạng thái',
    align: 'center',
    cell: (r) => (
      <span className="inline-flex flex-col items-center gap-0.5">
        <CreditStatusBadge status={r.status} />
        {r.approvalType && (
          <span className="text-[11px] text-[#677484] whitespace-nowrap">
            {APPROVAL_TYPE_LABEL[r.approvalType]}
          </span>
        )}
      </span>
    ),
  },
];

export default function ApprovalInboxScreen() {
  const [statuses, setStatuses] = useState<CreditRequestStatus[]>(['PENDING', 'APPROVED']);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  /** Dòng đang xổ chi tiết */
  const [expandedId, setExpandedId] = useState<number | null>(null);
  /** Popup duyệt đang mở (bấm Duyệt / Từ chối trong chi tiết) */
  const [decide, setDecide] = useState<{ id: number; decision: CreditDecision } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // API chỉ lọc được một trạng thái → tải tất cả rồi lọc theo các ô đã tick ở máy khách
  const requestKey = JSON.stringify({ search, reloadTick });
  const [result, setResult] = useState<{ key: string; items: CreditRequest[]; pendingCount: number }>({
    key: '',
    items: [],
    pendingCount: 0,
  });
  const loading = result.key !== requestKey;

  useEffect(() => {
    let stale = false;
    const params = JSON.parse(requestKey) as { search: string };
    creditRequestService
      .getAll('', params.search)
      .then((data) => {
        if (!stale) setResult({ key: requestKey, items: data.items, pendingCount: data.pendingCount });
      })
      .catch((err: unknown) => {
        if (stale) return;
        message.error(err instanceof Error ? err.message : 'Không thể tải danh sách yêu cầu.');
        setResult((prev) => ({ key: requestKey, items: [], pendingCount: prev.pendingCount }));
      });
    return () => {
      stale = true;
    };
  }, [requestKey]);

  // Bỏ tick hết = không hiện yêu cầu nào (giống Xuất hủy)
  const items = useMemo(() => result.items.filter((r) => statuses.includes(r.status)), [result.items, statuses]);
  const toggleStatus = (s: CreditRequestStatus) =>
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);
  const closeDecide = useCallback(() => setDecide(null), []);

  const th = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';
  const alignCls = (a: Align) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : '');
  const colSpan = COLUMNS.length + 1;

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-transparent overflow-hidden text-[13px] text-[#15171a] font-sans">
      {/* 1. Header */}
      <header className="min-h-12 bg-white/84 backdrop-blur-[2px] border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        <div className="flex items-center gap-4 flex-1 basis-[320px] min-w-[260px] max-w-xl">
          <h1 className="text-[20px] font-bold leading-7 tracking-tight whitespace-nowrap">Duyệt hạn mức</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Theo mã yêu cầu, mã hoặc tên khách hàng"
              className="w-full h-8 pl-8 pr-8 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] hover:text-[#15171a] cursor-pointer"
                title="Xóa từ khóa"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] bg-white cursor-pointer"
          >
            <RefreshCcw size={14} className={`text-[#677484] ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={() => exportCreditRequestListExcel(items)}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown size={14} className="text-[#677484]" />
            <span>Xuất file</span>
          </button>
        </div>
      </header>

      {/* 2. Bộ lọc + bảng */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="relative shrink-0 h-full flex">
          <aside
            className={`${
              sidebarCollapsed ? 'w-0 border-r-0' : 'w-60 border-r border-slate-200'
            } h-full min-h-0 bg-white/75 backdrop-blur-[2px] flex flex-col shrink-0 transition-all duration-200 select-none overflow-hidden`}
          >
            {!sidebarCollapsed && (
              <div className="flex-1 min-h-0 p-3.5 space-y-4 overflow-y-auto">
                <div>
                  <div className="text-[11px] font-bold text-[#677484] mb-2 uppercase tracking-wide">Loại yêu cầu</div>
                  <div className="text-xs font-semibold text-[#0070f4]">Yêu cầu hạn mức công nợ</div>
                </div>
                <div className="border-t border-slate-100" />
                <div>
                  <div className="text-[11px] font-bold text-[#677484] mb-2 uppercase tracking-wide">Trạng thái</div>
                  <div className="space-y-2">
                    {STATUS_FILTERS.map((f) => {
                      const checked = statuses.includes(f.value);
                      return (
                        <label
                          key={f.value}
                          className="flex items-center gap-2 text-xs text-[#15171a] hover:text-[#0070f4] cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStatus(f.value)}
                            className="w-4 h-4 rounded border-slate-300 accent-[#0070f4] cursor-pointer"
                          />
                          <span className="flex-1">{f.label}</span>
                          {f.value === 'PENDING' && result.pendingCount > 0 && (
                            <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#0070f4] text-white text-[11px] font-semibold inline-flex items-center justify-center">
                              {result.pendingCount}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </aside>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-[#0070f4] text-[#0070f4] hover:bg-[#e6f1fe] shadow-xs flex items-center justify-center cursor-pointer z-30 text-[11px]"
            title={sidebarCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white/62">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className={th}>Mã yêu cầu</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className={`${th} ${alignCls(c.align)}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={colSpan} className="py-20 text-center text-[#677484]">
                      <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải yêu cầu...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="py-24 text-center text-[#677484]">
                      <Inbox size={28} className="mx-auto mb-2 text-[#0070f4]" />
                      Không có yêu cầu nào phù hợp
                    </td>
                  </tr>
                ) : (
                  items.map((r) => {
                    const isExpanded = expandedId === r.requestId;
                    return (
                      <React.Fragment key={r.requestId}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : r.requestId)}
                          className={`cursor-pointer ${isExpanded ? 'bg-[#e6f1fe]/80' : 'hover:bg-[#f7f8f9]'}`}
                        >
                          <td className="py-2.5 px-3 font-mono font-medium text-[#0070f4] whitespace-nowrap">
                            {r.requestCode ?? `#${r.requestId}`}
                          </td>
                          {COLUMNS.map((c) => (
                            <td key={c.key} className={`py-2.5 px-3 ${alignCls(c.align)}`}>
                              {c.cell(r)}
                            </td>
                          ))}
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={colSpan} className="p-0 border-b-2 border-[#0070f4] bg-white">
                              <CreditRequestDetailPanel
                                request={r}
                                onDecide={(decision) => setDecide({ id: r.requestId, decision })}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <footer className="h-10 bg-white/82 backdrop-blur-[2px] border-t border-slate-200 px-4 flex items-center text-[12px] text-[#677484] shrink-0">
            Hiển thị <strong className="mx-1 text-[#15171a]">{items.length}</strong> yêu cầu
            {result.pendingCount > 0 && (
              <>
                <span className="mx-2">·</span>
                <span>
                  <strong className="text-[#d97706]">{result.pendingCount}</strong> đang chờ duyệt
                </span>
              </>
            )}
          </footer>
        </div>
      </div>

      <CreditRequestDetailModal
        key={decide ? `${decide.id}-${decide.decision}` : 'none'}
        requestId={decide?.id ?? null}
        initialDecision={decide?.decision}
        onClose={closeDecide}
        onChanged={reload}
      />
    </div>
  );
}
