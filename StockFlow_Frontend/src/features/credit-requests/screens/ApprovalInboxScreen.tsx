// src/features/credit-requests/screens/ApprovalInboxScreen.tsx
// Approval Inbox của Manager (màn 3.2.2.2) — tab "Yêu cầu hạn mức" (UC-64, BR-13).
// Danh sách: khách hàng, dư nợ hiện tại, hạn mức hiện tại, hạn mức đề xuất, người gửi, trạng thái;
// bấm một dòng để mở chi tiết và quyết định. Số trên tab = số yêu cầu đang chờ (không có chuông thông báo).

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ConfigProvider, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { RefreshCw, Search, ShieldCheck, X } from 'lucide-react';

import CreditRequestDetailModal from '../components/CreditRequestDetailModal';
import { creditRequestService } from '../services/creditRequestService';
import type { CreditRequest, CreditRequestStatusFilter } from '../types';
import { APPROVAL_TYPE_LABEL, CREDIT_STATUS, formatVnd } from '../utils/creditRequestUtils';
import { formatDateTimeVN } from '@/lib/utils/date';

const BRAND = '#0071BA';

const STATUS_FILTERS: { value: CreditRequestStatusFilter; label: string }[] = [
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: '', label: 'Tất cả' },
];

export default function ApprovalInboxScreen() {
  const [status, setStatus] = useState<CreditRequestStatusFilter>('PENDING');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const requestKey = JSON.stringify({ status, search, reloadTick });
  const [result, setResult] = useState<{ key: string; items: CreditRequest[]; pendingCount: number }>({
    key: '',
    items: [],
    pendingCount: 0,
  });
  const loading = result.key !== requestKey;

  useEffect(() => {
    let stale = false;
    const params = JSON.parse(requestKey) as { status: CreditRequestStatusFilter; search: string };
    creditRequestService
      .getAll(params.status, params.search)
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

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);
  const closeDetail = useCallback(() => setOpenId(null), []);

  const columns: ColumnsType<CreditRequest> = useMemo(
    () => [
      {
        title: 'Mã yêu cầu',
        dataIndex: 'requestCode',
        width: 130,
        render: (v: string | null, r) => (
          <span className="font-mono font-bold" style={{ color: BRAND }}>
            {v ?? `#${r.requestId}`}
          </span>
        ),
      },
      {
        title: 'Khách hàng',
        key: 'partner',
        render: (_: unknown, r) => (
          <span>
            <span className="text-[#677484]">{r.partnerCode}</span> {r.partnerName}
          </span>
        ),
      },
      {
        title: 'Dư nợ hiện tại',
        dataIndex: 'currentDebt',
        align: 'right',
        render: (v: number) => <span className="font-mono">{formatVnd(v)}</span>,
      },
      {
        title: 'Hạn mức hiện tại',
        dataIndex: 'currentCreditLimit',
        align: 'right',
        render: (v: number) => <span className="font-mono">{formatVnd(v)}</span>,
      },
      {
        title: 'Hạn mức đề xuất',
        dataIndex: 'requestedLimit',
        align: 'right',
        render: (v: number | null) => <span className="font-mono font-semibold">{formatVnd(v)}</span>,
      },
      { title: 'Người gửi', dataIndex: 'requestedByName', render: (v: string | null) => v ?? '—' },
      {
        title: 'Thời gian gửi',
        dataIndex: 'requestDate',
        render: (v: string | null) => <span className="whitespace-nowrap">{formatDateTimeVN(v)}</span>,
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        render: (_: unknown, r) => (
          <span className="flex flex-wrap gap-1">
            <Tag color={CREDIT_STATUS[r.status].color}>{CREDIT_STATUS[r.status].label}</Tag>
            {r.approvalType && <Tag>{APPROVAL_TYPE_LABEL[r.approvalType]}</Tag>}
            {r.approvalType === 'ONE_TIME' && r.isUsed && <Tag color="blue">Đã dùng</Tag>}
          </span>
        ),
      },
      {
        title: '',
        key: 'action',
        width: 90,
        align: 'right',
        render: (_: unknown, r) => (
          <Button
            size="small"
            type={r.status === 'PENDING' ? 'primary' : 'default'}
            onClick={(e) => {
              e.stopPropagation();
              setOpenId(r.requestId);
            }}
          >
            {r.status === 'PENDING' ? 'Xử lý' : 'Xem'}
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <ConfigProvider theme={{ token: { colorPrimary: BRAND } }}>
      <div className="flex-1 h-full min-h-0 flex flex-col bg-transparent overflow-hidden text-[13px] text-[#15171a] font-sans">
        {/* 1. Header */}
        <header className="h-12 bg-white/84 backdrop-blur-[2px] border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <h1 className="text-[20px] font-bold leading-7 tracking-tight whitespace-nowrap">Duyệt yêu cầu</h1>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                placeholder="Theo mã yêu cầu, mã hoặc tên khách hàng"
                className="w-full h-8 pl-8 pr-8 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0071BA] focus:bg-white transition"
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
          <Button icon={<RefreshCw size={14} />} onClick={reload}>
            Làm mới
          </Button>
        </header>

        {/* 2. Tab + bộ lọc trạng thái */}
        <div className="bg-white/70 border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center">
            <span className="inline-flex items-center gap-1.5 h-10 px-2 border-b-2 font-semibold" style={{ borderColor: BRAND, color: BRAND }}>
              <ShieldCheck size={15} />
              Yêu cầu hạn mức
              {result.pendingCount > 0 && (
                <span className="ml-1 min-w-5 h-5 px-1.5 rounded-full text-white text-[11px] inline-flex items-center justify-center" style={{ background: BRAND }}>
                  {result.pendingCount}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1 py-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value || 'ALL'}
                type="button"
                onClick={() => {
                  setStatus(f.value);
                  setPage(1);
                }}
                className={`h-7 px-3 rounded-full text-[12px] font-semibold border cursor-pointer transition ${
                  status === f.value ? 'text-white border-transparent' : 'bg-white border-slate-300 text-[#677484] hover:bg-[#f7f8f9]'
                }`}
                style={status === f.value ? { background: BRAND } : undefined}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Bảng */}
        <div className="flex-1 min-h-0 overflow-auto bg-white/62 px-4 py-3">
          <Table<CreditRequest>
            rowKey="requestId"
            columns={columns}
            dataSource={result.items}
            loading={loading}
            size="middle"
            className="stockflow-credit-requests-table"
            scroll={{ x: 'max-content' }}
            onRow={(r) => ({ onClick: () => setOpenId(r.requestId), className: 'cursor-pointer' })}
            locale={{ emptyText: 'Không có yêu cầu nào phù hợp' }}
            pagination={{
              current: page,
              pageSize,
              total: result.items.length,
              showSizeChanger: true,
              pageSizeOptions: ['15', '30', '50'],
              onChange: (p, s) => {
                setPage(p);
                setPageSize(s);
              },
              showTotal: (total, range) => `${range[0]}-${range[1]} trong ${total} yêu cầu`,
            }}
          />
        </div>

        <CreditRequestDetailModal key={openId ?? 0} requestId={openId} onClose={closeDetail} onChanged={reload} />
      </div>
    </ConfigProvider>
  );
}
